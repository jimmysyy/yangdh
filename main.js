/**
 * Navigator — js/main.js
 * 数据通过 fetch 从 assets/nav.json 加载
 * 需要在 HTTP 服务器下运行（VS Code Live Server / 任意静态服务器均可）
 */

'use strict';

/* ══════════════════════════════════════
   状态
══════════════════════════════════════ */
const S = {
  data:        null,
  theme:       localStorage.getItem('nav-theme') || 'auto',
  searchQ:     '',
  activeCat:   'all',
  sidebarOpen: false,
};

/* ══════════════════════════════════════
   DOM 工具
══════════════════════════════════════ */
const $  = id  => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function hi(text, q) {
  return esc(text).replace(new RegExp(`(${escRe(q)})`, 'gi'), '<mark>$1</mark>');
}

/* ══════════════════════════════════════
   数据加载
══════════════════════════════════════ */
async function loadData() {
  try {
    const res = await fetch('./assets/nav.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    S.data = await res.json();
    initSite();
  } catch (err) {
    console.error('[Navigator] 数据加载失败:', err);
    showError();
  }
}

function showError() {
  $$('.skeleton-grid').forEach(el => el.remove());
  $('catContainer').innerHTML = `
    <div class="search-empty">
      <div class="search-empty-icon">⚠️</div>
      <h3>数据加载失败</h3>
      <p>请确保在 HTTP 服务器下运行，且 <code>assets/nav.json</code> 文件存在。</p>
    </div>`;
}

/* ══════════════════════════════════════
   初始化页面
══════════════════════════════════════ */
function initSite() {
  const { site, categories } = S.data;

  document.title               = site.title;
  $('heroTitle').innerHTML     = `欢迎来到 <span>${esc(site.title)}</span>`;
  $('heroSub').textContent     = site.subtitle;
  $('logoIcon').textContent    = site.logo;
  $('logoText').textContent    = site.title;

  buildSidebar(categories);
  buildCategories(categories);
}

/* ══════════════════════════════════════
   侧边栏
══════════════════════════════════════ */
function buildSidebar(cats) {
  const nav   = $('sidebarNav');
  const total = cats.reduce((n, c) => n + c.links.length, 0);
  nav.innerHTML = '';

  [{ id: 'all', name: '全部', icon: '🏠', count: total },
   ...cats.map(c => ({ id: c.id, name: c.name, icon: c.icon, count: c.links.length }))]
    .forEach((item, i) => {
      const li = document.createElement('li');
      li.className   = 'sidebar-item' + (i === 0 ? ' active' : '');
      li.dataset.id  = item.id;
      li.innerHTML   = `
        <span class="sidebar-item-icon">${item.icon}</span>
        <span>${esc(item.name)}</span>
        <span class="sidebar-item-count">${item.count}</span>`;
      li.addEventListener('click', () => { selectCat(item.id); closeSidebar(); });
      nav.appendChild(li);
    });
}

function selectCat(id) {
  S.activeCat = id;
  clearSearch();
  $$('.sidebar-item').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  $$('.cat-section').forEach(el => {
    el.style.display = (id === 'all' || el.dataset.id === id) ? '' : 'none';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ══════════════════════════════════════
   分类 & 卡片
══════════════════════════════════════ */
function buildCategories(cats) {
  $$('.skeleton-grid').forEach(el => el.remove());
  const cont = $('catContainer');

  cats.forEach((cat, ci) => {
    const sec      = document.createElement('section');
    sec.className  = 'cat-section';
    sec.dataset.id = cat.id;
    sec.style.animationDelay = `${ci * .07}s`;
    sec.innerHTML  = `
      <div class="cat-header">
        <div class="cat-icon-wrap" style="background:${cat.color}22;">${cat.icon}</div>
        <h2 class="cat-name">${esc(cat.name)}</h2>
        <span class="cat-count">${cat.links.length} 个链接</span>
      </div>
      <div class="links-grid" id="g-${cat.id}"></div>`;

    const grid = sec.querySelector(`#g-${cat.id}`);
    cat.links.forEach((link, li) => {
      const a         = document.createElement('a');
      a.className     = 'link-card';
      a.target        = '_blank';
      a.rel           = 'noopener noreferrer';
      a.style.animationDelay = `${li * .04}s`;
      a.setAttribute('aria-label', `${link.name} — ${link.desc}`);
      a.innerHTML     = `
        <span class="card-emoji">${link.icon}</span>
        <div class="card-name">${esc(link.name)}</div>
        <div class="card-desc">${esc(link.desc)}</div>
        <div class="card-arrow">前往访问 →</div>`;
      
      // 如果有 showModal 标志，阻止默认跳转并打开弹窗
      if (link.showModal) {
        a.href = 'javascript:void(0)';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          openModal(link.name, link.url);
        });
      } else {
        a.href = link.url;
      }
      
      grid.appendChild(a);
    });

    cont.appendChild(sec);
  });
}

/* ══════════════════════════════════════
   搜索
══════════════════════════════════════ */
let searchTimer = null;

function handleSearch(q) {
  S.searchQ = q.trim().toLowerCase();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => S.searchQ ? doSearch(S.searchQ) : clearSearch(), 150);
}

function doSearch(q) {
  const results = [];
  S.data.categories.forEach(cat =>
    cat.links.forEach(link => {
      if (`${link.name} ${link.desc} ${cat.name}`.toLowerCase().includes(q))
        results.push({ ...link, catName: cat.name, catColor: cat.color });
    })
  );

  $('catContainer').style.display = 'none';
  const el = $('searchResults');
  el.classList.add('on');

  if (!results.length) {
    el.innerHTML = `
      <p class="result-count">搜索 "<strong>${esc(q)}</strong>"</p>
      <div class="search-empty">
        <div class="search-empty-icon">🔍</div>
        <h3>未找到结果</h3><p>试试其他关键词吧～</p>
      </div>`;
    return;
  }

  el.innerHTML = `
    <p class="result-count">找到 <strong>${results.length}</strong> 个与
      "<strong>${esc(q)}</strong>" 相关的结果</p>
    <div id="searchGrid" class="links-grid">
      ${results.map((r, i) => `
        <a class="link-card search-result-card" data-index="${i}"
           style="animation-delay:${i * .03}s">
          <span class="card-emoji">${r.icon}</span>
          <div class="card-name">${hi(r.name, q)}</div>
          <div class="card-desc">${hi(r.desc, q)}</div>
          <div class="card-arrow" style="color:${r.catColor}">${esc(r.catName)} →</div>
        </a>`).join('')}
    </div>`;
  
  // 为搜索结果链接添加事件
  $$('.search-result-card').forEach(el => {
    const idx = parseInt(el.getAttribute('data-index'));
    const result = results[idx];
    el.href = result.showModal ? 'javascript:void(0)' : result.url;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (result.showModal) {
        openModal(result.name, result.url);
      } else {
        window.open(result.url, '_blank');
      }
    });
  });
}

function clearSearch() {
  S.searchQ = '';
  const inp = $('searchInput');
  if (inp) inp.value = '';
  $('searchClear').classList.remove('on');
  const sr = $('searchResults');
  sr.classList.remove('on');
  sr.innerHTML = '';
  $('catContainer').style.display = 'block';
}

/* ══════════════════════════════════════
   主题
══════════════════════════════════════ */
function applyTheme(t) {
  S.theme = t;
  localStorage.setItem('nav-theme', t);
  t === 'auto'
    ? document.documentElement.removeAttribute('data-theme')
    : document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' ||
    (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('themeToggle').textContent = dark ? '☀️' : '🌙';
}

function toggleTheme() {
  const dark = S.theme === 'dark' ||
    (S.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(dark ? 'light' : 'dark');
}

/* ══════════════════════════════════════
   侧边栏（移动端）
══════════════════════════════════════ */
function openSidebar() {
  S.sidebarOpen = true;
  $('sidebar').classList.add('on');
  $('overlay').classList.add('on');
  $('hamburger').classList.add('on');
  $('hamburger').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  S.sidebarOpen = false;
  $('sidebar').classList.remove('on');
  $('overlay').classList.remove('on');
  $('hamburger').classList.remove('on');
  $('hamburger').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════
   弹窗
══════════════════════════════════════ */
function openModal(linkName, linkUrl) {
  const config = S.data.wechatConfig || {};
  
  // 填充弹窗内容
  $('modalTitle').textContent = config.title || '订阅公众号';
  $('modalDesc').textContent = config.description || '关注我们的公众号';
  
  // 设置二维码
  const qrContainer = $('modalQRCode');
  if (config.qrCode) {
    qrContainer.innerHTML = `<img src="${esc(config.qrCode)}" alt="公众号二维码">`;
  } else {
    qrContainer.innerHTML = '<p>暂无二维码</p>';
  }
  
  // 设置额外信息
  const infoContainer = $('modalInfo');
  infoContainer.innerHTML = '';
  if (config.wechatId) {
    infoContainer.innerHTML += `<p><strong>微信号：</strong> ${esc(config.wechatId)}</p>`;
  }
  if (config.extra) {
    infoContainer.innerHTML += `<p>${esc(config.extra)}</p>`;
  }
  
  // 设置按钮
  $('modalGo').onclick = () => { window.open(linkUrl, '_blank'); closeModal(); };
  
  // 显示弹窗
  $('modalOverlay').classList.add('show');
  $('modal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  $('modalOverlay').classList.remove('show');
  $('modal').classList.remove('show');
  document.body.style.overflow = '';
}


/* ══════════════════════════════════════
   事件绑定
══════════════════════════════════════ */
function bindEvents() {
  /* 主题 */
  $('themeToggle').addEventListener('click', toggleTheme);

  /* 汉堡 */
  $('hamburger').addEventListener('click', () =>
    S.sidebarOpen ? closeSidebar() : openSidebar());

  /* 遮罩 */
  $('overlay').addEventListener('click', closeSidebar);

  /* 搜索输入 */
  const inp = $('searchInput');
  inp.addEventListener('input', e => {
    $('searchClear').classList.toggle('on', e.target.value.length > 0);
    handleSearch(e.target.value);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Escape') { clearSearch(); inp.blur(); }
  });

  /* 清空搜索 */
  $('searchClear').addEventListener('click', () => { clearSearch(); inp.focus(); });

  /* 返回顶部 */
  const topBtn = $('scrollTop');
  topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', () =>
    topBtn.classList.toggle('on', window.scrollY > 280), { passive: true });

  /* 系统主题变化 */
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (S.theme === 'auto') applyTheme('auto');
  });

  /* ⌘K 快捷键 */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inp.focus(); }
  });

  /* 弹窗事件 */
  $('modalClose').addEventListener('click', closeModal);
  $('modalSkip').addEventListener('click', closeModal);
  $('modalOverlay').addEventListener('click', closeModal);
  
  // ESC 键关闭弹窗
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('modal').classList.contains('show')) closeModal();
  });
}

/* ══════════════════════════════════════
   启动
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(S.theme);
  bindEvents();
  loadData();
});
