"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import AnimatedBrandLogo from "@/components/animated-brand-logo";
import { categories, formatMAD, products as fallbackProducts, type Product } from "@/lib/products";

type CartItem = { productId: number; size: string };
type Inventory = Record<number, Record<string, number>>;

const defaultInventory: Inventory = Object.fromEntries(fallbackProducts.map((product) => [product.id, product.initialStock]));
const defaultHeroVideo = "/video/otherlife-hero-2026.mp4";
const whatsappNumber = "212777069946";

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a9.7 9.7 0 0 0-8.4 14.55L2 22l5.6-1.47A9.8 9.8 0 1 0 12 2Zm0 17.72a7.7 7.7 0 0 1-3.93-1.08l-.28-.17-3.32.87.89-3.23-.18-.29A7.73 7.73 0 1 1 12 19.72Zm4.24-5.77c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.52.12-.16.23-.6.75-.74.9-.14.16-.27.18-.5.06-.24-.12-.99-.36-1.88-1.16a7.03 7.03 0 0 1-1.3-1.62c-.13-.23-.01-.36.1-.47.1-.1.23-.27.35-.4.11-.14.15-.24.23-.4.08-.15.04-.29-.02-.4-.06-.12-.52-1.26-.72-1.73-.19-.45-.38-.39-.52-.4h-.45c-.16 0-.41.06-.63.3-.21.23-.82.8-.82 1.96 0 1.15.84 2.27.96 2.42.12.16 1.65 2.52 4 3.54.56.24 1 .38 1.34.49.56.18 1.07.15 1.47.09.45-.07 1.38-.57 1.58-1.12.19-.54.19-1.01.13-1.1-.05-.1-.21-.16-.45-.27Z" /></svg>;
}

function whatsappHref(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function SunIcon() {
  return <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.75" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></svg>;
}

function MoonIcon() {
  return <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" /></svg>;
}

function BasketIcon({ className = "basket-icon" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9h16l-1.4 10H5.4L4 9Z" /><path d="m8 9 4-5 4 5M9 12v4M15 12v4" /></svg>;
}

function StoreHeader({ cartCount, onHome, onBag, isLight, onTheme }: { cartCount: number; onHome: () => void; onBag: () => void; isLight: boolean; onTheme: () => void }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-left">
          <button className="theme-toggle" type="button" onClick={onTheme} aria-label={`Switch to ${isLight ? "black" : "light"} mode`} aria-pressed={isLight}>
            {isLight ? <SunIcon /> : <MoonIcon />}
          </button>
          <nav className="desktop-nav" aria-label="Main navigation">
            <button type="button" onClick={onHome}>Shop</button>
          </nav>
        </div>
        <button className="header-logo logo-button" type="button" onClick={onHome} aria-label="OTHERLIFE home">
          <AnimatedBrandLogo />
        </button>
        <div className="header-actions">
          <button className="bag-button" type="button" onClick={onBag} aria-label={`Shopping bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
            <BasketIcon /><span className="bag-count">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileDock({ cartCount, onHome, onBag, onCheckout }: { cartCount: number; onHome: () => void; onBag: () => void; onCheckout: () => void }) {
  return (
    <nav className="mobile-dock" aria-label="Mobile navigation">
      <button type="button" onClick={onHome}><span>⌂</span>Shop</button>
      <button className="dock-bag" type="button" onClick={onBag} aria-label={`Shopping bag, ${cartCount} item${cartCount === 1 ? "" : "s"}`}><BasketIcon className="dock-basket-icon" /><b>{cartCount}</b></button>
      <button type="button" onClick={onCheckout} disabled={cartCount === 0}><span>→</span>Checkout</button>
    </nav>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState<"shop" | "checkout" | "confirmed">("shop");
  const [isLight, setIsLight] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(fallbackProducts);
  const [inventory, setInventory] = useState<Inventory>(defaultInventory);
  const [sizeProductId, setSizeProductId] = useState<number | null>(null);
  const [modalSize, setModalSize] = useState("");
  const [confirmedOrderId, setConfirmedOrderId] = useState("");
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [orderError, setOrderError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [heroVideoUrl, setHeroVideoUrl] = useState(defaultHeroVideo);

  useEffect(() => {
    fetch("/api/products")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.products)) {
          setCatalogProducts(data.products);
          setInventory(Object.fromEntries(data.products.map((product: { id: number; stock: Record<string, number> }) => [product.id, product.stock])));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/hero", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.videoUrl === "string" && data.videoUrl) setHeroVideoUrl(data.videoUrl);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (view !== "shop") return;

    let scrollLocked = false;
    let unlockTimer: number | undefined;
    const handleFirstDesktopScroll = (event: WheelEvent) => {
      if (
        window.innerWidth <= 760 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.scrollY > 40 ||
        event.deltaY <= 4 ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        scrollLocked
      ) return;

      const ticker = document.querySelector<HTMLElement>(".desktop-drop-ticker");
      if (!ticker) return;
      scrollLocked = true;
      window.scrollTo({ top: Math.max(0, ticker.offsetTop - 72), behavior: "smooth" });
      unlockTimer = window.setTimeout(() => { scrollLocked = false; }, 900);
    };

    window.addEventListener("wheel", handleFirstDesktopScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleFirstDesktopScroll);
      if (unlockTimer) window.clearTimeout(unlockTimer);
    };
  }, [view]);

  const toggleTheme = () => {
    const nextTheme = !isLight;
    setIsLight(nextTheme);
    document.documentElement.dataset.theme = nextTheme ? "light" : "dark";
  };

  const visibleProducts = activeCategory === "All"
    ? catalogProducts
    : catalogProducts.filter((product) => product.category === activeCategory);
  const cartProducts = useMemo(
    () => cart.flatMap((item) => {
      const product = catalogProducts.find((entry) => entry.id === item.productId);
      return product ? [{ ...product, size: item.size }] : [];
    }),
    [cart, catalogProducts],
  );
  const cartTotal = cartProducts.reduce((total, product) => total + product.price, 0);

  const addToCart = (productId: number, size: string) => {
    setCart((current) => [...current, { productId, size }]);
    setCartOpen(true);
  };

  const openSizeChooser = (productId: number) => {
    const product = catalogProducts.find((item) => item.id === productId);
    if (!product) return;
    const firstAvailable = product.sizes.find((size) => (inventory[product.id]?.[size] ?? product.initialStock[size] ?? 0) > 0);
    setModalSize(firstAvailable ?? product.sizes[0]);
    setSizeProductId(product.id);
  };

  const removeFromCart = (index: number) => {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const goHome = () => {
    setView("shop");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setOrderError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            address: formData.get("address"),
            city: formData.get("city"),
          },
          items: cart,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not place order");
      setConfirmedOrderId(data.order.id);
      setConfirmedTotal(data.order.total);
      setCart([]);
      setView("confirmed");
      window.scrollTo(0, 0);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "checkout") {
    return (
      <main>
        <StoreHeader cartCount={cart.length} onHome={goHome} onBag={() => setCartOpen(true)} isLight={isLight} onTheme={toggleTheme} />
        <section className="checkout-shell">
          <button className="back-link" type="button" onClick={goHome}>← Continue shopping</button>
          <div className="checkout-heading">
            <div><span className="eyebrow">Secure order</span><h1>Checkout</h1></div>
            <span className="checkout-lock">Cash on delivery only</span>
          </div>
          <form id="cod-checkout" className="checkout-grid" onSubmit={submitOrder}>
            <div className="checkout-form">
              <section className="checkout-card">
                <div className="step-title"><span>01</span><div><h2>Contact</h2><p>Your order updates will be sent here.</p></div></div>
                <div className="field-grid one"><label>Email<input name="email" type="email" placeholder="you@example.com" required /></label></div>
              </section>
              <section className="checkout-card">
                <div className="step-title"><span>02</span><div><h2>Delivery address</h2><p>Cash will be collected at this address.</p></div></div>
                <div className="field-grid">
                  <label>First name<input name="firstName" placeholder="Yassine" required /></label>
                  <label>Last name<input name="lastName" placeholder="El Amrani" required /></label>
                  <label className="wide">Address<input name="address" placeholder="Street, building, apartment" required /></label>
                  <label>City<input name="city" placeholder="Casablanca" required /></label>
                  <label>Phone<input name="phone" type="tel" placeholder="06 00 00 00 00" required /></label>
                </div>
              </section>
              <section className="checkout-card">
                <div className="step-title"><span>03</span><div><h2>Delivery</h2><p>Fast shipping across Morocco.</p></div></div>
                <label className="choice-row"><input type="radio" defaultChecked readOnly /><span><strong>Standard delivery</strong><small>2–4 business days</small></span><b>35 MAD</b></label>
              </section>
              <section className="checkout-card">
                <div className="step-title"><span>04</span><div><h2>Payment</h2><p>No card, PayPal, or online payment.</p></div></div>
                <label className="choice-row cod-choice"><input type="radio" defaultChecked readOnly /><span><strong>Cash on delivery</strong><small>Pay the courier when your order arrives</small></span><b>COD</b></label>
              </section>
            </div>
            <aside className="order-summary-card">
              <h2>Your order</h2>
              <div className="summary-products">
                {cartProducts.map((product, index) => (
                  <div className="summary-product" key={`${product.id}-${index}`}>
                    <Image src={product.image} alt="" width={72} height={82} unoptimized />
                    <div><strong>{product.name}</strong><span>Size {product.size} · Qty 1</span></div>
                    <b>{formatMAD(product.price)}</b>
                  </div>
                ))}
              </div>
              <div className="price-lines"><div><span>Subtotal</span><b>{formatMAD(cartTotal)}</b></div><div><span>Delivery</span><b>35 MAD</b></div><div className="grand-total"><span>Total</span><b>{formatMAD(cartTotal + 35)}</b></div></div>
              {orderError && <p className="order-error">{orderError}</p>}
              <button className="place-order" type="submit" disabled={submitting}>{submitting ? "Creating order…" : "Confirm cash on delivery"}</button>
              <p className="checkout-note">By confirming, your order is created as payment pending. The OTHERLIFE admin marks it paid after cash collection.</p>
            </aside>
          </form>
        </section>
        <div className="mobile-checkout-bar"><div><span>Total</span><strong>{formatMAD(cartTotal + 35)}</strong></div><button type="submit" form="cod-checkout" disabled={submitting}>{submitting ? "Creating…" : "Confirm COD →"}</button></div>
      </main>
    );
  }

  if (view === "confirmed") {
    return (
      <main>
        <StoreHeader cartCount={cart.length} onHome={goHome} onBag={() => setCartOpen(true)} isLight={isLight} onTheme={toggleTheme} />
        <section className="confirmation-shell">
          <span className="confirmation-mark">✓</span>
          <span className="eyebrow">Order {confirmedOrderId} confirmed</span>
          <h1>Thank you.<br />Your order is in.</h1>
          <p>We’ll call you before delivery. Prepare <strong>{formatMAD(confirmedTotal)}</strong> in cash for the courier.</p>
          <div className="confirmation-actions"><button type="button" onClick={goHome}>Back to store</button></div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <StoreHeader cartCount={cart.length} onHome={goHome} onBag={() => setCartOpen(true)} isLight={isLight} onTheme={toggleTheme} />

      <section className="video-hero" id="top" aria-label="OTHERLIFE campaign">
        <video key={heroVideoUrl} autoPlay muted loop playsInline preload="metadata" poster={heroVideoUrl === defaultHeroVideo ? "/video/otherlife-hero-2026-poster.png" : undefined}>
          <source src={heroVideoUrl} />
        </video>
        <div className="video-shade" />
        <a className="video-cta" href="#drop">Shop now <span>→</span></a>
        <span className="video-label">OTHERLIFE · Casablanca</span>
      </section>

      <div className="store-content">
        <div className="desktop-drop-ticker" aria-hidden="true">
          <div className="desktop-drop-track">
            <span>OTHERLIFE® ✦ CASABLANCA ✦ BEYOND ORDINARY ✦</span>
            <span>OTHERLIFE® ✦ CASABLANCA ✦ BEYOND ORDINARY ✦</span>
          </div>
        </div>

        <section className="shop-section" id="drop">
        <div className="category-tabs" role="tablist" aria-label="Filter products">
          {categories.map((category) => (
            <button type="button" role="tab" aria-selected={activeCategory === category} className={activeCategory === category ? "active" : ""} key={category} onClick={() => setActiveCategory(category)}>
              {category}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {visibleProducts.map((product) => {
            const totalStock = product.sizes.reduce((sum, size) => sum + (inventory[product.id]?.[size] ?? product.initialStock[size] ?? 0), 0);
            return (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  <Image src={product.image} alt={product.name} fill sizes="(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 25vw" unoptimized />
                  <button type="button" disabled={totalStock < 1} onClick={() => openSizeChooser(product.id)}>{totalStock < 1 ? "Sold out" : "Choose size"} <span>{totalStock < 1 ? "—" : "+"}</span></button>
                </div>
                <div className="product-details">
                  <div><h3>{product.name}</h3><p>{product.type}</p></div>
                  <strong>{formatMAD(product.price)}</strong>
                </div>
              </article>
            );
          })}
        </div>
        </section>

        <section className="story" id="story">
          <div className="story-image">
            <Image src="/images/products/otherlife-night-coach-jacket.webp" alt="OTHERLIFE Night Transit Coach Jacket" fill sizes="(max-width: 800px) 100vw, 48vw" unoptimized />
          </div>
          <div className="story-copy">
            <span className="eyebrow">Our point of view</span>
            <h2>Made here.<br />Worn everywhere.</h2>
            <p>OTHERLIFE is made for the version of you that refuses the default. Considered essentials, created in Casablanca and built to move beyond it.</p>
            <a href="#drop">Explore the collection</a>
          </div>
        </section>

        <footer>
          <a className="footer-brand" href="#top">OTHER LIFE®</a>
          <div className="footer-links"><span>Instagram</span><span>TikTok</span><span>Shipping & returns</span></div>
          <span>© 2026 · Casablanca, Morocco</span>
        </footer>
      </div>

      {sizeProductId && (() => {
        const product = catalogProducts.find((item) => item.id === sizeProductId);
        if (!product) return null;
        const selectedStock = inventory[product.id]?.[modalSize] ?? product.initialStock[modalSize] ?? 0;
        return (
          <div className="size-modal-layer">
            <button className="size-modal-backdrop" type="button" aria-label="Close size chooser" onClick={() => setSizeProductId(null)} />
            <section className="size-modal" role="dialog" aria-modal="true" aria-labelledby="size-modal-title">
              <button className="size-modal-close" type="button" onClick={() => setSizeProductId(null)}>Close</button>
              <Image src={product.image} alt={product.name} width={170} height={205} unoptimized />
              <div className="size-modal-copy">
                <span className="eyebrow">Choose your size</span>
                <h2 id="size-modal-title">{product.name}</h2>
                <p>{product.type}</p>
                <div className="modal-size-options">
                  {product.sizes.map((size) => {
                    const stock = inventory[product.id]?.[size] ?? product.initialStock[size] ?? 0;
                    return <button type="button" key={size} className={modalSize === size ? "active" : ""} disabled={stock < 1} onClick={() => setModalSize(size)}><strong>{size}</strong><span>{stock > 0 ? `${stock} left` : "Sold out"}</span></button>;
                  })}
                </div>
                <button className="confirm-size" type="button" disabled={selectedStock < 1} onClick={() => { addToCart(product.id, modalSize); setSizeProductId(null); }}>Confirm {modalSize} · {formatMAD(product.price)}</button>
                {modalSize && selectedStock > 0 && <a className="whatsapp-order" href={whatsappHref(`Salam OTHERLIFE, bghit ncommandi:\n\nProduit: ${product.name}\nRéférence: ${product.sku}\nTaille: ${modalSize}\nPrix: ${formatMAD(product.price)}\n\nMerci.`)} target="_blank" rel="noreferrer" onClick={() => setSizeProductId(null)}><WhatsAppIcon /> Commander sur WhatsApp</a>}
              </div>
            </section>
          </div>
        );
      })()}

      {cartOpen && (
        <div className="cart-layer" role="presentation">
          <button className="cart-backdrop" type="button" aria-label="Close bag" onClick={() => setCartOpen(false)} />
          <aside className="cart-panel" role="dialog" aria-modal="true" aria-label="Shopping bag">
            <div className="cart-header">
              <strong>Your bag ({cart.length})</strong>
              <button type="button" onClick={() => setCartOpen(false)} aria-label="Close bag">Close</button>
            </div>
            <div className="cart-items">
              {cartProducts.length === 0 ? (
                <div className="empty-cart"><span>Your bag is empty.</span><button type="button" onClick={() => setCartOpen(false)}>Explore collection</button></div>
              ) : cartProducts.map((product, index) => (
                <div className="cart-item" key={`${product.id}-${index}`}>
                  <Image src={product.image} alt="" width={92} height={92} unoptimized />
                  <div><strong>{product.name}</strong><span>Size {product.size} · {formatMAD(product.price)}</span><button type="button" onClick={() => removeFromCart(index)}>Remove</button></div>
                </div>
              ))}
            </div>
            {cartProducts.length > 0 && (
              <div className="cart-summary">
                <div><span>Total</span><strong>{formatMAD(cartTotal)}</strong></div>
                <button type="button" onClick={() => { setCartOpen(false); setView("checkout"); window.scrollTo(0, 0); }}>Checkout · Cash on delivery</button>
                <p>No PayPal. No card. Pay the courier when your order arrives.</p>
              </div>
            )}
          </aside>
        </div>
      )}
      <a className="whatsapp-float" href={whatsappHref("Salam OTHERLIFE, bghit n3ref aktar 3la collection. Merci.")} target="_blank" rel="noreferrer" aria-label="Contact OTHERLIFE on WhatsApp"><WhatsAppIcon /><span>WhatsApp</span></a>
      <MobileDock
        cartCount={cart.length}
        onHome={goHome}
        onBag={() => setCartOpen(true)}
        onCheckout={() => { if (cart.length > 0) { setView("checkout"); window.scrollTo(0, 0); } }}
      />
    </main>
  );
}
