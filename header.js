'use strict';
(function () {
  const BRAND_HTML = `
    <div class="rf-header">
      <div class="rf-header__left">
        <a href="index.html" class="rf-header__logo">
          <img src="img/logo1.png" alt="RAW FADE" />
        </a>
        <div class="rf-header__brand">
          <div class="rf-header__brand-line1">RAW FADE</div>
          <div class="rf-header__brand-line2">Clothing &amp; co</div>
        </div>
      </div>
      <div class="rf-header__right">
        <button class="rf-header__icon" id="rfNotifyBtn" title="Notifications" aria-label="Notifications">
          <i class="fa-solid fa-bullhorn" aria-hidden="true"></i>
        </button>
        <div class="rf-header__profile">
          <button class="rf-header__icon" id="rfUserBtn" aria-haspopup="true" aria-expanded="false" aria-label="Account">
            <i class="fa-solid fa-user" aria-hidden="true"></i>
          </button>
          <div class="rf-header__menu" id="rfUserMenu" role="menu" aria-hidden="true">
            <a role="menuitem" href="login.html" id="rfLoginLink">login/sign</a>
            <a role="menuitem" href="my-orders.html">my orders</a>
            <a role="menuitem" href="my-address.html">my address</a>
            <a role="menuitem" href="shop.html">shop</a>
            <a role="menuitem" href="shirts.html">shirts</a>
            <a role="menuitem" href="tshirts.html">tshirts</a>
            <a role="menuitem" href="jeans.html">jeans</a>
            <a role="menuitem" href="shorts.html">shorts</a>
            <a role="menuitem" href="jackets.html">jackets</a>
            <a role="menuitem" href="cart.html">cart</a>
          </div>
        </div>
      </div>
    </div>`;

  const STYLE = `
    .rf-header{height:64px;background:#000;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.1);position:sticky;top:0;z-index:1000}
    .rf-header__left{display:flex;align-items:center;gap:12px}
    .rf-header__logo img{height:46px;width:auto;display:block}
    .rf-header__brand{line-height:1}
    .rf-header__brand-line1{color:#fff;font-weight:800;letter-spacing:.5px}
    .rf-header__brand-line2{color:#bbb;font-size:12px}
    .rf-header__right{display:flex;align-items:center;gap:10px}
    .rf-header__icon{background:transparent;border:1px solid rgba(255,255,255,.25);color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer}
    .rf-header__icon:hover{background:#111}
    .rf-header__profile{position:relative}
    .rf-header__menu{position:absolute;right:0;top:44px;background:#000;border:1px solid rgba(255,255,255,.2);border-radius:6px;min-width:160px;display:none;flex-direction:column;box-shadow:0 10px 24px rgba(0,0,0,.4);padding:6px}
    .rf-header__menu a{color:#fff;text-decoration:none;padding:8px 10px;border-radius:4px;font-size:14px;display:block}
    .rf-header__menu a:hover{background:#111}
    @media(max-width:600px){.rf-header{height:56px;padding:0 10px}.rf-header__logo img{height:40px}.rf-header__brand-line1{font-size:14px}.rf-header__brand-line2{font-size:11px}}
  `;

  function ensureStyle() {
    if (!document.getElementById('rfHeaderStyle')) {
      const s = document.createElement('style');
      s.id = 'rfHeaderStyle';
      s.textContent = STYLE;
      document.head.appendChild(s);
    }
  }

  function renderHeader() {
    let header = document.getElementById('header') || document.querySelector('section#header');
    if (!header) {
      header = document.createElement('header');
      header.id = 'header';
      document.body.prepend(header);
    }
    header.innerHTML = BRAND_HTML;
  }

  function wireInteractions() {
    const userBtn = document.getElementById('rfUserBtn');
    const menu = document.getElementById('rfUserMenu');
    if (userBtn && menu) {
      const toggle = (show) => {
        const visible = show ?? (menu.style.display !== 'block');
        menu.style.display = visible ? 'block' : 'none';
        userBtn.setAttribute('aria-expanded', visible ? 'true' : 'false');
        menu.setAttribute('aria-hidden', visible ? 'false' : 'true');
      };
      userBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); });
      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== userBtn) menu.style.display = 'none';
      });
    }

    // Notifications placeholder
    const notifyBtn = document.getElementById('rfNotifyBtn');
    if (notifyBtn) {
      notifyBtn.addEventListener('click', () => alert('No new notifications'));
    }

    // Auth-aware login link text
    try {
      if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
        const u = authManager.getCurrentUser();
        const loginLink = document.getElementById('rfLoginLink');
        if (loginLink && u) {
          loginLink.textContent = u.username || 'account';
          loginLink.href = 'account.html';
        }
      }
    } catch {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureStyle();
    renderHeader();
    wireInteractions();
  });
})();
