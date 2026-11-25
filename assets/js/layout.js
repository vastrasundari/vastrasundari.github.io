/*
 * Shared storefront chrome (header, nav, drawer, search, footer).
 * Usage — place where the markup should appear:
 *   <script src="assets/js/layout.js" data-part="header"></script>
 *   <script src="assets/js/layout.js" data-part="footer"></script>
 * Rendered synchronously so there is no flash of missing header.
 */
(function () {
  var script = document.currentScript;
  var part = script && script.dataset.part;
  var cfg = window.VS_CONFIG || {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var NAV = [
    ["Home", "index.html"],
    ["New Arrivals", "shop.html?new=1"],
    ["Chaniya Choli", "shop.html"],
    ["Navratri Collection", "shop.html?collection=navratri", "Navratri"],
    ["Bridal Collection", "shop.html?collection=bridal", "Bridal"],
    ["Festive Collection", "shop.html?collection=festive", "Festive"],
    ["About Us", "index.html#about"],
    ["Contact", "index.html#contact"],
  ];

  function isActive(href) {
    var page = location.pathname.split("/").pop() || "index.html";
    var u = new URL(href, location.href);
    var hrefPage = u.pathname.split("/").pop() || "index.html";
    if (u.hash) return false;
    if (hrefPage !== page) return false;
    if (page !== "shop.html") return true;
    var p = new URLSearchParams(location.search);
    return (u.searchParams.get("collection") || "") === (p.get("collection") || "") &&
           (u.searchParams.get("new") || "") === (p.get("new") || "");
  }

  function navItems(cls, short) {
    return NAV.map(function (n) {
      var label = short && n[2] ? n[2] : n[0];
      var active = isActive(n[1]);
      return '<li><a href="' + n[1] + '" class="' + cls + (active ? " is-active" : "") + '"' +
        (active ? ' aria-current="page"' : "") + ">" + label + "</a></li>";
    }).join("");
  }

  var SPRITE =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
    '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></symbol>' +
    '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"/></symbol>' +
    '<symbol id="i-bag" viewBox="0 0 24 24"><path d="M5 8h14l-1 12.5H6L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></symbol>' +
    '<symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.3-3.8 4.2-5.5 7.5-5.5s6.2 1.7 7.5 5.5"/></symbol>' +
    '<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>' +
    '<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h15M14 7l5 5-5 5"/></symbol>' +
    '<symbol id="i-motif" viewBox="0 0 40 40"><path d="M20 2 23 17 38 20 23 23 20 38 17 23 2 20 17 17Z"/><circle cx="20" cy="20" r="3"/></symbol>' +
    "</svg>";

  var LOGO_SRC = "assets/images/logo.jpg";

  var HEADER =
    SPRITE +
    '<header class="header" id="header"><div class="header__top container">' +
    '<button class="header__burger" id="menuToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav"><span></span><span></span><span></span></button>' +
    '<a href="index.html" class="logo" aria-label="Vastra Sundari — Home"><img class="logo__img" src="' + LOGO_SRC + '" alt="Vastra Sundari" width="150" height="150"></a>' +
    '<nav class="nav" aria-label="Primary"><ul class="nav__list">' + navItems("nav__link", true) + "</ul></nav>" +
    '<ul class="header__icons" aria-label="Shop tools">' +
    '<li><button class="icon-btn" id="searchOpen" aria-label="Search"><svg><use href="#i-search"/></svg></button></li>' +
    '<li class="hide-sm"><a class="icon-btn" href="wishlist.html" aria-label="Wishlist"><svg><use href="#i-heart"/></svg><span class="icon-btn__count" data-wish-count hidden>0</span></a></li>' +
    '<li><a class="icon-btn" href="cart.html" aria-label="Shopping bag"><svg><use href="#i-bag"/></svg><span class="icon-btn__count" data-cart-count hidden>0</span></a></li>' +
    '<li class="hide-sm"><a class="icon-btn" href="order.html" aria-label="My orders"><svg><use href="#i-user"/></svg></a></li>' +
    "</ul></div></header>" +

    '<div class="drawer" id="mobileNav" aria-hidden="true"><div class="drawer__scrim" data-close-drawer></div>' +
    '<aside class="drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">' +
    '<div class="drawer__head"><img class="drawer__logo" src="' + LOGO_SRC + '" alt="Vastra Sundari" width="150" height="150"><button class="icon-btn" data-close-drawer aria-label="Close menu"><svg><use href="#i-close"/></svg></button></div>' +
    '<ul class="drawer__list">' + navItems("") + "</ul>" +
    '<div class="drawer__foot"><a href="wishlist.html"><svg><use href="#i-heart"/></svg> Wishlist</a><a href="order.html"><svg><use href="#i-user"/></svg> My Orders</a></div>' +
    "</aside></div>" +

    '<div class="search" id="searchOverlay" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Search">' +
    '<button class="icon-btn search__close" id="searchClose" aria-label="Close search"><svg><use href="#i-close"/></svg></button>' +
    '<form class="search__form" role="search" action="shop.html" method="get">' +
    '<label for="searchInput" class="eyebrow">Search the Collection</label>' +
    '<div class="search__field"><input id="searchInput" name="q" type="search" maxlength="60" placeholder="Bandhani, mirror work, bridal…" autocomplete="off">' +
    '<button type="submit" aria-label="Submit search"><svg><use href="#i-search"/></svg></button></div>' +
    '<div class="search__tags"><span>Popular:</span>' +
    '<a href="shop.html?collection=navratri">Navratri Chaniya Choli</a><a href="shop.html?q=mirror">Kutchi Mirror Work</a>' +
    '<a href="shop.html?collection=bridal">Bridal</a><a href="shop.html?q=bandhani">Bandhani</a><a href="shop.html?q=silk">Silk</a></div>' +
    "</form></div>";

  function contactLines() {
    var out = [];
    if (cfg.CONTACT_PHONE) out.push('<li><a href="tel:' + esc(cfg.CONTACT_PHONE.replace(/[^\d+]/g, "")) + '">' + esc(cfg.CONTACT_PHONE) + "</a></li>");
    if (cfg.WHATSAPP_NUMBER) out.push('<li><a href="https://wa.me/' + esc(cfg.WHATSAPP_NUMBER.replace(/\D/g, "")) + '" target="_blank" rel="noopener">WhatsApp us</a></li>');
    if (cfg.CONTACT_EMAIL) out.push('<li><a href="mailto:' + esc(cfg.CONTACT_EMAIL) + '">' + esc(cfg.CONTACT_EMAIL) + "</a></li>");
    if (cfg.STUDIO_ADDRESS) out.push("<li>" + esc(cfg.STUDIO_ADDRESS) + "</li>");
    return out.join("");
  }

  var FOOTER =
    '<footer class="footer" id="contact"><div class="container footer__grid">' +
    '<div class="footer__brand"><span class="logo__name">Vastra Sundari</span>' +
    '<p>Jamnagar’s boutique for exclusive Gujarati Chaniya Choli — handcrafted for Navratri, weddings and every festive moment. Delivering across Jamnagar, Gujarat and India.</p></div>' +
    '<div><h4>Shop</h4><ul>' +
    '<li><a href="shop.html?new=1">New Arrivals</a></li><li><a href="shop.html?collection=navratri">Navratri</a></li>' +
    '<li><a href="shop.html?collection=bridal">Bridal</a></li><li><a href="shop.html?collection=festive">Festive</a></li></ul></div>' +
    '<div><h4>Help</h4><ul><li><a href="order.html">Track my order</a></li><li><a href="cart.html">Shopping bag</a></li>' +
    "<li>Cash on Delivery across India</li></ul></div>" +
    "<div><h4>Contact</h4><ul>" + (contactLines() || "<li>We would love to hear from you.</li>") + "</ul></div>" +
    '</div><div class="footer__base container"><span>© ' + new Date().getFullYear() + " Vastra Sundari</span>" +
    "<span>The Art of Traditional Elegance</span></div></footer>";

  if (part === "header") {
    script.insertAdjacentHTML("beforebegin", HEADER);
    if (!document.querySelector('link[rel="icon"]')) {
      var icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/jpeg";
      icon.href = LOGO_SRC;
      document.head.appendChild(icon);
    }
  }
  if (part === "footer") script.insertAdjacentHTML("beforebegin", FOOTER);
})();
