'use strict';

(function () {
  const API_BASE = 'http://localhost:8080/api';

  // --- Auth Guard ---
  function requireAuth() {
    try {
      if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
        const u = authManager.getCurrentUser();
        const el = document.getElementById('adminUser');
        if (el && u) el.textContent = u.username || '';
        return true;
      }
    } catch (e) { /* ignore */ }
    // Not authenticated -> send to login
    window.location.href = 'login.html';
    return false;
  }

  // --- Utilities ---
  function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    try {
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (_) {}
    return headers;
  }

  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '-';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n));
  }

  // --- Navigation ---
  function setupNav() {
    const buttons = document.querySelectorAll('.nav button');
    const sections = document.querySelectorAll('.section');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.getAttribute('data-section');
        sections.forEach(s => s.classList.remove('active'));
        const active = document.getElementById(`section-${key}`);
        if (active) active.classList.add('active');
        if (key === 'products') loadProducts();
      });
    });
  }

  // --- Dashboard sample stats (basic from products) ---
  async function loadDashboard() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const items = res.ok ? await res.json() : [];
      document.getElementById('statProducts').textContent = fmt(items.length);
      const low = items.filter(p => (p.stock ?? 0) <= 5).length;
      document.getElementById('statLowStock').textContent = fmt(low);
      // Placeholders for Orders/Users until endpoints exist
      document.getElementById('statOrders').textContent = '-';
      document.getElementById('statUsers').textContent = '-';
    } catch (e) {
      console.warn('Dashboard load failed', e);
    }
  }

  // --- Products ---
  let productsCache = [];

  function renderProducts(list) {
    const tbody = document.getElementById('productsTbody');
    tbody.innerHTML = '';
    list.forEach(p => {
      const meta = parseMeta(p.description);
      const priceToShow = meta.offerPrice ?? p.price;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.id ?? ''}</td>
        <td>${p.title ?? ''}</td>
        <td>₹ ${fmt(priceToShow)}</td>
        <td><span class="chip">${fmt(p.stock ?? 0)}</span></td>
        <td>${p.category ?? ''}</td>
        <td>${p.brand ?? ''}</td>
        <td>
          <div class="table-actions">
            <button class="btn secondary" data-edit="${p.id}"><i class="fa-solid fa-pen"></i></button>
            <button class="btn danger" data-del="${p.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind row actions
    tbody.querySelectorAll('button[data-edit]').forEach(b => b.addEventListener('click', () => {
      const id = Number(b.getAttribute('data-edit'));
      const p = productsCache.find(x => x.id === id);
      if (p) fillForm(p);
    }));

    tbody.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', async () => {
      const id = Number(b.getAttribute('data-del'));
      if (!id) return;
      if (!confirm('Delete this product?')) return;
      await deleteProduct(id);
      await loadProducts();
      resetForm();
    }));
  }

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      productsCache = res.ok ? await res.json() : [];
      const q = document.getElementById('productSearch').value.trim().toLowerCase();
      const filtered = q ? productsCache.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      ) : productsCache;
      renderProducts(filtered);
    } catch (e) {
      console.error('Failed to load products', e);
    }
  }

  function fillForm(p) {
    document.getElementById('p_id').value = p.id ?? '';
    document.getElementById('p_title').value = p.title ?? '';
    document.getElementById('p_description').value = stripMeta(p.description ?? '');
    const meta = parseMeta(p.description);
    document.getElementById('p_price').value = (meta.offerPrice ?? p.price) ?? '';
    document.getElementById('p_stock').value = p.stock ?? 0;
    document.getElementById('p_category').value = p.category ?? '';
    document.getElementById('p_brand').value = p.brand ?? '';
    document.getElementById('p_imagePath').value = p.imagePath ?? '';
    const typeEl = document.getElementById('p_type');
    const mrpEl = document.getElementById('p_originalPrice');
    const imgsEl = document.getElementById('p_images');
    if (typeEl) typeEl.value = meta.productType || '';
    setSelectedCategories(meta.displayLocations || '');
    if (mrpEl) mrpEl.value = meta.originalPrice ?? '';
    if (imgsEl) imgsEl.value = meta.images || '';
    document.getElementById('deleteProduct').style.display = p.id ? 'inline-block' : 'none';
  }

  function gatherForm() {
    const meta = {
      productType: (document.getElementById('p_type')?.value || '').trim(),
      displayLocations: getSelectedCategoriesCSV(),
      originalPrice: valueOrNull(document.getElementById('p_originalPrice')?.value),
      offerPrice: valueOrNull(document.getElementById('p_price')?.value),
      images: (document.getElementById('p_images')?.value || '').trim()
    };
    const descriptionRaw = document.getElementById('p_description').value.trim();
    const description = `${descriptionRaw}\n<!--META:${JSON.stringify(meta)}-->`;
    const priceToSave = meta.offerPrice ?? valueOrNull(document.getElementById('p_price')?.value) ?? 0;
    
    // Normalize imagePath:
    // - If it's a full URL (http/https) -> keep as is
    // - If it starts with /uploads/ (Spring upload URL) -> keep as is
    // - If it's a Windows/local path -> convert to img/products/<filename>
    // - If it's just a bare filename -> prepend img/products/
    let imagePath = document.getElementById('p_imagePath').value.trim();
    if (imagePath) {
      if (/^https?:\/\//i.test(imagePath) || imagePath.startsWith('/uploads/')) {
        // Already a usable web URL or Spring upload path; do not change
      } else if (imagePath.includes('\\') || imagePath.includes('C:')) {
        // Convert full Windows paths to relative img/products/<filename>
        const filename = imagePath.split('\\').pop() || imagePath.split('/').pop();
        imagePath = `img/products/${filename}`;
      } else if (!imagePath.startsWith('img/')) {
        // Bare filename or some other relative path -> assume img/products
        imagePath = `img/products/${imagePath}`;
      }
    }
    
    return {
      title: document.getElementById('p_title').value.trim(),
      description,
      price: Number(priceToSave),
      stock: Number(document.getElementById('p_stock').value),
      // keep category aligned with productType for backend filtering
      category: (document.getElementById('p_type')?.value || document.getElementById('p_category').value || '').trim(),
      brand: document.getElementById('p_brand').value.trim(),
      imagePath: imagePath
    };
  }

  async function upsertProduct() {
    const id = document.getElementById('p_id').value;
    const payload = gatherForm();
    if (!payload.title || isNaN(payload.price)) {
      alert('Please provide at least Title and Price.');
      return;
    }

    const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) {
      alert('Save failed.');
      return;
    }
    await loadProducts();
    resetForm();
  }

  async function deleteProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) alert('Delete failed.');
  }

  function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('p_id').value = '';
    document.getElementById('deleteProduct').style.display = 'none';
  }

  function setupProducts() {
    document.getElementById('productSearch').addEventListener('input', loadProducts);
    document.getElementById('refreshProducts').addEventListener('click', loadProducts);
    document.getElementById('productForm').addEventListener('submit', (e) => { e.preventDefault(); upsertProduct(); });
    document.getElementById('resetForm').addEventListener('click', resetForm);
    document.getElementById('deleteProduct').addEventListener('click', async () => {
      const id = Number(document.getElementById('p_id').value);
      if (!id) return;
      if (!confirm('Delete this product?')) return;
      await deleteProduct(id);
      await loadProducts();
      resetForm();
    });
    
    // Setup image upload from desktop via Spring /api/images/upload
    const galleryBtn = document.getElementById('p_galleryBtn');
    const imageFile = document.getElementById('p_imageFile');
    const imagePathInput = document.getElementById('p_imagePath');
    const preview = document.getElementById('p_imagePreview');

    if (galleryBtn && imageFile && imagePathInput) {
      // Open file picker when clicking the button
      galleryBtn.addEventListener('click', () => {
        imageFile.click();
      });

      imageFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
          const fd = new FormData();
          fd.append('file', file);

          // Optional auth header without forcing Content-Type
          const headers = {};
          try {
            const token = localStorage.getItem('token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
          } catch (_) {}

          const res = await fetch(`${API_BASE}/images/upload`, {
            method: 'POST',
            headers,
            body: fd
          });

          if (!res.ok) {
            alert('Image upload failed.');
            return;
          }

          const data = await res.json();
          // Backend returns something like { url: "/uploads/products/xyz.png", filename: "xyz.png" }
          const imageUrl = data.url || '';
          if (!imageUrl) {
            alert('Image upload did not return a URL.');
            return;
          }

          imagePathInput.value = imageUrl; // store the backend URL in imagePath

          if (preview) {
            const origin = 'http://localhost:8080';
            preview.src = imageUrl.startsWith('http') ? imageUrl : origin + imageUrl;
            preview.style.display = 'block';
          }
        } catch (err) {
          console.error('Image upload error', err);
          alert('Image upload error. See console for details.');
        }
      });
    }
  }

  // --- Orders ---
  let ordersCache = [];

  function renderOrders(list) {
    const tbody = document.getElementById('ordersTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    list.forEach(o => {
      let itemsSummary = '';
      let total = 0;
      try {
        if (o.cartItems) {
          const items = JSON.parse(o.cartItems);
          if (Array.isArray(items)) {
            itemsSummary = items.map(it => {
              const q = it.quantity || it.qty || 1;
              const title = it.productTitle || it.title || it.name || '';
              const price = it.price || it.priceAtTime || 0;
              total += (q * price);
              return `${title} x ${q}`;
            }).join(', ');
          }
        }
      } catch (_) {}

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${o.id ?? ''}</td>
        <td>${(o.firstName || '') + ' ' + (o.lastName || '')}</td>
        <td>${o.email || ''}<br/><span class="muted">${o.phone || ''}</span></td>
        <td>₹ ${fmt(total)}</td>
        <td><span class="chip">${o.status || ''}</span></td>
        <td>${o.createdAt || ''}</td>
        <td style="max-width:260px; white-space:normal;">${itemsSummary || '<span class="muted">(no items)</span>'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function loadOrders() {
    const tbody = document.getElementById('ordersTbody');
    if (!tbody) return;
    try {
      const res = await fetch(`${API_BASE.replace('/api','')}/api/orders`);
      if (!res.ok) {
        tbody.innerHTML = '<tr><td colspan="7">Failed to load orders</td></tr>';
        return;
      }
      ordersCache = await res.json();
      const q = document.getElementById('ordersSearch')?.value.trim().toLowerCase() || '';
      const filtered = q
        ? ordersCache.filter(o => {
            const name = ((o.firstName || '') + ' ' + (o.lastName || '')).toLowerCase();
            return name.includes(q) || (o.email || '').toLowerCase().includes(q) || (o.phone || '').toLowerCase().includes(q);
          })
        : ordersCache;
      renderOrders(filtered);
    } catch (e) {
      console.error('Failed to load orders', e);
      tbody.innerHTML = '<tr><td colspan="7">Error loading orders</td></tr>';
    }
  }

  function setupTopbar() {
    const back = document.getElementById('backToSite');
    if (back) back.addEventListener('click', () => { window.location.href = 'index.html'; });
    const logout = document.getElementById('logoutBtn');
    if (logout) logout.addEventListener('click', () => { try { authManager.logout(); } catch (_) { window.location.href = 'index.html'; } });
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    injectExtraFields();
    setupTopbar();
    setupNav();
    setupProducts();
    // Orders
    const ordersSearch = document.getElementById('ordersSearch');
    if (ordersSearch) ordersSearch.addEventListener('input', loadOrders);
    const refreshOrders = document.getElementById('refreshOrders');
    if (refreshOrders) refreshOrders.addEventListener('click', loadOrders);
    await loadDashboard();
    // Preload products for the dashboard counts
    await loadProducts();
  });

  // --- Metadata helpers and dynamic field injection ---
  function parseMeta(desc) {
    if (!desc) return {};
    const m = String(desc).match(/<!--META:(\{[\s\S]*?\})-->/);
    if (!m) return {};
    try { return JSON.parse(m[1]); } catch { return {}; }
  }
  function stripMeta(desc) {
    if (!desc) return '';
    return String(desc).replace(/<!--META:(\{[\s\S]*?\})-->/, '').trim();
  }
  function valueOrNull(v) {
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }
  function injectExtraFields() {
    const form = document.getElementById('productForm');
    if (!form) return;
    const container = form.querySelector('div');
    if (!container) return;
    // Avoid duplicate injection
    if (document.getElementById('p_type')) return;
    const block = document.createElement('div');
    block.style.display = 'grid';
    block.style.gridTemplateColumns = '1fr 1fr';
    block.style.gap = '10px';
    block.innerHTML = `
      <div>
        <label class="muted">Product Type</label>
        <select id="p_type">
          <option value="">Select type</option>
          <option value="shirts">shirts</option>
          <option value="tshirts">tshirts</option>
          <option value="jeans">jeans</option>
          <option value="shorts">shorts</option>
          <option value="jackets">jackets</option>
        </select>
      </div>
      <div></div>`;
    // Insert after description field (which is second child group)
    const groups = container.querySelectorAll(':scope > div');
    if (groups.length >= 2) {
      groups[1].after(block);
    } else {
      container.appendChild(block);
    }

    // Category multi-select (display locations)
    const categoryRow = container.querySelector('#p_category')?.parentElement;
    if (categoryRow) {
      categoryRow.style.display = 'none';
      const cats = document.createElement('div');
      cats.id = 'p_categories_wrapper';
      cats.innerHTML = `
        <label class="muted">Show In (select multiple)</label>
        <div id="p_categories" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:6px;">
          ${['shop','index1','index2','shirts','tshirts','jeans','jackets','shorts'].map(c => `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;">
              <input type="checkbox" value="${c}"> <span>${c}</span>
            </label>`).join('')}
        </div>`;
      // place after the hidden categoryRow
      categoryRow.after(cats);
    }

    // Original Price and extra images block
    const block2 = document.createElement('div');
    block2.innerHTML = `
      <div style="margin-top:4px;">
        <label class="muted">Original Price (MRP)</label>
        <input id="p_originalPrice" type="number" step="0.01" />
      </div>
      <div style="margin-top:4px;">
        <label class="muted">Extra Images (CSV)</label>
        <input id="p_images" type="text" placeholder="optional: img/one.png,img/two.png" />
      </div>`;
    // Append before actions
    const actions = container.querySelector('.actions');
    if (actions) actions.before(block2); else container.appendChild(block2);
    // Update label for price field to Offer Price
    const priceLabel = container.querySelector('label[for="p_price"], label + input#p_price');
    const priceWrapper = document.getElementById('p_price')?.parentElement;
    if (priceWrapper) {
      const lab = priceWrapper.querySelector('label');
      if (lab) lab.textContent = 'Offer Price';
    }

    // Image upload functionality removed - Spring backend handles image uploads
  }

  // Gallery functionality removed - now using file manager

  function getSelectedCategoriesCSV() {
    const wrap = document.getElementById('p_categories');
    if (!wrap) return '';
    const vals = Array.from(wrap.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value.trim()).filter(Boolean);
    return vals.join(',');
  }

  function setSelectedCategories(csv) {
    const wrap = document.getElementById('p_categories');
    if (!wrap) return;
    const set = new Set(String(csv).split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
    wrap.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = set.has(cb.value.toLowerCase());
    });
  }

  // Image upload function removed - reverting to Spring backend
})();
