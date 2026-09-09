# OTHERLIFE Store

Next.js storefront and admin dashboard for OTHERLIFE.

## Admin

Open `/admin` and sign in with:

```text
Username: imad
Password: imad
```

The dashboard can manage products, stock, orders, product images, and the hero video.

## Data

This VPS-ready version stores runtime data on the server filesystem:

- `data/store.json` for products, inventory, and orders
- `data/hero.json` for the active hero video
- `public/uploads/` for uploaded product images and hero videos

These paths are ignored by Git so live store data is not overwritten by future deploys.

## Commands

```bash
npm install
npm run build
npm start
```

For development:

```bash
npm run dev
```
