import { getStoreAdmin } from "@/lib/server/admin-auth";
import { createOrder, loadOrders, updateOrderStatus } from "@/lib/server/store";

export async function GET() {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });
    return Response.json({ orders: await loadOrders() });
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

    const order = await createOrder({
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
      },
      items: requestedItems.map((item) => ({
        productId: Number(item.productId),
        size: String(item.size ?? ""),
      })),
    });

    return Response.json({ order }, { status: 201 });
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
    await updateOrderStatus(payload.id, paymentStatus, status);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not update order" }, { status: 500 });
  }
}
