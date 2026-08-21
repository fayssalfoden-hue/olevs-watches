/* Shared runtime for every OLEVS page: Supabase client, money formatting,
 * the cart, and the auth guard.
 *
 * Loaded after config.js and the supabase-js UMD bundle.
 */
(function () {
  'use strict';

  var CFG = window.OLEVS_CONFIG;

  // ---------------------------------------------------------------- Supabase
  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

  // ------------------------------------------------------------------- Money
  // The design specifies a dot as the thousands separator: "450.000 DA".
  function fmtDA(value) {
    var n = Number(value || 0);
    var whole = Math.round(n);
    var out = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (whole < 0 ? '-' : '') + out + ' DA';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // -------------------------------------------------------------------- Cart
  //
  // Held in sessionStorage rather than localStorage: a cart is a single visit's
  // intent, and a stale basket resurfacing days later against prices that have
  // since changed is a support call, not a feature. The checkout page reads the
  // same store, so "Buy Now" and "Proceed to Checkout" travel by the same road.
  var CART_KEY = 'olevs.cart.v1';

  function readCart() {
    try {
      var raw = sessionStorage.getItem(CART_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeCart(items) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:changed', { detail: items }));
  }

  var Cart = {
    items: readCart,

    /* Adds `qty` of a product, merging with any line already present.
       Never lets a line exceed the stock on hand — the database refuses such an
       order anyway, and finding that out at the last click is a worse experience
       than being stopped here. */
    add: function (product, qty) {
      qty = Math.max(1, parseInt(qty, 10) || 1);
      var items = readCart();
      var line = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].product_id === product.id) { line = items[i]; break; }
      }
      var stock = Number(product.stock_quantity || 0);
      if (line) {
        line.quantity = Math.min(line.quantity + qty, stock);
        line.price = Number(product.price);
        line.product_name = product.name;
        line.image_url = product.image_url;
        line.stock_quantity = stock;
      } else {
        items.push({
          product_id: product.id,
          product_name: product.name,
          price: Number(product.price),
          quantity: Math.min(qty, stock),
          image_url: product.image_url,
          stock_quantity: stock,
        });
      }
      writeCart(items);
      return items;
    },

    setQty: function (productId, qty) {
      var items = readCart();
      var out = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.product_id === productId) {
          var q = parseInt(qty, 10) || 0;
          if (q <= 0) continue;                                  // removed
          it.quantity = Math.min(q, Number(it.stock_quantity || q));
        }
        out.push(it);
      }
      writeCart(out);
      return out;
    },

    remove: function (productId) {
      writeCart(readCart().filter(function (it) { return it.product_id !== productId; }));
    },

    clear: function () { writeCart([]); },

    /* Replaces the cart with a single line — what "Buy Now" means. */
    buyNow: function (product, qty) {
      writeCart([]);
      return Cart.add(product, qty);
    },

    count: function () {
      return readCart().reduce(function (a, it) { return a + it.quantity; }, 0);
    },

    subtotal: function () {
      return readCart().reduce(function (a, it) { return a + it.price * it.quantity; }, 0);
    },
  };

  // -------------------------------------------------------------------- Auth
  var Auth = {
    session: function () {
      return sb.auth.getSession().then(function (r) { return r.data.session; });
    },

    /* Guards an owner-only page. Anyone without a session is sent to the login
       page before any protected markup is revealed — the dashboard body starts
       hidden and is only unhidden once this resolves. */
    requireOwner: function (loginUrl) {
      return Auth.session().then(function (session) {
        if (!session) {
          window.location.replace(loginUrl || 'login.html');
          return null;
        }
        return session;
      });
    },

    signOut: function () { return sb.auth.signOut(); },
  };

  // ------------------------------------------------------------------ Export
  window.OLEVS = {
    sb: sb,
    fmtDA: fmtDA,
    escapeHtml: escapeHtml,
    Cart: Cart,
    Auth: Auth,

    /* Product image fallback: a product saved without an image still has to
       occupy its slot in the grid rather than collapsing it. */
    imgFor: function (p) {
      return p && p.image_url
        ? p.image_url
        : 'data:image/svg+xml;utf8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">' +
            '<rect width="400" height="500" fill="#f5f3f3"/>' +
            '<text x="200" y="250" font-family="serif" font-size="20" fill="#c5a365" ' +
            'text-anchor="middle">OLEVS</text></svg>');
    },

    /* Delivery fees come from the database, not from a constant in this file,
       so the owner can change them without a redeploy. If the read fails we
       report it rather than quietly substituting a guess — a wrong delivery fee
       is a real amount of money and it would look perfectly reasonable. */
    loadFees: function () {
      return sb.from(CFG.TABLE_FEES).select('method,fee,label').then(function (r) {
        if (r.error || !r.data || !r.data.length) return null;
        var out = {};
        r.data.forEach(function (row) {
          out[row.method] = { fee: Number(row.fee), label: row.label };
        });
        return out.home && out.office ? out : null;
      });
    },
  };
})();
