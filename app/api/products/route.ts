import { getD1 } from "@/db";
import { loadCatalogProducts } from "@/lib/server/catalog";
import { getStoreAdmin } from "@/lib/server/admin-auth";

type ProductPayload = {
  productId?: number;
  name?: string;
  sku?: string;
  type?: string;
  category?: string;
  price?: number;
  image?: string;
  sizes?: string[];
  stock?: Record<string, number>;
};

export async function GET() {
  try {
    return Response.json({ products: await loadCatalogProducts() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });
    const payload = (await request.json()) as ProductPayload;
    const db = getD1();

    if (payload.productId && payload.stock && !payload.name) {
      const product = (await loadCatalogProducts()).find((item) => item.id === Number(payload.productId));
      if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
      await db.batch(product.sizes.map((size) => {
        const stock = cleanStock(payload.stock?.[size]);
        return db.prepare(
          `INSERT INTO inventory (key, product_id, size, stock, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET stock = excluded.stock, updated_at = CURRENT_TIMESTAMP`,
        ).bind(`${product.id}:${size}`, product.id, size, stock);
      }));
      return Response.json({ ok: true });
    }

    const product = validateProduct(payload);
    const next = await db.prepare("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM products").first<{ id: number }>();
    const id = Number(next?.id ?? 1);
    await db.batch([
      db.prepare(
        `INSERT INTO products (id, sku, name, type, category, price, image, sizes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, product.sku, product.name, product.type, product.category, product.price, product.image, JSON.stringify(product.sizes)),
      ...product.sizes.map((size) =>
        db.prepare(
          "INSERT INTO inventory (key, product_id, size, stock) VALUES (?, ?, ?, ?)",
        ).bind(`${id}:${size}`, id, size, cleanStock(payload.stock?.[size])),
      ),
    ]);
    const saved = (await loadCatalogProducts()).find((item) => item.id === id);
    return Response.json({ product: saved }, { status: 201 });
  } catch (error) {
    return productError(error, "Could not save product");
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });
    const payload = (await request.json()) as ProductPayload;
    const id = Number(payload.productId);
    if (!id) return Response.json({ error: "Product id is required" }, { status: 400 });
    const product = validateProduct(payload);
    const existing = (await loadCatalogProducts()).find((item) => item.id === id);
    if (!existing) return Response.json({ error: "Product not found" }, { status: 404 });
    const db = getD1();
    await db.batch([
      db.prepare(
        `UPDATE products SET sku = ?, name = ?, type = ?, category = ?, price = ?, image = ?, sizes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      ).bind(product.sku, product.name, product.type, product.category, product.price, product.image, JSON.stringify(product.sizes), id),
      db.prepare("DELETE FROM inventory WHERE product_id = ?").bind(id),
      ...product.sizes.map((size) =>
        db.prepare(
          "INSERT INTO inventory (key, product_id, size, stock) VALUES (?, ?, ?, ?)",
        ).bind(`${id}:${size}`, id, size, cleanStock(payload.stock?.[size] ?? existing.stock[size])),
      ),
    ]);
    const saved = (await loadCatalogProducts()).find((item) => item.id === id);
    return Response.json({ product: saved });
  } catch (error) {
    return productError(error, "Could not update product");
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });
    const payload = (await request.json()) as ProductPayload;
    const id = Number(payload.productId);
    if (!id) return Response.json({ error: "Product id is required" }, { status: 400 });
    const db = getD1();
    await db.prepare("UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return productError(error, "Could not remove product");
  }
}

function validateProduct(payload: ProductPayload) {
  const sizes = [...new Set((payload.sizes ?? []).map((size) => size.trim().toUpperCase()).filter(Boolean))];
  const name = payload.name?.trim() ?? "";
  const sku = payload.sku?.trim().toUpperCase() ?? "";
  const price = Math.max(0, Math.round(Number(payload.price) || 0));
  if (!name || !sku || !payload.category?.trim() || !payload.image?.trim() || sizes.length === 0) {
    throw new Error("Name, SKU, category, image and at least one size are required");
  }
  return { name, sku, type: payload.type?.trim() || "Premium streetwear", category: payload.category.trim(), price, image: payload.image.trim(), sizes };
}

function cleanStock(value: unknown) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function productError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const duplicate = message.includes("UNIQUE");
  return Response.json({ error: duplicate ? "This SKU is already used" : message }, { status: duplicate ? 409 : 400 });
}
