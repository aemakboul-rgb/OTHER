"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedBrandLogo from "@/components/animated-brand-logo";
import { formatMAD, products as fallbackCatalog, type Product } from "@/lib/products";

type AdminProduct = Product & { stock: Record<string, number> };
type AdminOrder = {
  id: string; customer: string; email: string; phone: string; address: string; city: string;
  total: number; payment_status: string; status: string; created_at: string;
  items: Array<{ product_name: string; size: string; quantity: number }>;
};
type AdminTab = "overview" | "orders" | "products" | "media";
type ProductDraft = { name: string; sku: string; type: string; category: string; price: string; image: string; sizes: string; stock: string };

const emptyProduct: ProductDraft = { name: "", sku: "", type: "Heavyweight cotton", category: "T-Shirts", price: "329", image: "", sizes: "S, M, L, XL", stock: "5" };

export default function DashboardClient({ displayName, signOutHref }: { displayName: string; signOutHref: string }) {
  const [products, setProducts] = useState<AdminProduct[]>(fallbackCatalog.map((product) => ({ ...product, stock: { ...product.initialStock } })));
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("products");
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProduct);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [heroVideoUrl, setHeroVideoUrl] = useState("/video/otherlife-hero-2026.mp4");
  const [heroVideoName, setHeroVideoName] = useState("Current campaign video");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [storyImageUrl, setStoryImageUrl] = useState("/images/products/otherlife-night-coach-jacket.webp");
  const [storyImageName, setStoryImageName] = useState("Current story image");
  const [uploadingStory, setUploadingStory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productResponse, orderResponse, heroResponse, storyResponse] = await Promise.all([fetch("/api/products"), fetch("/api/orders"), fetch("/api/hero", { cache: "no-store" }), fetch("/api/story", { cache: "no-store" })]);
      const [productData, orderData, heroData, storyData] = await Promise.all([productResponse.json(), orderResponse.json(), heroResponse.json(), storyResponse.json()]);
      if (!productResponse.ok) throw new Error(productData.error || "Could not load products");
      if (!orderResponse.ok) throw new Error(orderData.error || "Could not load orders");
      if (!heroResponse.ok) throw new Error(heroData.error || "Could not load hero video");
      if (!storyResponse.ok) throw new Error(storyData.error || "Could not load story image");
      if (Array.isArray(productData.products)) setProducts(productData.products);
      if (Array.isArray(orderData.orders)) setOrders(orderData.orders);
      if (typeof heroData.videoUrl === "string") setHeroVideoUrl(heroData.videoUrl);
      if (typeof heroData.fileName === "string") setHeroVideoName(heroData.fileName);
      if (typeof storyData.imageUrl === "string") setStoryImageUrl(storyData.imageUrl);
      if (typeof storyData.fileName === "string") setStoryImageName(storyData.fileName);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not sync the store.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((order) => order.created_at.startsWith(today));
  const revenueToday = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const pendingCod = orders.filter((order) => order.payment_status === "Pending COD").reduce((sum, order) => sum + order.total, 0);
  const lowStock = products.reduce((count, product) => count + product.sizes.filter((size) => (product.stock[size] ?? 0) <= 3).length, 0);
  const newestPending = orders.find((order) => order.payment_status === "Pending COD");
  const totalUnits = useMemo(() => products.reduce((total, product) => total + product.sizes.reduce((sum, size) => sum + (product.stock[size] ?? 0), 0), 0), [products]);
  const tabCopy: Record<AdminTab, { title: string; description: string }> = {
    overview: { title: "Overview", description: "Your store at a glance." },
    orders: { title: "Orders", description: "COD orders and fulfillment." },
    products: { title: "Products", description: "Create products, edit details and manage every size." },
    media: { title: "Media", description: "Replace the homepage video and story image instantly." },
  };

  const setStock = (productId: number, size: string, stock: number) => setProducts((current) => current.map((product) => product.id === productId ? { ...product, stock: { ...product.stock, [size]: Math.max(0, stock) } } : product));

  const saveStock = async (product: AdminProduct) => {
    setSavingProduct(product.id); setNotice("");
    try {
      const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, stock: product.stock }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Stock update failed");
      setNotice(`${product.name} stock saved.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save stock."); }
    finally { setSavingProduct(null); }
  };

  const updateOrder = async (orderId: string, paymentStatus: string, status: string) => {
    setSavingOrder(orderId); setNotice("");
    try {
      const response = await fetch("/api/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: orderId, paymentStatus, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order update failed");
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, payment_status: paymentStatus, status } : order));
      setNotice(`${orderId} updated.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update order."); }
    finally { setSavingOrder(null); }
  };

  const openNewProduct = () => { setEditingProductId(null); setProductDraft(emptyProduct); setSelectedImageName(""); setProductEditorOpen(true); };
  const openEditProduct = (product: AdminProduct) => {
    setEditingProductId(product.id);
    setProductDraft({ name: product.name, sku: product.sku, type: product.type, category: product.category, price: String(product.price), image: product.image, sizes: product.sizes.join(", "), stock: "5" });
    setSelectedImageName("Current product image"); setProductEditorOpen(true);
  };

  const removeProduct = async (product: AdminProduct) => {
    if (!window.confirm(`Remove ${product.name} from the live store?`)) return;
    setSavingProduct(product.id); setNotice("");
    try {
      const response = await fetch("/api/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove product");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice(`${product.name} removed from the live store.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not remove product."); }
    finally { setSavingProduct(null); }
  };

  const chooseProductImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { setNotice("Choose a JPG, PNG, WebP or AVIF image under 8 MB."); return; }
    setUploadingImage(true); setNotice("");
    try {
      const formData = new FormData(); formData.append("image", file);
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed");
      setProductDraft((current) => ({ ...current, image: data.url! })); setSelectedImageName(file.name); setNotice("Image uploaded.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not upload image."); }
    finally { setUploadingImage(false); }
  };

  const chooseHeroVideo = async (file?: File) => {
    if (!file) return;
    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setNotice("Choose an MP4 or WebM video.");
      return;
    }

    setUploadingHero(true); setNotice("");
    try {
      const formData = new FormData(); formData.append("video", file);
      const response = await fetch("/api/hero", { method: "POST", body: formData });
      const data = (await response.json()) as { videoUrl?: string; fileName?: string; error?: string };
      if (!response.ok || !data.videoUrl) throw new Error(data.error || "Video upload failed");
      setHeroVideoUrl(data.videoUrl);
      setHeroVideoName(data.fileName || file.name);
      setNotice("Hero video published on the live storefront.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload hero video.");
    } finally {
      setUploadingHero(false);
    }
  };

  const chooseStoryImage = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setNotice("Choose a JPG, PNG, WebP or AVIF image.");
      return;
    }

    setUploadingStory(true); setNotice("");
    try {
      const formData = new FormData(); formData.append("image", file);
      const response = await fetch("/api/story", { method: "POST", body: formData });
      const data = (await response.json()) as { imageUrl?: string; fileName?: string; error?: string };
      if (!response.ok || !data.imageUrl) throw new Error(data.error || "Image upload failed");
      setStoryImageUrl(data.imageUrl);
      setStoryImageName(data.fileName || file.name);
      setNotice("Story image published on the live storefront.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not upload story image.");
    } finally {
      setUploadingStory(false);
    }
  };

  const saveProductDraft = async () => {
    const sizes = [...new Set(productDraft.sizes.split(",").map((size) => size.trim().toUpperCase()).filter(Boolean))];
    if (!productDraft.name.trim() || !productDraft.sku.trim() || !productDraft.image.trim() || sizes.length === 0) { setNotice("Title, SKU, image and at least one size are required."); return; }
    const existing = products.find((product) => product.id === editingProductId);
    const defaultStock = Math.max(0, Math.floor(Number(productDraft.stock) || 0));
    const stock = Object.fromEntries(sizes.map((size) => [size, existing?.stock[size] ?? defaultStock]));
    const payload = { productId: editingProductId ?? undefined, name: productDraft.name.trim(), sku: productDraft.sku.trim(), type: productDraft.type.trim(), category: productDraft.category, price: Math.max(0, Number(productDraft.price) || 0), image: productDraft.image.trim(), sizes, stock };
    setSavingDraft(true); setNotice("");
    try {
      const response = await fetch("/api/products", { method: editingProductId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = (await response.json()) as { product?: AdminProduct; error?: string };
      if (!response.ok || !data.product) throw new Error(data.error || "Could not save product");
      setProducts((current) => editingProductId ? current.map((product) => product.id === editingProductId ? data.product! : product) : [...current, data.product!]);
      setProductEditorOpen(false); setNotice(editingProductId ? "Product updated on the live store." : "Product created on the live store.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save product."); }
    finally { setSavingDraft(false); }
  };

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <Link className="admin-logo" href="/" aria-label="OTHERLIFE storefront"><AnimatedBrandLogo /></Link>
        <nav>
          <button className={activeTab === "overview" ? "active" : ""} type="button" onClick={() => setActiveTab("overview")}>Overview</button>
          <button className={activeTab === "orders" ? "active" : ""} type="button" onClick={() => setActiveTab("orders")}>Orders <span>{orders.length}</span></button>
          <button className={activeTab === "products" ? "active" : ""} type="button" onClick={() => setActiveTab("products")}>Products <span>{products.length}</span></button>
          <button className={activeTab === "media" ? "active" : ""} type="button" onClick={() => setActiveTab("media")}>Media</button>
        </nav>
        <div className="admin-sidebar-bottom"><Link href="/">← Open storefront</Link><span>OTHERLIFE · Morocco</span></div>
      </aside>

      <section className="admin-content" id="overview">
        <header className="admin-topbar">
          <div><span className="eyebrow">Live store control</span><h1>{tabCopy[activeTab].title}</h1><p>{tabCopy[activeTab].description}</p></div>
          <div className="admin-user"><span>IM</span><div><strong>{displayName}</strong><small>{loading ? "Syncing…" : "Store synced"} · <a href={signOutHref}>Sign out</a></small></div></div>
        </header>
        <nav className="admin-tabbar" aria-label="Admin sections">
          <button className={activeTab === "products" ? "active" : ""} type="button" onClick={() => setActiveTab("products")}><span>Products</span><b>{products.length}</b></button>
          <button className={activeTab === "orders" ? "active" : ""} type="button" onClick={() => setActiveTab("orders")}><span>Orders</span><b>{orders.length}</b></button>
          <button className={activeTab === "overview" ? "active" : ""} type="button" onClick={() => setActiveTab("overview")}><span>Overview</span></button>
          <button className={activeTab === "media" ? "active" : ""} type="button" onClick={() => setActiveTab("media")}><span>Media</span></button>
        </nav>
        {notice && <div className="admin-notice" role="status">{notice}</div>}

        {activeTab === "overview" && <><div className="metric-grid">
          <article><span>Orders today</span><strong>{todayOrders.length}</strong><small>Live COD orders</small></article>
          <article><span>Revenue today</span><strong>{formatMAD(revenueToday)}</strong><small>Including delivery</small></article>
          <article><span>Pending COD</span><strong>{formatMAD(pendingCod)}</strong><small>Cash to collect</small></article>
          <article><span>Low stock sizes</span><strong>{lowStock}</strong><small>3 units or fewer</small></article>
        </div>
        <section className="admin-split">
          <article className="admin-panel"><div className="admin-panel-heading"><div><h2>COD workflow</h2><p>Collect cash, then confirm payment.</p></div></div><div className="cod-admin-card">
            {newestPending ? <><div><span>{newestPending.id}</span><strong>{formatMAD(newestPending.total)}</strong></div><p>{newestPending.customer} · {newestPending.city} · Payment pending</p><button type="button" disabled={savingOrder === newestPending.id} onClick={() => void updateOrder(newestPending.id, "COD paid", "Processing")}>{savingOrder === newestPending.id ? "Saving…" : "Mark COD as paid"}</button></> : <p>No pending COD orders.</p>}
          </div></article>
          <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Catalog health</h2><p>Storefront products</p></div></div><div className="catalog-health"><strong>{products.length}</strong><span>Active products</span><strong>{totalUnits}</strong><span>Units available</span></div></article>
        </section></>}

        {activeTab === "orders" && <section className="admin-panel" id="orders">
          <div className="admin-panel-heading"><div><h2>Live orders</h2><p>Every checkout appears here with customer and size details.</p></div><button type="button" onClick={() => void loadData()}>Refresh</button></div>
          <div className="orders-table">
            <div className="orders-row orders-head"><span>Order</span><span>Customer</span><span>Items & sizes</span><span>Delivery</span><span>Total</span><span>Payment</span><span>Status</span></div>
            {orders.length === 0 && !loading ? <div className="admin-empty">No orders yet. The next confirmed checkout will appear here.</div> : orders.map((order) => <div className="orders-row" key={order.id}>
              <strong data-label="Order">{order.id}</strong>
              <span data-label="Customer">{order.customer}<small>{order.phone}<br />{order.email}</small></span>
              <span data-label="Items">{order.items.map((item) => `${item.product_name} · ${item.size} × ${item.quantity}`).join(" / ")}</span>
              <span data-label="Delivery">{order.city}<small>{order.address}</small></span>
              <strong data-label="Total">{formatMAD(order.total)}</strong>
              <label data-label="Payment"><select className="order-control" value={order.payment_status} disabled={savingOrder === order.id} onChange={(event) => void updateOrder(order.id, event.target.value, order.status)}><option>Pending COD</option><option>COD paid</option></select></label>
              <label data-label="Status"><select className="order-control" value={order.status} disabled={savingOrder === order.id} onChange={(event) => void updateOrder(order.id, order.payment_status, event.target.value)}><option>New</option><option>Processing</option><option>Fulfilled</option></select></label>
            </div>)}
          </div>
        </section>}

        {activeTab === "media" && <section className="admin-panel hero-video-admin" id="media">
          <div className="admin-panel-heading"><div><h2>Storefront hero video</h2><p>Upload a new campaign video. It publishes immediately on the homepage.</p></div><span className="live-badge">Live media</span></div>
          <div className="hero-video-editor">
            <div className="hero-video-preview"><video key={heroVideoUrl} src={heroVideoUrl} autoPlay muted loop playsInline controls preload="metadata" /></div>
            <div className="hero-video-controls">
              <span className="eyebrow">Current video</span>
              <strong>{heroVideoName}</strong>
              <p>For the cleanest desktop result, use MP4 in 16:9.</p>
              <label className="hero-video-upload"><input type="file" accept="video/mp4,video/webm" disabled={uploadingHero} onChange={(event) => void chooseHeroVideo(event.target.files?.[0])} /><strong>{uploadingHero ? "Uploading & publishing…" : "Choose new video"}</strong><small>The new video goes live as soon as the upload finishes.</small></label>
              <Link className="hero-store-link" href="/" target="_blank">Open live storefront →</Link>
            </div>
          </div>
          <div className="hero-video-editor story-media-editor">
            <div className="hero-video-preview story-image-preview"><Image key={storyImageUrl} src={storyImageUrl} alt="Current story image" fill sizes="(max-width: 760px) 100vw, 55vw" unoptimized /></div>
            <div className="hero-video-controls">
              <span className="eyebrow">Story image</span>
              <strong>{storyImageName}</strong>
              <p>Replace the image shown below the product collection on the homepage.</p>
              <label className="hero-video-upload"><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" disabled={uploadingStory} onChange={(event) => void chooseStoryImage(event.target.files?.[0])} /><strong>{uploadingStory ? "Uploading & publishing…" : "Choose new image"}</strong><small>The new image goes live as soon as the upload finishes.</small></label>
            </div>
          </div>
        </section>}

        {activeTab === "products" && <section className="admin-panel products-admin" id="products">
          <div className="admin-panel-heading"><div><h2>Products & inventory</h2><p>Add products, edit content and set stock for every size.</p></div><div className="admin-heading-actions"><span className="live-badge">Live catalog</span><button type="button" onClick={openNewProduct}>+ Add product</button></div></div>
          <div className="admin-product-list">{products.map((product) => {
            const productStock = product.sizes.reduce((sum, size) => sum + (product.stock[size] ?? 0), 0);
            return <article className="admin-product-row" key={product.id}>
              <Image src={product.image} alt={product.name} width={74} height={88} unoptimized />
              <div className="admin-product-meta"><strong>{product.name}</strong><span>{product.sku} · {product.category}</span><b>{formatMAD(product.price)}</b></div>
              <div className="variant-stock">{product.sizes.map((size) => <label key={size}><span>{size}</span><input type="number" min="0" value={product.stock[size] ?? 0} onChange={(event) => setStock(product.id, size, Number(event.target.value))} /></label>)}</div>
              <div className="stock-total"><strong>{productStock}</strong><span>units</span></div>
              <div className="product-row-actions"><button type="button" onClick={() => openEditProduct(product)}>Edit</button><button className="save-stock" type="button" disabled={savingProduct === product.id} onClick={() => void saveStock(product)}>{savingProduct === product.id ? "Saving…" : "Save stock"}</button><button className="remove-product" type="button" disabled={savingProduct === product.id} onClick={() => void removeProduct(product)}>Remove</button></div>
            </article>;
          })}</div>
        </section>}
      </section>

      {productEditorOpen && <div className="product-editor-layer">
        <button className="product-editor-backdrop" type="button" aria-label="Close product editor" onClick={() => setProductEditorOpen(false)} />
        <form className="product-editor" onSubmit={(event) => { event.preventDefault(); void saveProductDraft(); }}>
          <div className="product-editor-heading"><div><span className="eyebrow">Catalog editor</span><h2>{editingProductId ? "Edit product" : "Add product"}</h2></div><button type="button" onClick={() => setProductEditorOpen(false)}>Close</button></div>
          <div className="product-editor-grid">
            <label className="wide">Product title<input value={productDraft.name} onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Orbit Oversized Tee" required /></label>
            <label>SKU<input value={productDraft.sku} onChange={(event) => setProductDraft((current) => ({ ...current, sku: event.target.value }))} placeholder="OL-TEE-003" required /></label>
            <label>Price (MAD)<input type="number" min="0" value={productDraft.price} onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))} required /></label>
            <label>Category<select value={productDraft.category} onChange={(event) => setProductDraft((current) => ({ ...current, category: event.target.value }))}>{["T-Shirts", "Hoodies", "Sweatshirts", "Bottoms", "Outerwear", "Accessories"].map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Description<input value={productDraft.type} onChange={(event) => setProductDraft((current) => ({ ...current, type: event.target.value }))} placeholder="Heavyweight cotton" /></label>
            <div className="wide product-image-field"><span>Product image</span><label className="product-image-upload"><input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(event) => void chooseProductImage(event.target.files?.[0])} /><strong>{uploadingImage ? "Uploading…" : "Choose image"}</strong><small>JPG, PNG, WebP or AVIF · max 8 MB</small></label>{productDraft.image && <div className="product-image-preview"><Image src={productDraft.image} alt="Selected product preview" width={58} height={68} unoptimized /><div><strong>{selectedImageName || "Product image"}</strong><span>Ready to use</span></div></div>}</div>
            <label>Sizes<input value={productDraft.sizes} onChange={(event) => setProductDraft((current) => ({ ...current, sizes: event.target.value }))} placeholder="S, M, L, XL" required /></label>
            <label>Starting stock / new size<input type="number" min="0" value={productDraft.stock} onChange={(event) => setProductDraft((current) => ({ ...current, stock: event.target.value }))} /></label>
          </div>
          <div className="product-editor-footer"><p>Changes publish to the live catalog and stay saved.</p><button type="submit" disabled={uploadingImage || savingDraft}>{savingDraft ? "Saving…" : editingProductId ? "Update product" : "Create product"}</button></div>
        </form>
      </div>}
    </main>
  );
}
