import { getD1 } from "@/db";
import { products as seedProducts, type Product } from "@/lib/products";

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  type: string;
  category: string;
  price: number;
  image: string;
  sizes: string;
};

type InventoryRow = { product_id: number; size: string; stock: number };
export type StoredProduct = Product & { stock: Record<string, number> };

export async function ensureCatalogSeeded() {
  const db = getD1();
  const productStatements = seedProducts.map((product) =>
    db.prepare(
      `INSERT OR IGNORE INTO products (id, sku, name, type, category, price, image, sizes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(product.id, product.sku, product.name, product.type, product.category, product.price, product.image, JSON.stringify(product.sizes)),
  );
  const inventoryStatements = seedProducts.flatMap((product) =>
    product.sizes.map((size) =>
      db.prepare(
        "INSERT OR IGNORE INTO inventory (key, product_id, size, stock) VALUES (?, ?, ?, ?)",
      ).bind(`${product.id}:${size}`, product.id, size, product.initialStock[size] ?? 0),
    ),
  );
  await db.batch([...productStatements, ...inventoryStatements]);
  return db;
}

export async function loadCatalogProducts(): Promise<StoredProduct[]> {
  const db = await ensureCatalogSeeded();
  const [productResult, inventoryResult] = await Promise.all([
    db.prepare(
      "SELECT id, sku, name, type, category, price, image, sizes FROM products WHERE active = 1 ORDER BY id ASC",
    ).all<ProductRow>(),
    db.prepare(
      "SELECT product_id, size, stock FROM inventory ORDER BY product_id, size",
    ).all<InventoryRow>(),
  ]);

  const stockByProduct = new Map<number, Record<string, number>>();
  for (const row of inventoryResult.results) {
    const stock = stockByProduct.get(row.product_id) ?? {};
    stock[row.size] = row.stock;
    stockByProduct.set(row.product_id, stock);
  }

  return productResult.results.map((row) => {
    const sizes = parseSizes(row.sizes);
    const stock = stockByProduct.get(row.id) ?? Object.fromEntries(sizes.map((size) => [size, 0]));
    return { ...row, sizes, stock, initialStock: { ...stock } };
  });
}

function parseSizes(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return value.split(",").map((size) => size.trim()).filter(Boolean);
  }
}
