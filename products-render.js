'use strict';

(function () {
  const API_BASE = 'http://localhost:8080/api';
  const API_ORIGIN = 'http://localhost:8080';

  function parseMeta(desc) {
    if (!desc) return {};
    const m = desc.match(/<!--META:(\{[\s\S]*?\})-->/);
    if (!m) return {};
    try { return JSON.parse(m[1]); } catch { return {}; }
  }

  function formatINR(n) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
  }

  function buildCard(p, onAddToCart) {
    const div = document.createElement('div');
    div.className = 'product-card';
    const meta = parseMeta(p.description);
    const offer = meta.offerPrice ?? p.price;
    const original = meta.originalPrice ?? offer;
    const priceHtml = original && original > offer
      ? `<div class="price-container"><span class="original-price">${formatINR(original)}</span><span class="discount-price">${formatINR(offer)}</span></div>`
      : `<p class="product-price">${formatINR(offer)}</p>`;
    const imgSrc = resolveImage(p.imagePath || '');
    // Build inner HTML with a clickable area that navigates to product details
    div.innerHTML = `
      <a href="product-details.html?id=${p.id}" class="product-link">
        <img src="${imgSrc}" alt="${p.title || ''}" class="product-image" />
        <div class="product-info">
          <h3 class="product-name">${p.title || ''}</h3>
          ${priceHtml}
        </div>
      </a>
      <button class="add-to-cart-btn"><i class="fas fa-shopping-cart"></i></button>
    `;

    // Add-to-cart behavior
    const btn = div.querySelector('.add-to-cart-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        // Prevent navigation when clicking add-to-cart
        e.preventDefault();
        e.stopPropagation();
        onAddToCart(p);
      });
    }

    // Make entire card (except the add-to-cart button) clickable
    const link = div.querySelector('.product-link');
    if (link) {
      div.addEventListener('click', (e) => {
        // Ignore clicks originating from the add-to-cart button
        if ((e.target instanceof HTMLElement) && e.target.closest('.add-to-cart-btn')) {
          return;
        }
        window.location.href = link.href;
      });
    }
    return div;
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  }

  function filterBy(items, opts) {
    const { location, productType } = opts;
    return items.filter(p => {
      const meta = parseMeta(p.description);
      const typeValue = (meta.productType || p.category || '').toLowerCase();
      const typeOk = productType ? typeValue === productType.toLowerCase() : true;
      const locs = (meta.displayLocations || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const locOk = location ? locs.includes(location.toLowerCase()) : true;
      return typeOk && locOk;
    });
  }

  function defaultAddToCart(p) {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (!token || !username) {
      alert('Please login to add items to cart');
      window.location.href = 'login.html';
      return;
    }

    // Prefer centralized CartManager so cart and checkout use the same data/format
    if (typeof cartManager !== 'undefined') {
      (async () => {
        try {
          const success = await cartManager.addToCart(p.id, 1);
          if (success) {
            alert('Product added to cart successfully!');
          }
        } catch (err) {
          console.error('Error adding to cart via CartManager:', err);
          alert('Error adding product to cart');
        }
      })();
      return;
    }

    // Fallback: maintain a localCart structure compatible with CartManager
    const price = parseMeta(p.description).offerPrice ?? p.price;
    let localCart = JSON.parse(localStorage.getItem('localCart')) || { items: [] };
    const items = Array.isArray(localCart.items) ? localCart.items : [];

    const existingIndex = items.findIndex(i => i.product && i.product.id == p.id);
    if (existingIndex >= 0) {
      items[existingIndex].quantity = (items[existingIndex].quantity || 1) + 1;
    } else {
      const img = resolveImage(p.imagePath || '');
      items.push({
        product: { id: p.id, name: p.title, price: price, imageUrl: img },
        quantity: 1,
        priceAtTime: price
      });
    }

    localCart.items = items;
    localStorage.setItem('localCart', JSON.stringify(localCart));
    alert('Product added to cart successfully!');
  }

  async function renderInto(selector, opts) {
    const container = document.querySelector(selector);
    if (!container) return;
    const list = await fetchProducts();
    const filtered = filterBy(list, opts || {});
    container.innerHTML = '';
    filtered.forEach(p => container.appendChild(buildCard(p, defaultAddToCart)));
  }

  window.ProductsRender = { renderInto };
  function resolveImage(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('img/')) return API_ORIGIN + '/' + url;
    // If it already starts with /uploads/, use it directly
    if (url.startsWith('/uploads/')) return API_ORIGIN + url;
    // If it's just a filename (no slash/protocol), assume uploads/products on backend
    return `${API_ORIGIN}/uploads/products/${url}`;
  }
})();
