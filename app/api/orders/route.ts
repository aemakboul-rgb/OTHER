import { getD1 } from "@/db";
import { getStoreAdmin } from "@/lib/server/admin-auth";
import { loadCatalogProducts } from "@/lib/server/catalog";

type OrderRow = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  total: number;
  payment_status: string;
  status: string;
  created_at: string;
};

type ItemRow = {
  order_id: string;
  product_id: number;
  product_name: string;
  size: string;
  price: number;
  quantity: number;
};

export async function GET() {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });
    const db = getD1();
    const [orderResult, itemResult] = await Promise.all([
      db.prepare(
        "SELECT id, customer, email, phone, address, city, total, payment_status, status, created_at FROM orders ORDER BY created_at DESC LIMIT 100",
      ).all<OrderRow>(),
      db.prepare(
        "SELECT order_id, product_id, product_name, size, price, quantity FROM order_items ORDER BY id ASC",
      ).all<ItemRow>(),
    ]);

    return Response.json({
      orders: orderResult.results.map((order) => ({
        ...order,
        items: itemResult.results.filter((item) => item.order_id === order.id),
      })),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      customer?: { firstName?: string; lastName?: string; email?: string; phone?: string; address?: string; city?: string };
      items?: Array<{ productId?: number; size?: string }>;
    };
    const customer = payload.customer;
    const requestedItems = payload.items ?? [];
    if (!customer?.firstName || !customer.lastName || !customer.email || !customer.phone || !customer.address || !customer.city || requestedItems.length === 0) {
      return Response.json({ error: "Customer details and order items are required" }, { status: 400 });
    }

    const catalog = await loadCatalogProducts();
    const groupedItems = new Map<string, { product: Awaited<ReturnType<typeof loadCatalogProducts>>[number]; size: string; quantity: number }>();
    for (const item of requestedItems) {
      const product = catalog.find((entry) => entry.id === Number(item.productId));
      if (!product || !item.size || !product.sizes.includes(item.size)) throw new Error("Invalid product size");
      const key = `${product.id}:${item.size}`;
      const existing = groupedItems.get(key);
      groupedItems.set(key, { product, size: item.size, quantity: (existing?.quantity ?? 0) + 1 });
    }
    const items = [...groupedItems.values()];

    const db = getD1();
    for (const item of items) {
      const key = `${item.product.id}:${item.size}`;
      const row = await db.prepare("SELECT stock FROM inventory WHERE key = ?").bind(key).first<{ stock: number }>();
      if (!row || row.stock < item.quantity) {
        return Response.json({ error: `Only ${row?.stock ?? 0} left of ${item.product.name} in size ${item.size}` }, { status: 409 });
      }
    }

    const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
    const orderId = `OL-${date}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const total = subtotal + 35;
    const statements = [
      db.prepare(
        `INSERT INTO orders (id, customer, email, phone, address, city, total, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending COD', 'New')`,
      ).bind(orderId, `${customer.firstName.trim()} ${customer.lastName.trim()}`, customer.email.trim(), customer.phone.trim(), customer.address.trim(), customer.city.trim(), total),
      ...items.map((item) =>
        db.prepare(
          "INSERT INTO order_items (order_id, product_id, product_name, size, price, quantity) VALUES (?, ?, ?, ?, ?, ?)",
        ).bind(orderId, item.product.id, item.product.name, item.size, item.product.price, item.quantity),
      ),
      ...items.map((item) =>
        db.prepare("UPDATE inventory SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE key = ? AND stock >= ?").bind(item.quantity, `${item.product.id}:${item.size}`, item.quantity),
      ),
    ];
    await db.batch(statements);
    return Response.json({ order: { id: orderId, total } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not create order" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });
    const payload = (await request.json()) as { id?: string; paymentStatus?: string; status?: string };
    if (!payload.id) return Response.json({ error: "Order id is required" }, { status: 400 });
    const paymentStatus = payload.paymentStatus === "COD paid" ? "COD paid" : "Pending COD";
    const status = ["New", "Processing", "Fulfilled"].includes(payload.status ?? "") ? payload.status! : "Processing";
    const db = getD1();
    await db.prepare("UPDATE orders SET payment_status = ?, status = ? WHERE id = ?").bind(paymentStatus, status, payload.id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update order" }, { status: 500 });
  }
}
