"use strict";
const PERF = {
  navigationStart: (() => {
    if (performance.timing?.navigationStart) {
      return performance.timing.navigationStart;
    }
    const nav = performance.getEntriesByType("navigation")[0];
    return nav?.fetchStart || Date.now();
  })(),
  start: performance.now(),
  domContentLoaded: null,
  dataLoaded: null,
  completed: null,
};
const S = {
  data: null,
  theme: localStorage.getItem("nav-theme") || "auto",
  searchQ: "",
  activeCat: "all",
  sidebarOpen: false,
};
const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hi(text, q) {
  return esc(text).replace(
    new RegExp(`(${escRe(q)})`, "gi"),
    "<mark>$1</mark>",
  );
}
async function loadData() {
  try {
    if (window.NAV_DATA) {
      S.data = window.NAV_DATA;
      PERF.dataLoaded = performance.now();
    } else {
      const res = await fetch("./assets/nav.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      S.data = await res.json();
      PERF.dataLoaded = performance.now();
    }
    initSite();
    showLoadTime();
  } catch (err) {
    console.error("[Navigator] 数据加载失败:", err);
    showError();
  }
}
function showError() {
  $$(".skeleton-grid").forEach((el) => el.remove());
  $("catContainer").innerHTML =
    ` <div class="search-empty"> <div class="search-empty-icon">⚠️</div> <h3>数据加载失败</h3> <p>请确保在 HTTP 服务器下运行，且 <code>assets/nav.json</code> 文件存在。</p> </div>`;
}
function initSite() {
  const { site, categories } = S.data;
  document.title = site.title;
  $("heroTitle").innerHTML = `欢迎来到 <span>${esc(site.title)}</span>`;
  $("heroSub").textContent = site.subtitle;
  $("logoIcon").textContent = site.logo;
  $("logoText").textContent = site.title;
  const footerInfo = $("footerInfo");
  if (site.footer) {
    footerInfo.innerHTML = site.footer;
  } else {
    footerInfo.innerHTML = `由 <strong>${esc(site.title)}</strong> 强力驱动`;
  }
  buildSidebar(categories);
  buildCategories(categories);
  selectCat("all");
  checkNotifications();
}
function buildSidebar(cats) {
  const nav = $("sidebarNav");
  const total = cats.reduce((n, c) => n + c.links.length, 0);
  nav.innerHTML = "";
  [
    { id: "all", name: "全部", icon: "🏠", count: total },
    ...cats.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      count: c.links.length,
      password: c.password,
    })),
  ].forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "sidebar-item" + (i === 0 ? " active" : "");
    li.dataset.id = item.id;
    const isVerified = item.password
      ? JSON.parse(localStorage.getItem("nav-verified-cats") || "[]").includes(
          item.id,
        )
      : true;
    const lockIcon = item.password && !isVerified ? " 🔒" : "";
    li.innerHTML = ` <span class="sidebar-item-icon">${item.icon}</span> <span>${esc(item.name)}${lockIcon}</span> <span class="sidebar-item-count">${item.count}</span>`;
    li.addEventListener("click", () => {
      selectCat(item.id);
      closeSidebar();
    });
    nav.appendChild(li);
  });
}
function selectCat(id) {
  if (id !== "all") {
    const cat = S.data.categories.find((c) => c.id === id);
    if (cat && cat.password) {
      const verifiedCats = JSON.parse(
        localStorage.getItem("nav-verified-cats") || "[]",
      );
      if (!verifiedCats.includes(id)) {
        openPasswordModal(id);
        return;
      }
    }
  }
  S.activeCat = id;
  clearSearch();
  $$(".sidebar-item").forEach((el) =>
    el.classList.toggle("active", el.dataset.id === id),
  );
  $$(".cat-section").forEach((el) => {
    el.style.display = id === "all" || el.dataset.id === id ? "" : "none";
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function showLoadTime() {
  const loadEl = $("loadTime");
  if (!loadEl) return;
  const totalTime = Math.round(PERF.dataLoaded - PERF.navigationStart);
  const minutes = Math.floor(totalTime / 60000);
  const seconds = Math.floor((totalTime % 60000) / 1000);
  const ms = totalTime % 1000;
  let timeStr = "";
  if (minutes > 0) {
    timeStr = `${minutes}m ${seconds}s`;
  } else if (seconds > 0) {
    timeStr = `${seconds}s ${ms}ms`;
  } else {
    timeStr = `${ms}ms`;
  }
  let speed = "";
  if (totalTime < 800) speed = "super-fast";
  else if (totalTime < 1500) speed = "fast";
  else if (totalTime < 2500) speed = "normal";
  else if (totalTime < 4000) speed = "slow";
  else speed = "very-slow";
  loadEl.className = `load-time ${speed}`;
  loadEl.innerHTML = `⚡ ${timeStr}`;
}
function buildCategories(cats) {
  $$(".skeleton-grid").forEach((el) => el.remove());
  const cont = $("catContainer");
  cats.forEach((cat, ci) => {
    const needsPassword = cat.password;
    const verifiedCats = JSON.parse(
      localStorage.getItem("nav-verified-cats") || "[]",
    );
    const isVerified = verifiedCats.includes(cat.id);
    const isLocked = needsPassword && !isVerified;
    const sec = document.createElement("section");
    sec.className = "cat-section";
    sec.dataset.id = cat.id;
    sec.style.animationDelay = `${ci * 0.07}s`;
    sec.innerHTML = ` <div class="cat-header"> <div class="cat-icon-wrap" style="background:${cat.color}22;">${cat.icon}</div> <h2 class="cat-name">${esc(cat.name)}</h2> <span class="cat-count">${isLocked ? "🔒 已加密" : cat.links.length + " 个链接"}</span> </div> <div class="links-grid" id="g-${cat.id}"></div>`;
    const grid = sec.querySelector(`#g-${cat.id}`);
    if (isLocked) {
      const lockedCard = document.createElement("div");
      lockedCard.className = "link-card password-locked-card";
      lockedCard.innerHTML = ` <div style="text-align: center;padding: 20px;"> <div style="font-size: 48px;margin-bottom: 10px;">🔐</div> <div class="card-name" style="margin-bottom: 8px;">此分类已加密</div> <div class="card-desc" style="margin-bottom: 12px;font-size: 13px;">需要密码才能查看此分类的内容</div> <button class="btn btn-primary" style="width: 100%;padding: 8px;cursor:pointer;font-size:13px;">输入密码</button> </div>`;
      lockedCard.querySelector(".btn").addEventListener("click", () => {
        openPasswordModal(cat.id);
      });
      grid.appendChild(lockedCard);
    } else {
      cat.links.forEach((link, li) => {
        const a = document.createElement("a");
        a.className = "link-card";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.style.animationDelay = `${li * 0.04}s`;
        a.setAttribute("aria-label", `${link.name}— ${link.desc}`);
        a.innerHTML = ` <span class="card-emoji">${link.icon}</span> <div class="card-name">${esc(link.name)}</div> <div class="card-desc">${esc(link.desc)}</div> <div class="card-arrow">前往访问 →</div>`;
        if (link.url === "#history") {
          a.href = "#";
          a.addEventListener("click", (e) => {
            e.preventDefault();
            openHistoryModal();
          });
        } else if (link.showModal) {
          a.href = "#";
          a.addEventListener("click", (e) => {
            e.preventDefault();
            openModal(link.name, link.url);
          });
        } else {
          a.href = link.url;
        }
        grid.appendChild(a);
      });
    }
    cont.appendChild(sec);
  });
}
let searchTimer = null;
function handleSearch(q) {
  S.searchQ = q.trim().toLowerCase();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(
    () => (S.searchQ ? doSearch(S.searchQ) : clearSearch()),
    150,
  );
}
function doSearch(q) {
  const results = [];
  const verifiedCats = JSON.parse(
    localStorage.getItem("nav-verified-cats") || "[]",
  );
  S.data.categories.forEach((cat) => {
    const isLocked = cat.password && !verifiedCats.includes(cat.id);
    if (isLocked) return;
    cat.links.forEach((link) => {
      if (`${link.name}${link.desc}${cat.name}`.toLowerCase().includes(q))
        results.push({ ...link, catName: cat.name, catColor: cat.color });
    });
  });
  $("catContainer").style.display = "none";
  const el = $("searchResults");
  el.classList.add("on");
  if (!results.length) {
    el.innerHTML = ` <p class="result-count">搜索 "<strong>${esc(q)}</strong>"</p> <div class="search-empty"> <div class="search-empty-icon">🔍</div> <h3>未找到结果</h3><p>试试其他关键词吧～</p> </div>`;
    return;
  }
  el.innerHTML = ` <p class="result-count">找到 <strong>${results.length}</strong> 个与 "<strong>${esc(q)}</strong>" 相关的结果</p> <div id="searchGrid" class="links-grid"> ${results.map((r, i) => ` <a class="link-card search-result-card" data-index="${i}" style="animation-delay:${i * 0.03}s"> <span class="card-emoji">${r.icon}</span> <div class="card-name">${hi(r.name, q)}</div> <div class="card-desc">${hi(r.desc, q)}</div> <div class="card-arrow" style="color:${r.catColor}">${esc(r.catName)}→</div> </a>`).join("")}</div>`;
  $$(".search-result-card").forEach((el) => {
    const idx = parseInt(el.getAttribute("data-index"));
    const result = results[idx];
    el.href = result.showModal ? "#" : result.url;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (result.showModal) {
        openModal(result.name, result.url);
      } else {
        window.open(result.url, "_blank", "noopener");
      }
    });
  });
}
function clearSearch() {
  S.searchQ = "";
  const inp = $("searchInput");
  if (inp) inp.value = "";
  $("searchClear").classList.remove("on");
  const sr = $("searchResults");
  sr.classList.remove("on");
  sr.innerHTML = "";
  $("catContainer").style.display = "block";
}
function applyTheme(t) {
  S.theme = t;
  localStorage.setItem("nav-theme", t);
  t === "auto"
    ? document.documentElement.removeAttribute("data-theme")
    : document.documentElement.setAttribute("data-theme", t);
  const dark =
    t === "dark" ||
    (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  $("themeToggle").textContent = dark ? "☀️" : "🌙";
}
function toggleTheme() {
  const dark =
    S.theme === "dark" ||
    (S.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  applyTheme(dark ? "light" : "dark");
}
function openSidebar() {
  S.sidebarOpen = true;
  $("sidebar").classList.add("on");
  $("overlay").classList.add("on");
  $("hamburger").classList.add("on");
  $("hamburger").setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}
function closeSidebar() {
  S.sidebarOpen = false;
  $("sidebar").classList.remove("on");
  $("overlay").classList.remove("on");
  $("hamburger").classList.remove("on");
  $("hamburger").setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}
function openModal(linkName, linkUrl) {
  if (S.sidebarOpen) closeSidebar();
  const config = S.data.wechatConfig || {};
  $("modalTitle").textContent = config.title || "订阅公众号";
  $("modalDesc").textContent = config.description || "关注我们的公众号";
  const qrContainer = $("modalQRCode");
  if (config.qrCode) {
    qrContainer.innerHTML = `<img src="${esc(config.qrCode)}" alt="公众号二维码">`;
  } else {
    qrContainer.innerHTML = "<p>暂无二维码</p>";
  }
  const infoContainer = $("modalInfo");
  infoContainer.innerHTML = "";
  if (config.wechatId) {
    infoContainer.innerHTML += `<p><strong>微信号：</strong> ${esc(config.wechatId)}</p>`;
  }
  if (config.extra) {
    infoContainer.innerHTML += `<p>${esc(config.extra)}</p>`;
  }
  $("modalGo").onclick = () => {
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener");
    }
    closeModal();
  };
  $("modalOverlay").classList.add("show");
  $("modal").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  $("modalOverlay").classList.remove("show");
  $("modal").classList.remove("show");
  document.body.style.overflow = "";
}
function getSeenNotifs() {
  try {
    return JSON.parse(localStorage.getItem("nav-seen-notifs") || "[]");
  } catch (e) {
    return [];
  }
}
function markAllNotifsSeen() {
  const notifs = S.data.notifications || [];
  const ids = notifs.map((n) => n.id);
  localStorage.setItem("nav-seen-notifs", JSON.stringify(ids));
  updateNotifBadge();
}
function getUnseenCount() {
  const notifs = S.data.notifications || [];
  const seen = getSeenNotifs();
  return notifs.filter((n) => !seen.includes(n.id)).length;
}
function updateNotifBadge() {
  const count = getUnseenCount();
  const badge = $("notifBadge");
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : count;
    badge.style.display = "flex";
    $("notifBell").textContent = "🔔";
  } else {
    badge.style.display = "none";
    $("notifBell").textContent = "🔕";
  }
}
function openNotifModal() {
  if (S.sidebarOpen) closeSidebar();
  const notifs = S.data.notifications || [];
  if (!notifs.length) return;
  const body = $("notifModalBody");
  body.innerHTML = `<ul class="notif-list">${notifs
    .map((n) => {
      const isAdd = n.type === "add";
      return `<li class="notif-item"><div class="notif-icon ${isAdd ? "add" : "remove"}">${isAdd ? "➕" : "➖"}</div><div class="notif-info"><h4>${esc(n.title)}</h4><p>${esc(n.content)}</p><span class="notif-date">${esc(n.date)}</span></div></li>`;
    })
    .join("")}</ul>`;
  $("notifOverlay").classList.add("show");
  $("notifModal").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeNotifModal() {
  markAllNotifsSeen();
  $("notifOverlay").classList.remove("show");
  $("notifModal").classList.remove("show");
  document.body.style.overflow = "";
}
let historyLoaded = false;
let historyTimelineBuilt = false;
async function openHistoryModal() {
  if (S.sidebarOpen) closeSidebar();
  $("historyOverlay").classList.add("show");
  $("historyModal").classList.add("show");
  document.body.style.overflow = "hidden";
  if (!historyLoaded) {
    const body = $("historyModalBody");
    try {
      const res = await fetch("./history-content.html");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      body.innerHTML = html;
      historyLoaded = true;
      buildHistoryTimeline();
    } catch (err) {
      body.innerHTML = `<div class="history-loading"><p>加载失败，请稍后重试</p></div>`;
      console.error("[History] 加载失败:", err);
    }
  } else if (!historyTimelineBuilt) {
    buildHistoryTimeline();
  }
}
function buildHistoryTimeline() {
  const timelineData = (S.data && S.data.history) || [];
  if (!timelineData.length) return;
  let addCount = 0, removeCount = 0, catCount = 0;
  timelineData.forEach(function(e) {
    if (e.type === "category") catCount++;
    e.changes.forEach(function(c) {
      if (c.type === "add") addCount += c.items.length;
      else if (c.type === "remove") removeCount += c.items.length;
    });
  });
  var sa = document.getElementById("statAdd");
  var sr = document.getElementById("statRemove");
  var sc = document.getElementById("statCat");
  if (sa) sa.textContent = addCount;
  if (sr) sr.textContent = removeCount;
  if (sc) sc.textContent = catCount;
  var timelineEl = document.querySelector(".timeline");
  if (!timelineEl) return;
  timelineData.forEach(function(event, i) {
    var item = document.createElement("div");
    item.className = "tl-item";
    item.style.animationDelay = (i * 0.06) + "s";
    var typeLabel = event.type === "category" ? "分类调整" : "网址更新";
    var typeIcon = event.type === "category" ? "📂" : "🔄";
    var changesHtml = event.changes.map(function(c) {
      var cls = c.type === "add" ? "chg-add" : c.type === "remove" ? "chg-remove" : c.type === "move" ? "chg-move" : "chg-tag";
      var text = c.type === "add" ? "新增" : c.type === "remove" ? "移除" : c.type === "move" ? "移动" : "调整";
      var icon = c.type === "add" ? "➕" : c.type === "remove" ? "➖" : c.type === "move" ? "📦" : "🏷️";
      return "<div class=\"chg-group\"><span class=\"chg-tag " + cls + "\">" + icon + " " + text + "</span><span class=\"chg-cat\">" + esc(c.cat) + "</span><span class=\"chg-items\">" + esc(c.items.join("、")) + "</span></div>";
    }).join("");
    item.innerHTML = "<div class=\"tl-dot" + (event.type === "category" ? " tl-dot-cat" : "") + "\"></div><div class=\"tl-card\"><div class=\"tl-card-header\"><span class=\"tl-type-badge\">" + typeIcon + " " + typeLabel + "</span><span class=\"tl-date\">" + esc(event.date) + "</span></div><h3 class=\"tl-title\">" + esc(event.title) + "</h3><p class=\"tl-detail\">" + esc(event.detail) + "</p><div class=\"tl-changes\">" + changesHtml + "</div></div>";
    timelineEl.appendChild(item);
  });
  historyTimelineBuilt = true;
}
function closeHistoryModal() {
  $("historyOverlay").classList.remove("show");
  $("historyModal").classList.remove("show");
  document.body.style.overflow = "";
}
function checkNotifications() {
  const notifs = S.data.notifications || [];
  if (!notifs.length) return;
  const unseen = getUnseenCount();
  updateNotifBadge();
  if (unseen > 0) {
    setTimeout(() => openNotifModal(), 600);
  }
}
let S_pendingPasswordCatId = null;
function openPasswordModal(catId) {
  if (S.sidebarOpen) closeSidebar();
  S_pendingPasswordCatId = catId;
  const config = S.data.passwordConfig || {};
  const cat = S.data.categories.find((c) => c.id === catId);
  $("passwordModalTitle").textContent = `🔐 ${esc(cat.name || "分类")}`;
  $("passwordModalDesc").textContent =
    config.description || "此分类需要密码验证后才能查看";
  $("passwordHint").textContent = config.hint || "关注公众号获取密码";
  $("passwordInput").value = "";
  $("passwordInput").type = "password";
  $("passwordToggle").textContent = "👁️";
  const existingError = $("passwordErrorMsg");
  if (existingError) existingError.remove();
  $("passwordModalOverlay").classList.add("show");
  $("passwordModal").classList.add("show");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("passwordInput").focus(), 100);
}
function closePasswordModal() {
  $("passwordModalOverlay").classList.remove("show");
  $("passwordModal").classList.remove("show");
  document.body.style.overflow = "";
  S_pendingPasswordCatId = null;
}
function verifyPassword() {
  const inputPassword = $("passwordInput").value.trim();
  if (!inputPassword) {
    showPasswordError("请输入密码");
    return;
  }
  const cat = S.data.categories.find((c) => c.id === S_pendingPasswordCatId);
  if (cat && cat.password === inputPassword) {
    const verifiedCats = JSON.parse(
      localStorage.getItem("nav-verified-cats") || "[]",
    );
    if (!verifiedCats.includes(S_pendingPasswordCatId)) {
      verifiedCats.push(S_pendingPasswordCatId);
      localStorage.setItem("nav-verified-cats", JSON.stringify(verifiedCats));
    }
    showPasswordSuccess("验证成功，正在加载...");
    setTimeout(() => {
      location.reload();
    }, 500);
  } else {
    showPasswordError("密码错误，请重试");
  }
}
function showPasswordError(msg) {
  let errorEl = $("passwordErrorMsg");
  if (!errorEl) {
    errorEl = document.createElement("p");
    errorEl.id = "passwordErrorMsg";
    errorEl.className = "password-error";
    $("passwordHint").parentNode.insertBefore(
      errorEl,
      $("passwordHint").nextSibling,
    );
  }
  errorEl.textContent = msg;
}
function showPasswordSuccess(msg) {
  let successEl = $("passwordSuccessMsg");
  if (!successEl) {
    successEl = document.createElement("p");
    successEl.id = "passwordSuccessMsg";
    successEl.className = "password-success";
    $("passwordHint").parentNode.insertBefore(
      successEl,
      $("passwordHint").nextSibling,
    );
  }
  successEl.textContent = msg;
  successEl.style.color = "#34c759";
  successEl.style.fontWeight = "600";
}
function togglePasswordVisibility() {
  const input = $("passwordInput");
  const toggle = $("passwordToggle");
  if (input.type === "password") {
    input.type = "text";
    toggle.textContent = "🙈";
  } else {
    input.type = "password";
    toggle.textContent = "👁️";
  }
}
function safeOn(el, event, handler) {
  if (el) el.addEventListener(event, handler);
}
function bindEvents() {
  safeOn($("themeToggle"), "click", toggleTheme);
  safeOn($("hamburger"), "click", () =>
    S.sidebarOpen ? closeSidebar() : openSidebar(),
  );
  safeOn($("overlay"), "click", closeSidebar);
  const inp = $("searchInput");
  if (inp) {
    inp.addEventListener("input", (e) => {
      $("searchClear").classList.toggle("on", e.target.value.length > 0);
      handleSearch(e.target.value);
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        clearSearch();
        inp.blur();
      }
    });
  }
  safeOn($("searchClear"), "click", () => {
    clearSearch();
    if (inp) inp.focus();
  });
  const topBtn = $("scrollTop");
  if (topBtn) {
    topBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" }),
    );
  }
  window.addEventListener(
    "scroll",
    () => topBtn && topBtn.classList.toggle("on", window.scrollY > 280),
    { passive: true },
  );
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (S.theme === "auto") applyTheme("auto");
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (inp) inp.focus();
    }
  });
  safeOn($("modalClose"), "click", closeModal);
  safeOn($("modalSkip"), "click", closeModal);
  safeOn($("modalOverlay"), "click", closeModal);
  document.addEventListener("keydown", (e) => {
    const modal = $("modal");
    if (e.key === "Escape" && modal && modal.classList.contains("show"))
      closeModal();
  });
  safeOn($("notifBell"), "click", openNotifModal);
  safeOn($("notifOverlay"), "click", closeNotifModal);
  safeOn($("notifModalClose"), "click", closeNotifModal);
  safeOn($("notifModalConfirm"), "click", closeNotifModal);
  document.addEventListener("keydown", (e) => {
    const notifModal = $("notifModal");
    if (e.key === "Escape" && notifModal && notifModal.classList.contains("show"))
      closeNotifModal();
  });
  safeOn($("historyOverlay"), "click", closeHistoryModal);
  safeOn($("historyModalClose"), "click", closeHistoryModal);
  document.addEventListener("keydown", (e) => {
    const histModal = $("historyModal");
    if (e.key === "Escape" && histModal && histModal.classList.contains("show"))
      closeHistoryModal();
  });
  safeOn($("passwordModalClose"), "click", closePasswordModal);
  safeOn($("passwordModalOverlay"), "click", closePasswordModal);
  safeOn($("passwordToggle"), "click", togglePasswordVisibility);
  safeOn($("passwordSubmit"), "click", verifyPassword);
  safeOn($("passwordShowWechat"), "click", () => {
    closePasswordModal();
    openModal("", "");
  });
  safeOn($("passwordInput"), "keydown", (e) => {
    if (e.key === "Enter") verifyPassword();
    if (e.key === "Escape") closePasswordModal();
  });
  document.addEventListener("keydown", (e) => {
    const passwordModal = $("passwordModal");
    if (e.key === "Escape" && passwordModal && passwordModal.classList.contains("show"))
      closePasswordModal();
  });
}
document.addEventListener("DOMContentLoaded", () => {
  PERF.domContentLoaded = performance.now();
  applyTheme(S.theme);
  bindEvents();
  loadData();
});
