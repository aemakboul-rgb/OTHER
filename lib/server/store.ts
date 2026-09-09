import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { products as seedProducts, type Product } from "@/lib/products";

export type StoredProduct = Product & { stock: Record<string, number> };

export type StoredOrder = {
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
  items: Array<{
    order_id: string;
    product_id: number;
    product_name: string;
    size: string;
    price: number;
    quantity: number;
  }>;
};

type StoreState = {
  products: StoredProduct[];
  orders: StoredOrder[];
};

const storePath = path.join(process.cwd(), "data", "store.json");

async function defaultStore(): Promise<StoreState> {
  return {
    products: seedProducts.map((product) => ({
      ...product,
      stock: { ...product.initialStock },
    })),
    orders: [],
  };
}

async function readStore() {
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as StoreState;
  } catch {
    const store = await defaultStore();
    await writeStore(store);
    return store;
  }
}

async function writeStore(store: StoreState) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function loadCatalogProducts() {
  const store = await readStore();
  return store.products;
}

export async function saveProductStock(productId: number, stock: Record<string, number>) {
  const store = await readStore();
  const product = store.products.find((item) => item.id === productId);
  if (!product) return null;
  product.stock = Object.fromEntries(product.sizes.map((size) => [size, cleanStock(stock[size])]));
  product.initialStock = { ...product.stock };
  await writeStore(store);
  return product;
}

export async function createProduct(product: Omit<Product, "id" | "initialStock">, stock: Record<string, number>) {
  const store = await readStore();
  if (store.products.some((item) => item.sku === product.sku)) throw new Error("This SKU is already used");
  const id = Math.max(0, ...store.products.map((item) => item.id)) + 1;
  const saved: StoredProduct = {
    ...product,
    id,
    stock: Object.fromEntries(product.sizes.map((size) => [size, cleanStock(stock[size])])),
    initialStock: {},
  };
  saved.initialStock = { ...saved.stock };
  store.products.push(saved);
  await writeStore(store);
  return saved;
}

export async function updateProduct(productId: number, product: Omit<Product, "id" | "initialStock">, stock: Record<string, number>) {
  const store = await readStore();
  const index = store.products.findIndex((item) => item.id === productId);
  if (index < 0) return null;
  if (store.products.some((item) => item.id !== productId && item.sku === product.sku)) {
    throw new Error("This SKU is already used");
  }
  const saved: StoredProduct = {
    ...product,
    id: productId,
    stock: Object.fromEntries(product.sizes.map((size) => [size, cleanStock(stock[size])])),
    initialStock: {},
  };
  saved.initialStock = { ...saved.stock };
  store.products[index] = saved;
  await writeStore(store);
  return saved;
}

export async function removeProduct(productId: number) {
  const store = await readStore();
  store.products = store.products.filter((item) => item.id !== productId);
  await writeStore(store);
}

export async function loadOrders() {
  const store = await readStore();
  return store.orders;
}

export async function createOrder(input: {
  customer: { firstName: string; lastName: string; email: string; phone: string; address: string; city: string };
  items: Array<{ productId: number; size: string }>;
}) {
  const store = await readStore();
  const groupedItems = new Map<string, { product: StoredProduct; size: string; quantity: number }>();

  for (const item of input.items) {
    const product = store.products.find((entry) => entry.id === Number(item.productId));
    if (!product || !item.size || !product.sizes.includes(item.size)) throw new Error("Invalid product size");
    const key = `${product.id}:${item.size}`;
    const existing = groupedItems.get(key);
    groupedItems.set(key, { product, size: item.size, quantity: (existing?.quantity ?? 0) + 1 });
  }

  const items = [...groupedItems.values()];
  for (const item of items) {
    const available = item.product.stock[item.size] ?? 0;
    if (available < item.quantity) {
      throw new Error(`Only ${available} left of ${item.product.name} in size ${item.size}`);
    }
  }

  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const orderId = `OL-${date}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal + 35;

  for (const item of items) {
    item.product.stock[item.size] = Math.max(0, (item.product.stock[item.size] ?? 0) - item.quantity);
    item.product.initialStock = { ...item.product.stock };
  }

  const order: StoredOrder = {
    id: orderId,
    customer: `${input.customer.firstName.trim()} ${input.customer.lastName.trim()}`,
    email: input.customer.email.trim(),
    phone: input.customer.phone.trim(),
    address: input.customer.address.trim(),
    city: input.customer.city.trim(),
    total,
    payment_status: "Pending COD",
    status: "New",
    created_at: new Date().toISOString(),
    items: items.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_name: item.product.name,
      size: item.size,
      price: item.product.price,
      quantity: item.quantity,
    })),
  };
  store.orders.unshift(order);
  await writeStore(store);
  return { id: orderId, total };
}

export async function updateOrderStatus(orderId: string, paymentStatus: string, status: string) {
  const store = await readStore();
  const order = store.orders.find((item) => item.id === orderId);
  if (!order) return false;
  order.payment_status = paymentStatus;
  order.status = status;
  await writeStore(store);
  return true;
}

function cleanStock(value: unknown) {
  return Math.max(0, Math.floor(Number(value) || 0));
}
