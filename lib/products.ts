export type Product = {
  id: number;
  sku: string;
  name: string;
  type: string;
  category: string;
  price: number;
  image: string;
  sizes: string[];
  initialStock: Record<string, number>;
};

const apparelSizes = ["S", "M", "L", "XL"];

export const products: Product[] = [
  { id: 1, sku: "OL-TEE-001-BLK", name: "Orbit Oversized Tee — Black", type: "Heavyweight cotton", category: "T-Shirts", price: 329, image: "/images/products/otherlife-orbit-tee-black.webp", sizes: apparelSizes, initialStock: { S: 8, M: 12, L: 10, XL: 5 } },
  { id: 2, sku: "OL-TEE-001-BNE", name: "Orbit Oversized Tee — Bone", type: "Heavyweight cotton", category: "T-Shirts", price: 329, image: "/images/products/otherlife-orbit-tee-bone.webp", sizes: apparelSizes, initialStock: { S: 6, M: 9, L: 8, XL: 4 } },
  { id: 3, sku: "OL-TEE-002-WSH", name: "Afterglow Washed Back Tee", type: "Garment dyed cotton", category: "T-Shirts", price: 369, image: "/images/products/otherlife-washed-back-tee.webp", sizes: apparelSizes, initialStock: { S: 5, M: 8, L: 7, XL: 3 } },
  { id: 4, sku: "OL-HOD-001-BLK", name: "Core Orbit Hoodie — Black", type: "Heavyweight fleece", category: "Hoodies", price: 599, image: "/images/products/otherlife-core-hoodie-black.webp", sizes: apparelSizes, initialStock: { S: 5, M: 9, L: 8, XL: 4 } },
  { id: 5, sku: "OL-HOD-001-ASH", name: "Core Orbit Hoodie — Ash", type: "Heavyweight fleece", category: "Hoodies", price: 599, image: "/images/products/otherlife-core-hoodie-ash.webp", sizes: apparelSizes, initialStock: { S: 4, M: 7, L: 6, XL: 3 } },
  { id: 6, sku: "OL-HOD-002-ZIP", name: "Signal Zip Hoodie", type: "Boxy full-zip fit", category: "Hoodies", price: 649, image: "/images/products/otherlife-signal-zip-hoodie.webp", sizes: apparelSizes, initialStock: { S: 3, M: 6, L: 5, XL: 2 } },
  { id: 7, sku: "OL-SWT-001-STL", name: "Stealth Orbit Crewneck", type: "Loopback cotton", category: "Sweatshirts", price: 499, image: "/images/products/otherlife-stealth-crewneck.webp", sizes: apparelSizes, initialStock: { S: 4, M: 7, L: 5, XL: 3 } },
  { id: 8, sku: "OL-CRG-001-BLK", name: "Utility Cargo Pant", type: "Technical twill", category: "Bottoms", price: 649, image: "/images/products/otherlife-utility-cargo-black.webp", sizes: ["30", "32", "34", "36"], initialStock: { "30": 4, "32": 7, "34": 6, "36": 3 } },
  { id: 9, sku: "OL-JKT-001-NGT", name: "Night Transit Coach Jacket", type: "Matte technical shell", category: "Outerwear", price: 749, image: "/images/products/otherlife-night-coach-jacket.webp", sizes: apparelSizes, initialStock: { S: 3, M: 5, L: 4, XL: 2 } },
  { id: 10, sku: "OL-CAP-001-BLK", name: "Orbit Six-Panel Cap", type: "Embroidered cotton twill", category: "Accessories", price: 249, image: "/images/products/otherlife-orbit-cap-black.webp", sizes: ["One Size"], initialStock: { "One Size": 14 } },
];

export const categories = ["All", "T-Shirts", "Hoodies", "Sweatshirts", "Bottoms", "Outerwear", "Accessories"];
export const formatMAD = (amount: number) => `${amount.toLocaleString("en-US")} MAD`;
