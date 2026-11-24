(() => {
  const body = document.body;
  const header = document.getElementById('header');
  if (!header) return;

  // Entrance animations
  requestAnimationFrame(() => body.classList.add('is-loaded'));

  // Sticky header shadow / compact state
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Bag & wishlist counters (read straight from localStorage)
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const setCount = (sel, n) => document.querySelectorAll(sel).forEach((el) => {
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = n === 0;
  });
  const refreshCounts = () => {
    setCount('[data-cart-count]', read('vs_cart_v1').reduce((n, i) => n + (Number(i.qty) || 0), 0));
    setCount('[data-wish-count]', read('vs_wishlist_v1').length);
  };
  refreshCounts();
  window.addEventListener('cart:change', refreshCounts);
  window.addEventListener('wishlist:change', refreshCounts);
  window.addEventListener('storage', refreshCounts);

  // Generic overlay helper (mobile drawer + search)
  const overlay = (el, trigger, focusTarget) => {
    const open = () => {
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      trigger?.setAttribute('aria-expanded', 'true');
      body.classList.add('is-locked');
      setTimeout(() => (focusTarget || el.querySelector('a, button, input'))?.focus(), 50);
    };
    const close = () => {
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      trigger?.setAttribute('aria-expanded', 'false');
      body.classList.remove('is-locked');
      trigger?.focus();
    };
    return { open, close, isOpen: () => el.classList.contains('is-open') };
  };

  // Mobile drawer
  const drawerEl = document.getElementById('mobileNav');
  const menuToggle = document.getElementById('menuToggle');
  const drawer = overlay(drawerEl, menuToggle);
  menuToggle.addEventListener('click', drawer.open);
  drawerEl.querySelectorAll('[data-close-drawer], .drawer__list a').forEach(a => a.addEventListener('click', drawer.close));

  // Search
  const searchEl = document.getElementById('searchOverlay');
  const searchOpen = document.getElementById('searchOpen');
  const search = overlay(searchEl, searchOpen, document.getElementById('searchInput'));
  searchOpen.addEventListener('click', search.open);
  document.getElementById('searchClose').addEventListener('click', search.close);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (search.isOpen()) search.close();
    if (drawer.isOpen()) drawer.close();
  });

  // Close drawer if resized to desktop
  window.matchMedia('(min-width: 1081px)').addEventListener('change', e => {
    if (e.matches && drawer.isOpen()) drawer.close();
  });
})();
