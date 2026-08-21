/* Supabase connection.
 *
 * The anon key is a public, publishable key — it is meant to ship in the browser.
 * It grants exactly what the Row Level Security policies in supabase/schema.sql
 * allow: read the watch catalogue, read the delivery fees, insert an order.
 * Nothing else. The owner's powers come from logging in, not from this key.
 */
window.OLEVS_CONFIG = {
  SUPABASE_URL: 'https://vpquzuweianhldjnrtmp.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwcXV6dXdlaWFuaGxkam5ydG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MjAxNzEsImV4cCI6MjEwMjI5NjE3MX0.axmZmFuHOeoxdzTPUYZLv3LDQi2r08KdYiqf89FaPXs',

  // Table names carry a `watch_` prefix: this Supabase project also hosts another
  // site which already owns `public.products`. See supabase/schema.sql.
  TABLE_PRODUCTS: 'watch_products',
  TABLE_ORDERS: 'watch_orders',
  TABLE_FEES: 'watch_delivery_fees',
  BUCKET: 'watch-product-images',
};
