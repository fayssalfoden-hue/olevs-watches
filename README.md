# OLEVS / AETERNUS — luxury handmade watches storefront

The four supplied Stitch screens, wired to Supabase. The markup and Tailwind
classes are the designs' own; the JavaScript, the schema and the policies are
what make them work.

| Page | File | Who it is for |
|---|---|---|
| Homepage | `index.html` | Customers — browse, cart, buy |
| Order Confirmation | `checkout.html` | Customers — place the order |
| Login | `login.html` | The owner |
| Dashboard | `dashboard.html` | The owner — products, orders, settings |

## Layout

```
index.html  checkout.html  login.html  dashboard.html
assets/
  theme.js     the Tailwind token block, lifted verbatim from the screens and
               shared by all four pages so they cannot drift apart
  config.js    Supabase URL, anon key, table names
  store.js     Supabase client, DA formatting, cart, auth guard
  algeria.js   58 wilayas, 1,541 communes
  ALGERIA_SOURCE.md   where that dataset came from
supabase/
  schema.sql   tables, RLS, and the order-integrity triggers. Idempotent.
```

## The database

Every table carries a `watch_` prefix. This Supabase project already hosts
another site which owns `public.products` — an unprefixed `create table if not
exists` silently does nothing against it and leaves this shop reading someone
else's columns. The prefix is what keeps the two applications apart.

- `watch_products` — id, name, price (DA), description, image_url,
  stock_quantity, created_at
- `watch_orders` — customer_name, phone, wilaya, commune, delivery_method,
  items (jsonb), delivery_fee, total_amount, status, created_at
- `watch_delivery_fees` — the two fees, as data rather than as code

Product images live in the public `watch-product-images` storage bucket.

### Who can do what

| | anonymous visitor | signed-in owner |
|---|---|---|
| products | read | read, create, edit, delete |
| delivery fees | read | read, edit |
| orders | insert only | read, update |

A visitor cannot read the order book — not even the row they just wrote — so the
checkout inserts without asking for the row back.

### Why the money is recomputed server-side

The prices, quantities and totals that arrive from a browser are a claim, not a
fact: anyone can edit them in devtools before pressing Confirm. `watch_orders`
therefore has a `before insert` trigger that rebuilds every money column from
the products table and the fee table, and refuses — rather than defaults — on an
unknown product, a non-positive quantity, or a quantity above the stock on hand.
Status is forced to `new` whatever was posted.

This was tested rather than assumed. An order claiming an 18,000 DA watch cost
1 DA with 0 DA delivery was stored as 18,000 DA with a 700 DA fee.

## Delivery fees

Office 400 DA, home 700 DA — placeholders, changeable from Dashboard → Settings.
The rule that home must exceed office is enforced by a database trigger, not
only by the form, so it holds however the row is edited.

## Running it

Static files: any host will do. Currently on GitHub Pages. There is no build
step — Tailwind comes from its CDN exactly as the supplied screens did.

To point at a different Supabase project, edit `assets/config.js` and run
`supabase/schema.sql` against the new database.

## Known limitations

- **The anon key is public.** It is designed to be; RLS is what protects the
  data. Never put the service-role key in these files.
- **Tailwind runs from the CDN**, compiling classes in the browser. That is how
  the screens were delivered and it keeps them byte-comparable, but a production
  shop is better served by a compiled stylesheet.
- **Stock is decremented on order insert**, with no reservation or rollback if
  an order is later cancelled. Restock by editing the product.
- **The email-change flow is wired but its confirmation email was not sent
  during testing**, to avoid mailing a stranger. The client-side validation and
  the Supabase call are in place; the round trip is unverified.
- **`orders` has no delete policy** on purpose — an order is a commercial record
  and the dashboard offers no way to destroy one.
