import { getStoreAdmin } from "@/lib/server/admin-auth";
import {
  createProduct,
  loadCatalogProducts,
  removeProduct,
  saveProductStock,
  updateProduct,
} from "@/lib/server/store";

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
  return Response.json({ products: await loadCatalogProducts() });
}

export async function POST(request: Request) {
  try {
    if (!(await getStoreAdmin())) return Response.json({ error: "Admin sign-in required" }, { status: 403 });
    const payload = (await request.json()) as ProductPayload;

    if (payload.productId && payload.stock && !payload.name) {
      const saved = await saveProductStock(Number(payload.productId), payload.stock);
      if (!saved) return Response.json({ error: "Product not found" }, { status: 404 });
      return Response.json({ ok: true });
    }

    const product = validateProduct(payload);
    const saved = await createProduct(product, payload.stock ?? {});
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
    const saved = await updateProduct(id, product, payload.stock ?? {});
    if (!saved) return Response.json({ error: "Product not found" }, { status: 404 });
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
    await removeProduct(id);
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
  return {
    name,
    sku,
    type: payload.type?.trim() || "Premium streetwear",
    category: payload.category.trim(),
    price,
    image: payload.image.trim(),
    sizes,
  };
}

function productError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const duplicate = message.includes("SKU");
  return Response.json({ error: message }, { status: duplicate ? 409 : 400 });
}
