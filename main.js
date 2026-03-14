/**
 * Navigator — Apple-Style Navigation Site
 * main.js
 */

'use strict';

// ─── State ──────────────────────────────────────────────
const state = {
  data: null,
  theme: localStorage.getItem('theme') || 'auto',
  searchQuery: '',
  activeCategory: 'all',
  sidebarOpen: false,
  modalOpen: false,
  pendingLink: null, // URL to visit after modal close
};

// ─── DOM Refs ────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const DOM = {
  body: document.body,
  themeToggle: $('#themeToggle'),
  hamburger: $('#hamburger'),
  sidebar: $('#sidebar'),
  sidebarOverlay: $('#sidebarOverlay'),
  sidebarNav: $('#sidebarNav'),
  searchInput: $('#searchInput'),
  searchClear: $('#searchClear'),
  mainContent: $('#mainContent'),
  categoriesContainer: $('#categoriesContainer'),
  searchResults: $('#searchResults'),
  scrollTopBtn: $('#scrollTop'),
  heroTitle: $('#heroTitle'),
  heroSub: $('#heroSub'),
  // Modal elements
  modal: $('#wechatModal'),
  modalClose: $('#modalClose'),
  modalConfirm: $('#modalConfirm'),
  modalLink: $('#modalLink'),
  qrCode: $('#qrCode'),
};

// ─── Fetch Nav Data ───────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch('./assets/nav.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.data = await res.json();
    initSite();
  } catch (err) {
    console.error('Failed to load nav.json:', err);
    showError();
  }
}

function showError() {
  DOM.categoriesContainer.innerHTML = `
    <div class="search-empty">
      <div class="search-empty-icon">⚠️</div>
      <h3>加载失败</h3>
      <p>无法加载 assets/nav.json，请检查文件是否存在。</p>
    </div>`;
  DOM.categoriesContainer.style.display = 'block';
}

// ─── Init ─────────────────────────────────────────────────
function initSite() {
  const { site, categories } = state.data;

  // Apply title
  document.title = site.title;
  if (DOM.heroTitle) {
    DOM.heroTitle.innerHTML = `欢迎来到 <span>${site.title}</span>`;
  }
  if (DOM.heroSub) DOM.heroSub.textContent = site.subtitle;

  // Update logo
  const logoIcon = $('.logo-icon');
  if (logoIcon) logoIcon.textContent = site.logo;
  const logoText = $('.logo-text');
  if (logoText) logoText.textContent = site.title;

  buildSidebar(categories);
  buildCategories(categories);
}

// ─── Build Sidebar ────────────────────────────────────────
function buildSidebar(categories) {
  const allCount = categories.reduce((n, c) => n + c.links.length, 0);

  const allItem = buildSidebarItem({ id: 'all', name: '全部', icon: '🏠', count: allCount }, true);
  DOM.sidebarNav.innerHTML = '';
  DOM.sidebarNav.appendChild(allItem);

  categories.forEach((cat) => {
    const item = buildSidebarItem({ id: cat.id, name: cat.name, icon: cat.icon, count: cat.links.length });
    DOM.sidebarNav.appendChild(item);
  });
}

function buildSidebarItem({ id, name, icon, count }, isActive = false) {
  const li = document.createElement('li');
  li.className = `sidebar-item${isActive ? ' active' : ''}`;
  li.dataset.id = id;
  li.innerHTML = `
    <span class="sidebar-item-icon">${icon}</span>
    <span>${name}</span>
    <span class="sidebar-item-count">${count}</span>`;
  li.addEventListener('click', () => {
    selectCategory(id);
    closeSidebar();
  });
  return li;
}

// ─── Select Category ──────────────────────────────────────
function selectCategory(id) {
  state.activeCategory = id;

  // Clear search
  clearSearch();

  // Update sidebar active state
  $$('.sidebar-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Show/hide sections
  $$('.category-section').forEach((sec) => {
    if (id === 'all') {
      sec.style.display = '';
    } else {
      sec.style.display = sec.dataset.id === id ? '' : 'none';
    }
  });

  // Scroll to top of main
  DOM.mainContent.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Build Category Sections ─────────────────────────────
function buildCategories(categories) {
  // Remove skeleton
  $$('.skeleton-grid').forEach((el) => el.remove());

  categories.forEach((cat, ci) => {
    const section = document.createElement('section');
    section.className = 'category-section';
    section.id = `cat-${cat.id}`;
    section.dataset.id = cat.id;
    section.style.animationDelay = `${ci * 0.06}s`;

    section.innerHTML = `
      <div class="category-header">
        <div class="category-icon-wrap" style="background:${cat.color}22;">
          <span style="font-size:18px">${cat.icon}</span>
        </div>
        <h2 class="category-name">${cat.name}</h2>
        <span class="category-count">${cat.links.length} 个链接</span>
      </div>
      <div class="links-grid" id="grid-${cat.id}"></div>`;

    const grid = section.querySelector(`#grid-${cat.id}`);
    cat.links.forEach((link, li) => {
      const card = buildLinkCard(link, cat.color, li);
      grid.appendChild(card);
    });

    DOM.categoriesContainer.appendChild(section);
  });

  DOM.categoriesContainer.style.display = 'block';
}

function buildLinkCard(link, catColor, idx) {
  const a = document.createElement('a');
  a.className = 'link-card';
  // Check if this link should show modal
  const showModal = link.showModal === true;
  if (!showModal) {
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  a.style.animationDelay = `${idx * 0.04}s`;
  a.setAttribute('aria-label', `${link.name} - ${link.desc}`);

  // Subtle category color accent on hover via CSS variable
  a.style.setProperty('--cat-color', catColor);

  a.innerHTML = `
    <span class="card-emoji">${link.icon}</span>
    <div class="card-name">${escapeHtml(link.name)}</div>
    <div class="card-desc">${escapeHtml(link.desc)}</div>
    <div class="card-arrow">前往访问 →</div>`;

  // Add modal event listener if needed
  if (showModal) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showWechatModal(link.url);
    });
    a.style.cursor = 'pointer';
  }

  return a;
}

// ─── Search ───────────────────────────────────────────────
let searchTimer = null;

function handleSearch(query) {
  state.searchQuery = query.trim().toLowerCase();

  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (!state.searchQuery) {
      clearSearch();
    } else {
      performSearch(state.searchQuery);
    }
  }, 150);
}

function performSearch(query) {
  const { categories } = state.data;

  let results = [];
  categories.forEach((cat) => {
    cat.links.forEach((link) => {
      const haystack = `${link.name} ${link.desc} ${cat.name}`.toLowerCase();
      if (haystack.includes(query)) {
        results.push({ ...link, catName: cat.name, catColor: cat.color });
      }
    });
  });

  // Show search results panel
  DOM.categoriesContainer.style.display = 'none';
  DOM.searchResults.classList.add('visible');

  DOM.searchResults.innerHTML = `
    <p class="search-result-count">
      找到 <strong>${results.length}</strong> 个与 "<strong>${escapeHtml(query)}</strong>" 相关的结果
    </p>
    ${
      results.length
        ? `<div class="links-grid">${results.map((r, i) => buildSearchCard(r, query, i).outerHTML).join('')}</div>`
        : `<div class="search-empty">
            <div class="search-empty-icon">🔍</div>
            <h3>未找到结果</h3>
            <p>试试其他关键词吧～</p>
           </div>`
    }`;
}

function buildSearchCard(link, query, idx) {
  const a = document.createElement('a');
  a.className = 'link-card';
  // Check if this link should show modal
  const showModal = link.showModal === true;
  if (!showModal) {
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  a.style.animationDelay = `${idx * 0.03}s`;

  const highlightName = highlight(link.name, query);
  const highlightDesc = highlight(link.desc, query);

  a.innerHTML = `
    <span class="card-emoji">${link.icon}</span>
    <div class="card-name">${highlightName}</div>
    <div class="card-desc">${highlightDesc}</div>
    <div class="card-arrow" style="color:${link.catColor}">${link.catName} →</div>`;

  // Add modal event listener if needed
  if (showModal) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showWechatModal(link.url);
    });
    a.style.cursor = 'pointer';
  }

  return a;
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const re = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function clearSearch() {
  state.searchQuery = '';
  DOM.searchInput.value = '';
  DOM.searchClear.classList.remove('visible');
  DOM.searchResults.classList.remove('visible');
  DOM.searchResults.innerHTML = '';
  DOM.categoriesContainer.style.display = 'block';
}

// ─── WeChat Modal ─────────────────────────────────────────
function showWechatModal(url) {
  state.modalOpen = true;
  state.pendingLink = url;
  
  // Update modal link
  DOM.modalLink.href = url;
  
  // Add active class
  DOM.modal.classList.add('active');
  DOM.body.style.overflow = 'hidden';
}

function closeWechatModal() {
  state.modalOpen = false;
  state.pendingLink = null;
  
  DOM.modal.classList.remove('active');
  DOM.body.style.overflow = '';
}

function proceedToLink() {
  if (state.pendingLink) {
    window.open(state.pendingLink, '_blank', 'noopener,noreferrer');
  }
  closeWechatModal();
}

// ─── Theme ────────────────────────────────────────────────
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);

  if (theme === 'auto') {
    DOM.body.removeAttribute('data-theme');
  } else {
    DOM.body.setAttribute('data-theme', theme);
  }

  // Update icon
  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (DOM.themeToggle) DOM.themeToggle.textContent = isDark ? '☀️' : '🌙';
}

function toggleTheme() {
  const isDark =
    state.theme === 'dark' ||
    (state.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  applyTheme(isDark ? 'light' : 'dark');
}

// ─── Sidebar (Mobile) ─────────────────────────────────────
function openSidebar() {
  state.sidebarOpen = true;
  DOM.sidebar.classList.add('open');
  DOM.sidebarOverlay.classList.add('visible');
  DOM.hamburger.classList.add('active');
  DOM.body.style.overflow = 'hidden';
}

function closeSidebar() {
  state.sidebarOpen = false;
  DOM.sidebar.classList.remove('open');
  DOM.sidebarOverlay.classList.remove('visible');
  DOM.hamburger.classList.remove('active');
  DOM.body.style.overflow = '';
}

function toggleSidebar() {
  state.sidebarOpen ? closeSidebar() : openSidebar();
}

// ─── Scroll to Top ────────────────────────────────────────
function handleScroll() {
  const y = window.scrollY || window.pageYOffset;
  DOM.scrollTopBtn.classList.toggle('visible', y > 300);
}

// ─── Utils ────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Event Listeners ─────────────────────────────────────
function bindEvents() {
  // Theme toggle
  if (DOM.themeToggle) {
    DOM.themeToggle.addEventListener('click', toggleTheme);
  }

  // Hamburger
  if (DOM.hamburger) {
    DOM.hamburger.addEventListener('click', toggleSidebar);
  }

  // Overlay click to close sidebar
  if (DOM.sidebarOverlay) {
    DOM.sidebarOverlay.addEventListener('click', closeSidebar);
  }

  // Search input
  if (DOM.searchInput) {
    DOM.searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      DOM.searchClear.classList.toggle('visible', val.length > 0);
      handleSearch(val);
    });

    DOM.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearSearch();
        DOM.searchInput.blur();
      }
    });
  }

  // Search clear
  if (DOM.searchClear) {
    DOM.searchClear.addEventListener('click', () => {
      clearSearch();
      DOM.searchInput.focus();
    });
  }

  // Scroll to top
  if (DOM.scrollTopBtn) {
    DOM.scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Scroll event
  window.addEventListener('scroll', handleScroll, { passive: true });

  // System theme change
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'auto') applyTheme('auto');
  });

  // Keyboard shortcut: Cmd/Ctrl + K to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      DOM.searchInput?.focus();
    }
  });

  // Modal events
  if (DOM.modalClose) {
    DOM.modalClose.addEventListener('click', closeWechatModal);
  }

  if (DOM.modalConfirm) {
    DOM.modalConfirm.addEventListener('click', proceedToLink);
  }

  if (DOM.modal) {
    DOM.modal.addEventListener('click', (e) => {
      // Close when clicking overlay
      if (e.target === DOM.modal) {
        closeWechatModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.modalOpen) {
      closeWechatModal();
    }
  });
}

// ─── Bootstrap ───────────────────────────────────────────
function bootstrap() {
  applyTheme(state.theme);
  bindEvents();
  loadData();
}

document.addEventListener('DOMContentLoaded', bootstrap);
