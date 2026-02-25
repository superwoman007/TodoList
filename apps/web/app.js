/**
 * TodoList 应用主逻辑 v3
 * 仪表盘 + 今日聚焦 + 逾期高亮 + 截止日期 + 空状态 + 登录注册
 * + 移动端手势交互 + 下拉刷新 + 离线指示
 */
import * as api from "./api.js";
const { setApiHost, getApiHost, clearApiHost, isCapacitor } = api;

/* ========== 状态 ========== */
const state = {
  data: [],
  query: "",
  history: [],
  undoTimer: null,
  online: false,
  authenticated: false,
  authMode: "login", // "login" | "register"
  templates: [],
  allTags: [], // 全局标签池
};

/* ========== DOM 引用 ========== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const tpl = $("#card");
const cols = { todo: $("#col-todo"), doing: $("#col-doing"), done: $("#col-done") };
const counts = { todo: $("#count-todo"), doing: $("#count-doing"), done: $("#count-done") };
const empties = { todo: $("#empty-todo"), doing: $("#empty-doing"), done: $("#empty-done") };
const mobileTabs = $$("#mobile-tabs .tab-btn");
const statusModal = $("#status-modal");
const deleteModal = $("#delete-modal");
const overlay = $("#add-overlay");
const undoToast = $("#undo-toast");

let mobileActive = "todo";
let currentActionItemId = null;
let currentEditItemId = null;
let currentDeleteItemId = null;
let isEditing = false;

/* ========== 时间工具 ========== */
function isOverdue(item) {
  if (!item.due_date || item.status === "done") return false;
  return new Date(item.due_date) < new Date();
}

function isDueToday(item) {
  if (!item.due_date || item.status === "done") return false;
  const due = new Date(item.due_date);
  const now = new Date();
  return due.toDateString() === now.toDateString();
}

function isDueSoon(item) {
  if (!item.due_date || item.status === "done") return false;
  const due = new Date(item.due_date);
  const now = new Date();
  const diff = due - now;
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // 3 days
}

function formatDueLabel(item) {
  if (!item.due_date) return "";
  const due = new Date(item.due_date);
  const now = new Date();
  const diffMs = due - now;
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  const diffD = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (item.status === "done") {
    return `${due.getMonth() + 1}/${due.getDate()} ${String(due.getHours()).padStart(2, "0")}:${String(due.getMinutes()).padStart(2, "0")}`;
  }
  if (diffMs < 0) {
    const abH = Math.abs(diffH);
    if (abH < 24) return `已逾期 ${abH} 小时`;
    return `已逾期 ${Math.abs(diffD)} 天`;
  }
  if (diffH < 1) return "即将到期";
  if (diffH < 24) return `还剩 ${diffH} 小时`;
  if (diffD <= 3) return `还剩 ${diffD} 天`;
  return `${due.getMonth() + 1}/${due.getDate()}`;
}

function dueColorClass(item) {
  if (isOverdue(item)) return "text-red-600 dark:text-red-400";
  if (isDueToday(item)) return "text-amber-600 dark:text-amber-400";
  if (isDueSoon(item)) return "text-amber-500 dark:text-amber-400";
  return "text-slate-500 dark:text-slate-400";
}

/* ========== 仪表盘 ========== */
function renderDashboard(list) {
  const total = list.length;
  const todoN = list.filter((i) => i.status === "todo").length;
  const doingN = list.filter((i) => i.status === "doing").length;
  const doneN = list.filter((i) => i.status === "done").length;
  const overdueN = list.filter((i) => isOverdue(i)).length;
  const pct = total > 0 ? Math.round((doneN / total) * 100) : 0;

  // Ring chart
  const circumference = 2 * Math.PI * 22; // r=22
  const offset = circumference - (pct / 100) * circumference;
  const ring = $("#ring-progress");
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${offset}`;
  // Color based on pct
  ring.classList.remove("stroke-red-500", "stroke-amber-500", "stroke-emerald-500", "stroke-indigo-500");
  if (pct < 30) ring.classList.add("stroke-red-500");
  else if (pct < 70) ring.classList.add("stroke-amber-500");
  else ring.classList.add("stroke-emerald-500");

  $("#ring-pct").textContent = `${pct}%`;
  $("#dash-done-total").textContent = `${doneN}/${total}`;
  $("#dash-todo").textContent = String(todoN);
  $("#dash-doing").textContent = String(doingN);

  // Overdue card
  const overdueCard = $("#dash-overdue-card");
  if (overdueN > 0) {
    overdueCard.classList.remove("hidden");
    $("#dash-overdue").textContent = String(overdueN);
  } else {
    overdueCard.classList.add("hidden");
  }

  // Progress bar
  const bar = $("#progress-bar");
  bar.style.width = `${pct}%`;
  bar.classList.remove("bg-red-500", "bg-amber-500", "bg-emerald-500");
  if (pct < 30) bar.classList.add("bg-red-500");
  else if (pct < 70) bar.classList.add("bg-amber-500");
  else bar.classList.add("bg-emerald-500");
}

/* ========== 今日聚焦 ========== */
function renderTodayFocus(list) {
  const todayItems = list.filter((i) => i.status !== "done" && (isDueToday(i) || isOverdue(i)));
  const container = $("#today-focus");
  const todayList = $("#today-list");
  const todayCount = $("#today-count");

  if (todayItems.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  todayCount.textContent = String(todayItems.length);
  todayList.innerHTML = "";

  todayItems.forEach((item) => {
    const overdue = isOverdue(item);
    const chip = document.createElement("button");
    chip.className = `flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer w-full md:w-auto ${
      overdue
        ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 animate-pulse-slow"
        : "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
    }`;
    chip.innerHTML = `<span class="truncate">${item.title}</span><span class="text-xs opacity-75 whitespace-nowrap shrink-0">${formatDueLabel(item)}</span>`;
    chip.addEventListener("click", () => openDetailPanel(item.id));
    todayList.appendChild(chip);
  });
}

/* ========== 移动端视图切换 ========== */
function updateMobileView() {
  const wide = window.matchMedia("(min-width: 768px)").matches;
  $$("main > section").forEach((sec) => {
    if (wide) { sec.classList.remove("hidden"); return; }
    sec.classList.toggle("hidden", sec.dataset.col !== mobileActive);
  });
  const tabOrder = ["todo", "doing", "done"];
  const idx = tabOrder.indexOf(mobileActive);
  // 滑动指示器
  const indicator = $("#tab-indicator");
  if (indicator) {
    indicator.style.transform = `translateX(${idx * 100}%)`;
  }
  mobileTabs.forEach((btn) => {
    const on = btn.dataset.tab === mobileActive;
    btn.setAttribute("aria-selected", String(on));
    btn.setAttribute("tabindex", on ? "0" : "-1");
    if (on) {
      btn.classList.remove("text-slate-500", "dark:text-slate-400");
      btn.classList.add("text-slate-900", "dark:text-slate-100");
    } else {
      btn.classList.remove("text-slate-900", "dark:text-slate-100");
      btn.classList.add("text-slate-500", "dark:text-slate-400");
    }
  });
}

function initMobileTabs() {
  mobileTabs.forEach((btn) => {
    btn.addEventListener("click", () => { mobileActive = btn.dataset.tab || "todo"; updateMobileView(); });
    btn.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const order = ["todo", "doing", "done"];
      const idx = order.indexOf(mobileActive);
      const next = e.key === "ArrowRight" ? (idx + 1) % 3 : (idx + 2) % 3;
      mobileActive = order[next];
      updateMobileView();
      [...mobileTabs].find((b) => b.dataset.tab === mobileActive)?.focus();
      e.preventDefault();
    });
  });
  window.addEventListener("resize", updateMobileView);
  updateMobileView();
}

/* ========== 渲染 ========== */
function render() {
  Object.values(cols).forEach((c) => (c.innerHTML = ""));
  const list = state.data.filter((item) => {
    if (!state.query) return true;
    return (item.title + " " + (item.description || "")).toLowerCase().includes(state.query.toLowerCase());
  });

  const todoN = list.filter((i) => i.status === "todo").length;
  const doingN = list.filter((i) => i.status === "doing").length;
  const doneN = list.filter((i) => i.status === "done").length;

  counts.todo.textContent = String(todoN);
  counts.doing.textContent = String(doingN);
  counts.done.textContent = String(doneN);

  // 更新移动端 Tab badge 计数
  const tabCountTodo = $("#tab-count-todo");
  const tabCountDoing = $("#tab-count-doing");
  const tabCountDone = $("#tab-count-done");
  if (tabCountTodo) tabCountTodo.textContent = String(todoN);
  if (tabCountDoing) tabCountDoing.textContent = String(doingN);
  if (tabCountDone) tabCountDone.textContent = String(doneN);

  // Empty states
  empties.todo.classList.toggle("hidden", todoN > 0);
  empties.doing.classList.toggle("hidden", doingN > 0);
  empties.done.classList.toggle("hidden", doneN > 0);

  // Dashboard
  renderDashboard(list);
  renderTodayFocus(list);

  list.forEach((item) => {
    const node = tpl.content.cloneNode(true);
    node.querySelector(".card-title").textContent = item.title;
    node.querySelector(".card-desc").textContent = item.description || "";

    // Priority badge (文字标签)
    const badge = node.querySelector(".card-priority-badge");
    const priLabel = { normal: "普通", high: "高", low: "低" };
    badge.textContent = priLabel[item.priority] || item.priority;
    const colorMap = {
      normal: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
      high: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    };
    badge.className = "card-priority-badge text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 cursor-pointer relative z-10 transition-colors " + (colorMap[item.priority] || colorMap.normal);
    badge.setAttribute("role", "button");
    badge.setAttribute("tabindex", "0");
    badge.addEventListener("click", (e) => { e.stopPropagation(); cyclePriority(item.id); });
    badge.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); badge.click(); } });

    // Template badge
    if (item.scene_template_name) {
      const tplEl = node.querySelector(".card-tpl");
      tplEl.classList.remove("hidden");
      tplEl.querySelector(".tpl-name").textContent = item.scene_template_name;
    }

    // Due date
    if (item.due_date) {
      const dueEl = node.querySelector(".card-due");
      dueEl.classList.remove("hidden");
      const dueText = dueEl.querySelector(".due-text");
      dueText.textContent = formatDueLabel(item);
      dueEl.className = `card-due flex items-center gap-1 text-[11px] ${dueColorClass(item)}`;
    }

    // Subtask progress on card
    const subs = item.subtasks || [];
    if (subs.length > 0) {
      const subBar = node.querySelector(".card-subtask-bar");
      subBar.classList.remove("hidden");
      const doneCount = subs.filter((s) => s.done).length;
      const pctSub = Math.round((doneCount / subs.length) * 100);
      subBar.querySelector(".card-sub-text").textContent = `${doneCount}/${subs.length}`;
      subBar.querySelector(".card-sub-fill").style.width = `${pctSub}%`;
    }

    // Tags on card
    const tags = item.tags || [];
    if (tags.length > 0) {
      const tagContainer = node.querySelector(".card-tags");
      tagContainer.classList.remove("hidden");
      const maxShow = 3;
      tags.slice(0, maxShow).forEach((tag) => {
        const chip = document.createElement("span");
        chip.className = "text-[10px] px-1.5 py-0.5 rounded-full text-white";
        chip.style.backgroundColor = tag.color || "#6366f1";
        chip.textContent = tag.name;
        tagContainer.appendChild(chip);
      });
      if (tags.length > maxShow) {
        const more = document.createElement("span");
        more.className = "text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300";
        more.textContent = `+${tags.length - maxShow}`;
        tagContainer.appendChild(more);
      }
    }

    // Card element - 左侧优先级彩条
    const cardEl = node.querySelector(".swipe-content");
    cardEl.dataset.id = String(item.id);
    const priClass = { high: "priority-high", normal: "priority-normal", low: "priority-low" };
    cardEl.classList.add(priClass[item.priority] || priClass.normal);

    // Overdue styling
    if (isOverdue(item)) {
      cardEl.classList.add("border-red-300", "dark:border-red-800");
      if (item.priority === "high") cardEl.classList.add("animate-pulse-slow");
    }

    cardEl.setAttribute("tabindex", "0");
    cardEl.addEventListener("click", () => openDetailPanel(item.id));
    cardEl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cardEl.click(); } });

    // 滑动容器绑定 data-id
    const swipeContainer = node.querySelector(".swipe-container");
    if (swipeContainer) swipeContainer.dataset.id = String(item.id);

    cols[item.status].appendChild(node);
  });

  api.saveLocal(state.data);
}

/* ========== 数据操作 ========== */
async function cyclePriority(id) {
  const item = state.data.find((i) => String(i.id) === String(id));
  if (!item) return;
  const order = ["normal", "high", "low"];
  item.priority = order[(order.indexOf(item.priority || "normal") + 1) % 3];
  render();
  if (state.online) await api.updateTodo(id, { priority: item.priority }).catch(() => {});
}

async function changeStatus(id, newStatus) {
  const item = state.data.find((i) => String(i.id) === String(id));
  if (!item || item.status === newStatus) return;
  const oldStatus = item.status;
  state.history.push({ id: item.id, from: oldStatus, to: newStatus, timestamp: Date.now() });
  if (state.history.length > 10) state.history.shift();
  item.status = newStatus;
  render();
  showUndoToast();
  if (state.online) await api.updateTodo(id, { status: newStatus }).catch(() => {});
}

async function deleteTask(id) {
  const idx = state.data.findIndex((i) => String(i.id) === String(id));
  if (idx === -1) return;
  const item = state.data[idx];
  state.history.push({ id: item.id, action: "delete", data: { ...item }, timestamp: Date.now() });
  if (state.history.length > 10) state.history.shift();
  state.data.splice(idx, 1);
  render();
  showUndoToast("任务已删除");
  if (state.online) await api.deleteTodo(id).catch(() => {});
}

async function handleUndo() {
  const last = state.history.pop();
  if (!last) return;
  if (last.action === "delete") {
    state.data.unshift(last.data);
    if (state.online) await api.createTodo(last.data).catch(() => {});
  } else if (last.action === "edit") {
    const item = state.data.find((i) => String(i.id) === String(last.id));
    if (item) Object.assign(item, last.data);
    if (state.online) await api.updateTodo(last.id, last.data).catch(() => {});
  } else {
    const item = state.data.find((i) => String(i.id) === String(last.id));
    if (item) item.status = last.from;
    if (state.online) await api.updateTodo(last.id, { status: last.from }).catch(() => {});
  }
  render();
  if (state.history.length === 0) {
    undoToast.classList.add("translate-y-24", "opacity-0");
  } else {
    const prev = state.history[state.history.length - 1];
    showUndoToast(prev.action === "delete" ? "任务已删除" : prev.action === "edit" ? "任务已更新" : "状态已更新");
  }
}

/* ========== Toast ========== */
function showUndoToast(msg = "状态已更新") {
  undoToast.querySelector("span").textContent = msg;
  undoToast.classList.remove("translate-y-24", "opacity-0");
  if (state.undoTimer) clearTimeout(state.undoTimer);
  state.undoTimer = setTimeout(() => undoToast.classList.add("translate-y-24", "opacity-0"), 5000);
}

/* ========== 状态操作模态框 ========== */
function openStatusModal(itemId) {
  currentActionItemId = itemId;
  const item = state.data.find((i) => String(i.id) === String(itemId));
  if (!item) return;
  statusModal.querySelectorAll("button[data-status]").forEach((btn) => {
    const on = btn.dataset.status === item.status;
    btn.classList.toggle("ring-2", on); btn.classList.toggle("ring-indigo-500", on);
    btn.classList.toggle("bg-indigo-50", on); btn.classList.toggle("dark:bg-slate-700", on);
  });
  statusModal.classList.remove("hidden"); statusModal.classList.add("flex");
  setTimeout(() => (statusModal.querySelector(`button[data-status="${item.status}"]`) || statusModal.querySelector("button[data-status]"))?.focus(), 50);
}

function closeStatusModal() {
  statusModal.classList.add("hidden"); statusModal.classList.remove("flex");
  currentActionItemId = null; isEditing = false;
}

/* ========== 删除确认模态框 ========== */
function openDeleteModal(itemId) {
  currentDeleteItemId = itemId;
  deleteModal.classList.remove("hidden"); deleteModal.classList.add("flex");
  setTimeout(() => $("#delete-cancel").focus(), 50);
}

function closeDeleteModal() {
  deleteModal.classList.add("hidden"); deleteModal.classList.remove("flex");
  currentDeleteItemId = null;
}

/* ========== 添加/编辑模态框 ========== */
function openFormModal(itemId = null) {
  isEditing = !!itemId;
  currentEditItemId = itemId ? String(itemId) : null;
  const formTitle = overlay.querySelector("h3");
  const submitBtn = $("#add-form").querySelector('button[type="submit"]');
  if (itemId) {
    const item = state.data.find((i) => String(i.id) === String(itemId));
    if (!item) return;
    formTitle.textContent = "编辑任务"; submitBtn.textContent = "保存";
    $("#add-title").value = item.title;
    $("#add-desc").value = item.description || "";
    $("#add-priority").value = item.priority || "normal";
    $("#add-due").value = item.due_date ? new Date(item.due_date).toISOString().slice(0, 16) : "";
  } else {
    formTitle.textContent = "添加任务"; submitBtn.textContent = "添加";
    $("#add-form").reset();
  }
  overlay.classList.remove("hidden"); overlay.classList.add("flex");
  setTimeout(() => $("#add-title").focus(), 0);
}

function closeFormModal() {
  overlay.classList.add("hidden"); overlay.classList.remove("flex");
  $("#add-form").reset(); isEditing = false; currentEditItemId = null;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const title = $("#add-title").value.trim();
  if (!title) return;
  const desc = $("#add-desc").value.trim();
  const pri = $("#add-priority")?.value || "normal";
  const dueVal = $("#add-due")?.value || "";
  const due = dueVal ? new Date(dueVal).toISOString() : null;

  if (isEditing && currentEditItemId) {
    const item = state.data.find((i) => String(i.id) === String(currentEditItemId));
    if (item) {
      const oldItem = { ...item };
      item.title = title; item.description = desc; item.priority = pri; item.due_date = due;
      state.history.push({ id: item.id, action: "edit", data: oldItem, timestamp: Date.now() });
      if (state.history.length > 10) state.history.shift();
      render();
      showUndoToast("任务已更新");
      if (state.online) await api.updateTodo(item.id, { title, description: desc, priority: pri, due_date: due }).catch(() => {});
    }
  } else {
    const item = { id: Date.now(), title, description: desc, status: "todo", priority: pri, due_date: due };
    state.data.unshift(item);
    render();
    showUndoToast("任务已添加");
    if (state.online) {
      const created = await api.createTodo({ title, description: desc, status: "todo", priority: pri, due_date: due }).catch(() => null);
      if (created) item.id = created.id;
    }
  }
  closeFormModal();
}

/* ========== 认证视图管理 ========== */
const authView = $("#auth-view");
const appView = $("#app-view");
let _appEventsReady = false;

function ensureAppReady() {
  if (_appEventsReady) return;
  _appEventsReady = true;
  initMobileTabs();
  bindEvents();
  bindDetailEvents();
  bindTplEvents();
  bindSettingsEvents();
  loadAllTags();
  initSwipeGestures();
  initPullToRefresh();
  initDetailSheetDrag();
  initOfflineIndicator();
}

function showAuthView(expired = false) {
  state.authenticated = false;
  authView.classList.remove("hidden");
  authView.classList.add("flex");
  appView.classList.add("hidden");
  if (expired) {
    showAuthError("登录已过期，请重新登录");
  }
  setTimeout(() => $("#auth-email").focus(), 50);
}

function showAppView() {
  authView.classList.add("hidden");
  authView.classList.remove("flex");
  appView.classList.remove("hidden");
  // 显示/隐藏登出按钮（移动端底部导航栏 + 桌面端）
  const logoutBtn = $("#logout-btn");
  const logoutBtnDesktop = $("#logout-btn-desktop");
  if (state.authenticated) {
    if (logoutBtn) { logoutBtn.classList.remove("hidden"); logoutBtn.classList.add("flex"); }
    if (logoutBtnDesktop) { logoutBtnDesktop.classList.remove("hidden"); logoutBtnDesktop.classList.add("md:flex"); }
  } else {
    if (logoutBtn) { logoutBtn.classList.add("hidden"); logoutBtn.classList.remove("flex"); }
    if (logoutBtnDesktop) { logoutBtnDesktop.classList.add("hidden"); logoutBtnDesktop.classList.remove("md:flex"); }
  }
}

function showAuthError(msg) {
  const el = $("#auth-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function hideAuthError() {
  $("#auth-error").classList.add("hidden");
}

function updateAuthUI() {
  const isRegister = state.authMode === "register";
  $("#auth-name-field").classList.toggle("hidden", !isRegister);
  $("#auth-submit").textContent = isRegister ? "注册" : "登录";
  $("#auth-switch-hint").textContent = isRegister ? "已有账号？" : "还没有账号？";
  $("#auth-switch").textContent = isRegister ? "登录" : "注册";
  $("#auth-subtitle").textContent = isRegister ? "创建账号以同步你的任务" : "登录以同步你的任务";
  hideAuthError();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  hideAuthError();
  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;
  const submitBtn = $("#auth-submit");
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "请稍候...";

  try {
    if (state.authMode === "register") {
      const displayName = $("#auth-name").value.trim() || null;
      await api.register(email, password, displayName);
    } else {
      await api.login(email, password);
    }
    state.authenticated = true;
    // 登录成功后拉取数据
    try {
      state.data = await api.fetchTodos();
    } catch {
      state.data = api.loadLocal();
    }
    ensureAppReady();
    render();
    showAppView();
  } catch (err) {
    showAuthError(err.message || "操作失败，请重试");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function handleLogout() {
  api.clearToken();
  state.authenticated = false;
  state.data = [];
  showAuthView();
  $("#auth-form").reset();
  hideAuthError();
}

function handleAuthSkip() {
  state.authenticated = false;
  state.data = api.loadLocal();
  ensureAppReady();
  render();
  showAppView();
}

function bindAuthEvents() {
  $("#auth-form").addEventListener("submit", handleAuthSubmit);
  $("#auth-switch").addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "register" : "login";
    updateAuthUI();
  });
  $("#auth-skip").addEventListener("click", handleAuthSkip);
  $("#logout-btn").addEventListener("click", handleLogout);
  const logoutDesktop = $("#logout-btn-desktop");
  if (logoutDesktop) logoutDesktop.addEventListener("click", handleLogout);
  window.addEventListener("auth:expired", () => {
    api.clearToken();
    showAuthView(true);
  });
}

/* ========== 主题切换 ========== */
const sunSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>';
const moonSvg = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>';

function initTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const saved = localStorage.getItem("theme-dark");
  if (saved === "true" || (saved === null && prefersDark)) document.documentElement.classList.add("dark");

  const mobileBtn = $("#theme-toggle");
  const desktopBtn = $("#theme-toggle-desktop");
  const mobileIcon = $("#theme-icon-mobile");
  const desktopIcon = $("#theme-icon-desktop");
  const mobileLabel = $("#theme-label-mobile");

  const refresh = () => {
    const dark = document.documentElement.classList.contains("dark");
    if (mobileIcon) mobileIcon.outerHTML = dark ? sunSvg : moonSvg;
    if (desktopIcon) desktopIcon.outerHTML = dark ? sunSvg : moonSvg;
    if (mobileLabel) mobileLabel.textContent = dark ? "明亮" : "暗黑";
  };
  const toggle = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme-dark", String(document.documentElement.classList.contains("dark")));
    refresh();
  };
  refresh();
  if (mobileBtn) mobileBtn.addEventListener("click", toggle);
  if (desktopBtn) desktopBtn.addEventListener("click", toggle);
}

/* ========== 焦点陷阱工具 ========== */
function trapFocus(modal) {
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { modal.classList.add("hidden"); modal.classList.remove("flex"); return; }
    if (e.key !== "Tab") return;
    const btns = modal.querySelectorAll("button");
    const first = btns[0], last = btns[btns.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ========== 事件绑定 ========== */
function bindEvents() {
  $("#search").addEventListener("input", (e) => { state.query = e.target.value.trim(); render(); });
  $("#add-btn").addEventListener("click", () => openFormModal());
  const addBtnMobile = $("#add-btn-mobile");
  if (addBtnMobile) addBtnMobile.addEventListener("click", () => openFormModal());
  const fabAdd = $("#fab-add");
  if (fabAdd) fabAdd.addEventListener("click", () => openFormModal());
  // 底部导航栏 - 模版按钮
  const navTpl = $("#nav-tpl");
  if (navTpl) navTpl.addEventListener("click", () => { if (typeof openTplModal === "function") openTplModal(); });
  $("#add-cancel").addEventListener("click", closeFormModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeFormModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeFormModal(); });
  $("#add-form").addEventListener("submit", handleFormSubmit);

  statusModal.addEventListener("click", (e) => { if (e.target === statusModal) closeStatusModal(); });
  statusModal.querySelectorAll("button[data-status]").forEach((btn) => {
    btn.addEventListener("click", () => { if (currentActionItemId) changeStatus(currentActionItemId, btn.dataset.status); closeStatusModal(); });
  });
  $("#status-edit").addEventListener("click", () => { if (currentActionItemId) openFormModal(currentActionItemId); closeStatusModal(); });
  $("#status-delete").addEventListener("click", () => { if (currentActionItemId) openDeleteModal(currentActionItemId); closeStatusModal(); });
  $("#status-cancel").addEventListener("click", closeStatusModal);
  trapFocus(statusModal);

  deleteModal.addEventListener("click", (e) => { if (e.target === deleteModal) closeDeleteModal(); });
  $("#delete-cancel").addEventListener("click", closeDeleteModal);
  $("#delete-confirm").addEventListener("click", () => { if (currentDeleteItemId) deleteTask(currentDeleteItemId); closeDeleteModal(); });
  trapFocus(deleteModal);

  $("#undo-btn").addEventListener("click", handleUndo);
}

/* ========== 自定义日期选择器 ========== */
const calState = { year: 0, month: 0, selectedDate: null, hour: 9, minute: 0 };

function initCalendarSelects() {
  const hourSel = $("#cal-hour");
  const minSel = $("#cal-minute");
  if (hourSel.children.length > 0) return;
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = String(h).padStart(2, "0");
    hourSel.appendChild(opt);
  }
  for (let m = 0; m < 60; m += 5) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = String(m).padStart(2, "0");
    minSel.appendChild(opt);
  }
}

function renderCalendar() {
  const grid = $("#cal-grid");
  grid.innerHTML = "";
  const { year, month, selectedDate } = calState;
  $("#cal-month-label").textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const selStr = selectedDate ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}` : "";

  // 空白填充
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement("div");
    blank.className = "h-8";
    grid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const btn = document.createElement("button");
    btn.type = "button";
    const dateStr = `${year}-${month}-${d}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selStr;
    const isPast = new Date(year, month, d + 1) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    btn.className = `h-8 w-full rounded-lg text-sm font-medium transition-all ${
      isSelected
        ? "bg-indigo-600 text-white shadow-sm"
        : isToday
          ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold"
          : isPast
            ? "text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
            : "text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-600"
    }`;
    btn.textContent = d;
    btn.addEventListener("click", () => {
      calState.selectedDate = new Date(year, month, d);
      renderCalendar();
    });
    grid.appendChild(btn);
  }
}

function openCalendar(dateValue) {
  initCalendarSelects();
  const dd = $("#detail-due-dropdown");

  if (dateValue) {
    const d = new Date(dateValue);
    calState.year = d.getFullYear();
    calState.month = d.getMonth();
    calState.selectedDate = d;
    calState.hour = d.getHours();
    calState.minute = d.getMinutes();
  } else {
    const now = new Date();
    calState.year = now.getFullYear();
    calState.month = now.getMonth();
    calState.selectedDate = null;
    calState.hour = 9;
    calState.minute = 0;
  }

  $("#cal-hour").value = calState.hour;
  // 找最近的5分钟档
  const minSel = $("#cal-minute");
  const rounded = Math.round(calState.minute / 5) * 5;
  minSel.value = rounded >= 60 ? 55 : rounded;

  renderCalendar();
  dd.classList.toggle("hidden");
}

function updateDueLabel(dateValue, status = null) {
  const label = $("#detail-due-label");
  const clearBtn = $("#detail-due-clear");
  if (!dateValue) {
    label.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>选择日期时间`;
    label.className = "flex items-center gap-2 text-slate-400 dark:text-slate-500";
    clearBtn.classList.add("hidden");
    return;
  }
  const d = new Date(dateValue);
  const now = new Date();
  const isOverdueDate = d < now && status !== "done";
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  label.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span>${dateStr} ${timeStr}</span>`;
  label.className = `flex items-center gap-2 ${isOverdueDate ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-100"}`;
  clearBtn.classList.remove("hidden");
}

function bindCalendarEvents() {
  const dueBtnEl = $("#detail-due-btn");
  const dropdown = $("#detail-due-dropdown");

  dueBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentVal = $("#detail-due").value;
    openCalendar(currentVal || null);
  });

  $("#cal-prev").addEventListener("click", (e) => {
    e.stopPropagation();
    calState.month--;
    if (calState.month < 0) { calState.month = 11; calState.year--; }
    renderCalendar();
  });

  $("#cal-next").addEventListener("click", (e) => {
    e.stopPropagation();
    calState.month++;
    if (calState.month > 11) { calState.month = 0; calState.year++; }
    renderCalendar();
  });

  // 快捷按钮
  $$(".cal-quick").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const now = new Date();
      let target;
      switch (btn.dataset.quick) {
        case "today":
          target = now;
          break;
        case "tomorrow":
          target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case "nextweek":
          target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
          break;
      }
      calState.selectedDate = target;
      calState.year = target.getFullYear();
      calState.month = target.getMonth();
      renderCalendar();
    });
  });

  // 确认
  $("#cal-confirm").addEventListener("click", (e) => {
    e.stopPropagation();
    if (calState.selectedDate) {
      const h = parseInt($("#cal-hour").value);
      const m = parseInt($("#cal-minute").value);
      const d = new Date(calState.selectedDate);
      d.setHours(h, m, 0, 0);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      $("#detail-due").value = iso;
      const curItem = state.data.find((i) => String(i.id) === String(currentDetailId));
      updateDueLabel(d.toISOString(), curItem ? curItem.status : null);
    }
    dropdown.classList.add("hidden");
  });

  // 清除
  $("#detail-due-clear").addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    $("#detail-due").value = "";
    updateDueLabel(null, null);
    dropdown.classList.add("hidden");
  });

  // 点击外部关闭
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#detail-due-wrapper")) {
      dropdown.classList.add("hidden");
    }
  });

  // 阻止下拉框内点击冒泡关闭
  dropdown.addEventListener("click", (e) => e.stopPropagation());
}

/* ========== 任务详情面板 ========== */
const detailPanel = $("#detail-panel");
const detailDrawer = $("#detail-drawer");
let currentDetailId = null;

/* -- 自定义下拉框工具 -- */
const statusConfig = {
  todo:  { label: "待办",   color: "bg-indigo-500" },
  doing: { label: "进行中", color: "bg-amber-500" },
  done:  { label: "已完成", color: "bg-emerald-500" },
};
const priorityConfig = {
  high:   { label: "高",   color: "bg-red-500" },
  normal: { label: "普通", color: "bg-indigo-500" },
  low:    { label: "低",   color: "bg-emerald-500" },
};

function updateDropdownLabel(type, value) {
  const config = type === "status" ? statusConfig : priorityConfig;
  const info = config[value] || Object.values(config)[0];
  const labelEl = $(`#detail-${type}-label`);
  labelEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full ${info.color} shrink-0"></span>${info.label}`;
  $(`#detail-${type}`).value = value;
}

function toggleDropdown(type) {
  const dd = $(`#detail-${type}-dropdown`);
  const isHidden = dd.classList.contains("hidden");
  // Close all dropdowns first
  ["status", "priority"].forEach((t) => $(`#detail-${t}-dropdown`).classList.add("hidden"));
  if (isHidden) dd.classList.remove("hidden");
}

function openDetailPanel(itemId) {
  const item = state.data.find((i) => String(i.id) === String(itemId));
  if (!item) return;
  currentDetailId = itemId;

  // 填充基本信息
  $("#detail-title").textContent = item.title;
  updateDropdownLabel("status", item.status);
  updateDropdownLabel("priority", item.priority || "normal");
  $("#detail-desc").value = item.description || "";
  $("#detail-due").value = item.due_date ? new Date(item.due_date).toISOString().slice(0, 16) : "";
  updateDueLabel(item.due_date || null, item.status);

  // 元信息
  if (item.created_at) {
    const d = new Date(item.created_at);
    $("#detail-created").textContent = `创建于 ${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    $("#detail-created").textContent = "";
  }
  if (item.updated_at) {
    const d = new Date(item.updated_at);
    $("#detail-updated").textContent = `更新于 ${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  } else {
    $("#detail-updated").textContent = "";
  }
  const tplInfo = $("#detail-tpl-info");
  if (item.scene_template_name) {
    tplInfo.classList.remove("hidden");
    tplInfo.textContent = `来自模版：${item.scene_template_name}`;
  } else {
    tplInfo.classList.add("hidden");
  }

  // 渲染子任务
  renderDetailSubtasks(item);

  // 渲染标签
  renderDetailTags(item);

  // 显示面板
  detailPanel.classList.remove("hidden");
  const isMobile = !window.matchMedia("(min-width: 768px)").matches;
  requestAnimationFrame(() => {
    if (isMobile) {
      detailDrawer.classList.remove("translate-y-full");
      detailDrawer.classList.remove("translate-x-full");
    } else {
      detailDrawer.classList.remove("md:translate-x-full");
      detailDrawer.classList.remove("translate-x-full");
      detailDrawer.classList.remove("translate-y-full");
    }
  });
}

function closeDetailPanel() {
  const isMobile = !window.matchMedia("(min-width: 768px)").matches;
  if (isMobile) {
    detailDrawer.classList.add("translate-y-full");
  } else {
    detailDrawer.classList.add("translate-x-full");
    detailDrawer.classList.add("translate-y-full");
  }
  setTimeout(() => {
    detailPanel.classList.add("hidden");
    currentDetailId = null;
  }, 300);
}

/* -- 局部更新卡片（不触发全量 render） -- */
function updateCardInPlace(item) {
  const cardEl = document.querySelector(`.swipe-content[data-id="${item.id}"]`);
  if (!cardEl) return;

  // 更新子任务进度
  const subs = item.subtasks || [];
  const subBar = cardEl.querySelector(".card-subtask-bar");
  if (subs.length > 0) {
    subBar.classList.remove("hidden");
    const doneCount = subs.filter((s) => s.done).length;
    const pctSub = Math.round((doneCount / subs.length) * 100);
    subBar.querySelector(".card-sub-text").textContent = `${doneCount}/${subs.length}`;
    subBar.querySelector(".card-sub-fill").style.width = `${pctSub}%`;
  } else {
    subBar.classList.add("hidden");
  }

  // 更新标签
  const tags = item.tags || [];
  const tagContainer = cardEl.querySelector(".card-tags");
  tagContainer.innerHTML = "";
  if (tags.length > 0) {
    tagContainer.classList.remove("hidden");
    const maxShow = 3;
    tags.slice(0, maxShow).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "text-[10px] px-1.5 py-0.5 rounded-full text-white";
      chip.style.backgroundColor = tag.color || "#6366f1";
      chip.textContent = tag.name;
      tagContainer.appendChild(chip);
    });
    if (tags.length > maxShow) {
      const more = document.createElement("span");
      more.className = "text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300";
      more.textContent = `+${tags.length - maxShow}`;
      tagContainer.appendChild(more);
    }
  } else {
    tagContainer.classList.add("hidden");
  }

  api.saveLocal(state.data);
}

/* -- 子任务渲染 -- */
function renderDetailSubtasks(item) {
  const subs = item.subtasks || [];
  const container = $("#detail-subtasks");
  container.innerHTML = "";

  const doneCount = subs.filter((s) => s.done).length;
  const total = subs.length;
  $("#detail-sub-progress").textContent = `${doneCount}/${total}`;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  $("#detail-sub-bar").style.width = `${pct}%`;

  subs.sort((a, b) => a.order - b.order).forEach((sub) => {
    const row = document.createElement("div");
    row.className = "flex items-center gap-2 group min-h-[40px]";
    row.innerHTML = `
      <input type="checkbox" ${sub.done ? "checked" : ""} class="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0" />
      <span class="flex-1 text-sm ${sub.done ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}">${sub.title}</span>
      <button class="md:opacity-0 md:group-hover:opacity-100 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-all shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center" title="删除">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    `;
    // 勾选
    row.querySelector("input").addEventListener("change", async (e) => {
      sub.done = e.target.checked;
      renderDetailSubtasks(item);
      updateCardInPlace(item);
      if (state.online) await api.updateSubtask(item.id, sub.id, { done: sub.done }).catch(() => {});
    });
    // 删除
    row.querySelector("button").addEventListener("click", async () => {
      item.subtasks = item.subtasks.filter((s) => s.id !== sub.id);
      renderDetailSubtasks(item);
      updateCardInPlace(item);
      if (state.online) await api.deleteSubtask(item.id, sub.id).catch(() => {});
    });
    container.appendChild(row);
  });
}

async function handleAddSubtask() {
  const input = $("#detail-sub-input");
  const title = input.value.trim();
  if (!title || !currentDetailId) return;
  const item = state.data.find((i) => String(i.id) === String(currentDetailId));
  if (!item) return;

  if (!item.subtasks) item.subtasks = [];
  const newSub = { id: Date.now(), parent_todo_id: item.id, title, done: false, order: item.subtasks.length };
  item.subtasks.push(newSub);
  input.value = "";
  renderDetailSubtasks(item);
  updateCardInPlace(item);

  if (state.online) {
    const created = await api.createSubtask(item.id, { title, order: newSub.order }).catch(() => null);
    if (created) newSub.id = created.id;
  }
}

/* -- 标签渲染 -- */
function renderDetailTags(item) {
  const tags = item.tags || [];
  const container = $("#detail-tags");
  container.innerHTML = "";

  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full text-white cursor-default group min-h-[32px]";
    chip.style.backgroundColor = tag.color || "#6366f1";
    chip.innerHTML = `
      <span>${tag.name}</span>
      <button class="md:opacity-0 md:group-hover:opacity-100 hover:bg-white/30 rounded-full p-1 transition-opacity min-w-[24px] min-h-[24px] flex items-center justify-center" title="移除标签">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    `;
    chip.querySelector("button").addEventListener("click", async () => {
      item.tags = item.tags.filter((t) => t.id !== tag.id);
      renderDetailTags(item);
      updateCardInPlace(item);
      if (state.online) await api.unbindTag(item.id, tag.id).catch(() => {});
    });
    container.appendChild(chip);
  });

  // 已有标签池
  renderTagPool(item);
}

function renderTagPool(item) {
  const pool = $("#detail-tag-pool");
  const wrapper = $("#detail-tag-existing");
  pool.innerHTML = "";

  const itemTagIds = (item.tags || []).map((t) => t.id);
  const available = state.allTags.filter((t) => !itemTagIds.includes(t.id));

  if (available.length === 0) {
    wrapper.classList.add("hidden");
    return;
  }
  wrapper.classList.remove("hidden");

  available.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "text-xs px-2 py-1 rounded-full text-white hover:opacity-80 transition-opacity";
    btn.style.backgroundColor = tag.color || "#6366f1";
    btn.textContent = `+ ${tag.name}`;
    btn.addEventListener("click", async () => {
      if (!item.tags) item.tags = [];
      item.tags.push(tag);
      renderDetailTags(item);
      updateCardInPlace(item);
      if (state.online) await api.bindTag(item.id, tag.id).catch(() => {});
    });
    pool.appendChild(btn);
  });
}

async function handleAddTag() {
  const input = $("#detail-tag-input");
  const name = input.value.trim();
  if (!name || !currentDetailId) return;
  const item = state.data.find((i) => String(i.id) === String(currentDetailId));
  if (!item) return;

  const color = $("#detail-tag-color").value || "#6366f1";

  // 检查是否已存在同名标签
  let tag = state.allTags.find((t) => t.name === name);
  if (!tag) {
    if (state.online) {
      tag = await api.createTag({ name, color }).catch(() => null);
      if (tag) state.allTags.push(tag);
    } else {
      tag = { id: Date.now(), name, color };
      state.allTags.push(tag);
    }
  }
  if (!tag) return;

  // 绑定到任务
  if (!item.tags) item.tags = [];
  if (!item.tags.find((t) => t.id === tag.id)) {
    item.tags.push(tag);
    if (state.online) await api.bindTag(item.id, tag.id).catch(() => {});
  }

  input.value = "";
  renderDetailTags(item);
  updateCardInPlace(item);
}

/* -- 保存详情修改 -- */
async function handleDetailSave() {
  if (!currentDetailId) return;
  const item = state.data.find((i) => String(i.id) === String(currentDetailId));
  if (!item) return;

  const newStatus = $("#detail-status").value;
  const newPriority = $("#detail-priority").value;
  const newDesc = $("#detail-desc").value.trim();
  const dueVal = $("#detail-due").value;
  const newDue = dueVal ? new Date(dueVal).toISOString() : null;

  // 记录历史
  const oldItem = { ...item };
  delete oldItem.subtasks;
  delete oldItem.tags;
  state.history.push({ id: item.id, action: "edit", data: oldItem, timestamp: Date.now() });
  if (state.history.length > 10) state.history.shift();

  item.status = newStatus;
  item.priority = newPriority;
  item.description = newDesc;
  item.due_date = newDue;

  render();
  closeDetailPanel();
  showUndoToast("任务已更新");

  if (state.online) {
    await api.updateTodo(item.id, {
      status: newStatus,
      priority: newPriority,
      description: newDesc,
      due_date: newDue,
    }).catch(() => {});
  }
}

/* -- 从详情面板删除 -- */
function handleDetailDelete() {
  if (!currentDetailId) return;
  closeDetailPanel();
  openDeleteModal(currentDetailId);
}

/* -- 加载全局标签 -- */
async function loadAllTags() {
  if (!state.online) return;
  try {
    state.allTags = await api.fetchTags();
  } catch {
    state.allTags = [];
  }
}

function bindDetailEvents() {
  $("#detail-close").addEventListener("click", closeDetailPanel);
  $("#detail-backdrop").addEventListener("click", closeDetailPanel);
  $("#detail-save").addEventListener("click", handleDetailSave);
  $("#detail-delete").addEventListener("click", handleDetailDelete);
  bindCalendarEvents();
  $("#detail-sub-add").addEventListener("click", handleAddSubtask);
  $("#detail-sub-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddSubtask(); }
  });
  $("#detail-tag-add").addEventListener("click", handleAddTag);
  $("#detail-tag-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleAddTag(); }
  });
  detailPanel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetailPanel();
  });
  // Custom dropdown toggle
  $("#detail-status-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleDropdown("status"); });
  $("#detail-priority-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleDropdown("priority"); });
  // Custom dropdown selection
  $$("#detail-status-dropdown .status-opt").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateDropdownLabel("status", btn.dataset.value);
      $("#detail-status-dropdown").classList.add("hidden");
    });
  });
  $$("#detail-priority-dropdown .priority-opt").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateDropdownLabel("priority", btn.dataset.value);
      $("#detail-priority-dropdown").classList.add("hidden");
    });
  });
  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    $("#detail-status-dropdown").classList.add("hidden");
    $("#detail-priority-dropdown").classList.add("hidden");
  });
  // Color swatch selection
  $$("#detail-tag-color-swatches .color-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update hidden input
      $("#detail-tag-color").value = btn.dataset.color;
      // Update visual selection
      $$("#detail-tag-color-swatches .color-swatch").forEach((b) => {
        b.classList.remove("ring-2", "ring-indigo-500", "ring-offset-1", "dark:ring-offset-slate-800");
      });
      btn.classList.add("ring-2", "ring-indigo-500", "ring-offset-1", "dark:ring-offset-slate-800");
    });
  });
}

/* ========== 场景模版管理 ========== */
const tplModal = $("#tpl-modal");
const tplEditModal = $("#tpl-edit-modal");
let currentEditTplId = null;

async function loadTemplates() {
  if (!state.online) return;
  try {
    state.templates = await api.fetchTemplates();
  } catch { state.templates = []; }
}

function renderTemplateList() {
  const list = $("#tpl-list");
  const empty = $("#tpl-empty");
  // 清除非 empty 的子元素
  [...list.children].forEach((c) => { if (c.id !== "tpl-empty") c.remove(); });

  if (state.templates.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  state.templates.forEach((tpl) => {
    const card = document.createElement("div");
    card.className = "rounded-lg border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 p-3 shadow-sm";
    const itemCount = tpl.items ? tpl.items.length : 0;
    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">${tpl.icon || "📋"}</span>
          <span class="font-medium text-slate-800 dark:text-slate-100">${tpl.name}</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${itemCount} 项</span>
        </div>
        <div class="flex gap-1">
          <button data-action="edit" class="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors" title="编辑">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button data-action="delete" class="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 transition-colors" title="删除">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      ${tpl.description ? `<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">${tpl.description}</p>` : ""}
      ${itemCount > 0 ? `<div class="text-xs text-slate-500 dark:text-slate-400 mb-2 flex flex-wrap gap-1">${tpl.items.map((i) => `<span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">${i.title}</span>`).join("")}</div>` : ""}
      <button data-action="apply" class="w-full py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:scale-95 transition-all">使用此模版创建待办</button>
    `;
    card.querySelector('[data-action="apply"]').addEventListener("click", () => handleApplyTemplate(tpl.id));
    card.querySelector('[data-action="edit"]').addEventListener("click", () => openTplEditModal(tpl));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => handleDeleteTemplate(tpl.id));
    list.appendChild(card);
  });
}

function openTplModal() {
  loadTemplates().then(() => {
    renderTemplateList();
    tplModal.classList.remove("hidden");
    tplModal.classList.add("flex");
  });
}

function closeTplModal() {
  tplModal.classList.add("hidden");
  tplModal.classList.remove("flex");
}

function openTplEditModal(tpl = null) {
  currentEditTplId = tpl ? tpl.id : null;
  $("#tpl-edit-title").textContent = tpl ? "编辑场景模版" : "新建场景模版";
  $("#tpl-name").value = tpl ? tpl.name : "";
  $("#tpl-icon").value = tpl ? (tpl.icon || "📋") : "📋";
  $("#tpl-desc").value = tpl ? (tpl.description || "") : "";
  const itemsContainer = $("#tpl-items");
  itemsContainer.innerHTML = "";
  if (tpl && tpl.items) {
    tpl.items.forEach((item) => addTplItemRow(item.title, item.priority));
  }
  tplEditModal.classList.remove("hidden");
  tplEditModal.classList.add("flex");
  setTimeout(() => $("#tpl-name").focus(), 50);
}

function closeTplEditModal() {
  tplEditModal.classList.add("hidden");
  tplEditModal.classList.remove("flex");
  currentEditTplId = null;
}

function addTplItemRow(title = "", priority = "normal") {
  const container = $("#tpl-items");
  const row = document.createElement("div");
  row.className = "flex items-center gap-2";
  row.innerHTML = `
    <input class="tpl-item-title flex-1 px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-sm" placeholder="检查项名称" value="${title}" />
    <select class="tpl-item-pri px-2 py-1.5 rounded-md border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 outline-none text-sm">
      <option value="normal" ${priority === "normal" ? "selected" : ""}>普通</option>
      <option value="high" ${priority === "high" ? "selected" : ""}>高</option>
      <option value="low" ${priority === "low" ? "selected" : ""}>低</option>
    </select>
    <button type="button" class="tpl-item-del p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 hover:text-red-600 transition-colors">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  `;
  row.querySelector(".tpl-item-del").addEventListener("click", () => row.remove());
  container.appendChild(row);
  row.querySelector(".tpl-item-title").focus();
}

function collectTplItems() {
  const rows = $$("#tpl-items > div");
  const items = [];
  rows.forEach((row, idx) => {
    const title = row.querySelector(".tpl-item-title").value.trim();
    if (!title) return;
    items.push({ title, priority: row.querySelector(".tpl-item-pri").value, order: idx });
  });
  return items;
}

async function handleSaveTemplate() {
  const name = $("#tpl-name").value.trim();
  if (!name) { $("#tpl-name").focus(); return; }
  const data = {
    name,
    icon: $("#tpl-icon").value.trim() || "📋",
    description: $("#tpl-desc").value.trim() || null,
    items: collectTplItems(),
  };
  try {
    if (currentEditTplId) {
      await api.updateTemplate(currentEditTplId, data);
    } else {
      await api.createTemplate(data);
    }
    closeTplEditModal();
    await loadTemplates();
    renderTemplateList();
    showUndoToast(currentEditTplId ? "模版已更新" : "模版已创建");
  } catch (err) {
    showUndoToast("保存失败: " + (err.message || "未知错误"));
  }
}

async function handleDeleteTemplate(id) {
  try {
    await api.deleteTemplate(id);
    await loadTemplates();
    renderTemplateList();
    showUndoToast("模版已删除");
  } catch (err) {
    showUndoToast("删除失败: " + (err.message || "未知错误"));
  }
}

async function handleApplyTemplate(id) {
  try {
    const created = await api.applyTemplate(id);
    if (created && created.length) {
      // 重新拉取全部待办
      if (state.online) {
        try { state.data = await api.fetchTodos(); } catch {}
      }
      render();
      closeTplModal();
      showUndoToast(`已从模版创建 ${created.length} 个待办`);
    }
  } catch (err) {
    showUndoToast("创建失败: " + (err.message || "未知错误"));
  }
}

function bindTplEvents() {
  $("#tpl-btn").addEventListener("click", openTplModal);
  $("#tpl-close").addEventListener("click", closeTplModal);
  tplModal.addEventListener("click", (e) => { if (e.target === tplModal) closeTplModal(); });
  $("#tpl-create-btn").addEventListener("click", () => openTplEditModal());
  $("#tpl-edit-cancel").addEventListener("click", closeTplEditModal);
  tplEditModal.addEventListener("click", (e) => { if (e.target === tplEditModal) closeTplEditModal(); });
  $("#tpl-edit-save").addEventListener("click", handleSaveTemplate);
  $("#tpl-add-item").addEventListener("click", () => addTplItemRow());
}

/* ========== 示例数据（带截止日期、子任务、标签） ========== */
function getSampleData() {
  const now = new Date();
  const h = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  // 离线模式下的示例标签
  state.allTags = [
    { id: 101, name: "前端", color: "#6366f1" },
    { id: 102, name: "后端", color: "#10b981" },
    { id: 103, name: "紧急", color: "#ef4444" },
    { id: 104, name: "设计", color: "#ec4899" },
    { id: 105, name: "文档", color: "#f59e0b" },
  ];
  return [
    { id: 1, title: "完成项目提案", description: "整理需求文档并提交审批", status: "todo", priority: "high", due_date: h(-2),
      subtasks: [
        { id: 1001, parent_todo_id: 1, title: "收集需求", done: true, order: 0 },
        { id: 1002, parent_todo_id: 1, title: "撰写文档", done: true, order: 1 },
        { id: 1003, parent_todo_id: 1, title: "提交审批", done: false, order: 2 },
      ],
      tags: [{ id: 103, name: "紧急", color: "#ef4444" }, { id: 105, name: "文档", color: "#f59e0b" }],
    },
    { id: 2, title: "修复登录页 Bug", description: "用户反馈无法通过邮箱登录", status: "todo", priority: "high", due_date: h(3),
      subtasks: [
        { id: 1004, parent_todo_id: 2, title: "复现问题", done: true, order: 0 },
        { id: 1005, parent_todo_id: 2, title: "定位原因", done: false, order: 1 },
        { id: 1006, parent_todo_id: 2, title: "修复并测试", done: false, order: 2 },
      ],
      tags: [{ id: 101, name: "前端", color: "#6366f1" }, { id: 103, name: "紧急", color: "#ef4444" }],
    },
    { id: 3, title: "设计系统初始化", description: "固化色彩与字体规范", status: "todo", priority: "normal", due_date: h(24), subtasks: [], tags: [{ id: 104, name: "设计", color: "#ec4899" }] },
    { id: 4, title: "编写单元测试", description: "覆盖核心业务逻辑", status: "todo", priority: "normal", due_date: h(48), subtasks: [], tags: [{ id: 102, name: "后端", color: "#10b981" }] },
    { id: 5, title: "准备周会 PPT", description: "汇报本周进度与下周计划", status: "todo", priority: "normal", due_date: h(6), subtasks: [], tags: [{ id: 105, name: "文档", color: "#f59e0b" }] },
    { id: 6, title: "代码审查", description: "Review 同事的 PR #42", status: "todo", priority: "low", due_date: h(72), subtasks: [], tags: [] },
    { id: 7, title: "更新 API 文档", description: "补充新增接口说明", status: "todo", priority: "low", due_date: null, subtasks: [], tags: [{ id: 105, name: "文档", color: "#f59e0b" }] },
    { id: 8, title: "实现列表视图", description: "搜索与筛选功能", status: "doing", priority: "high", due_date: h(-5),
      subtasks: [
        { id: 1007, parent_todo_id: 8, title: "搜索功能", done: true, order: 0 },
        { id: 1008, parent_todo_id: 8, title: "筛选功能", done: true, order: 1 },
        { id: 1009, parent_todo_id: 8, title: "分页功能", done: false, order: 2 },
        { id: 1010, parent_todo_id: 8, title: "UI 优化", done: false, order: 3 },
      ],
      tags: [{ id: 101, name: "前端", color: "#6366f1" }],
    },
    { id: 9, title: "优化数据库查询", description: "慢查询分析与索引优化", status: "doing", priority: "normal", due_date: h(12), subtasks: [], tags: [{ id: 102, name: "后端", color: "#10b981" }] },
    { id: 10, title: "部署测试环境", description: "配置 CI/CD 流水线", status: "doing", priority: "normal", due_date: h(36), subtasks: [], tags: [{ id: 102, name: "后端", color: "#10b981" }] },
    { id: 11, title: "实现看板拖拽", description: "移动端长按交互", status: "done", priority: "low", due_date: null, subtasks: [], tags: [{ id: 101, name: "前端", color: "#6366f1" }] },
    { id: 12, title: "搭建项目骨架", description: "初始化前后端项目结构", status: "done", priority: "normal", due_date: null, subtasks: [], tags: [] },
  ];
}

/* ========== 设置页面 ========== */
const settingsModal = $("#settings-modal");

function openSettings() {
  const urlInput = $("#settings-api-url");
  urlInput.value = getApiHost() || "";
  updateSettingsStatus();
  hideSettingsTestResult();
  settingsModal.classList.remove("hidden");
  settingsModal.classList.add("flex");
  setTimeout(() => urlInput.focus(), 50);
}

function closeSettings() {
  settingsModal.classList.add("hidden");
  settingsModal.classList.remove("flex");
}

function updateSettingsStatus() {
  const dot = $("#settings-status-dot");
  const text = $("#settings-status-text");
  if (state.online) {
    dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
    text.textContent = `已连接: ${getApiHost()}`;
  } else if (getApiHost()) {
    dot.className = "w-2.5 h-2.5 rounded-full bg-amber-500";
    text.textContent = "已配置但未连接";
  } else {
    dot.className = "w-2.5 h-2.5 rounded-full bg-gray-400";
    text.textContent = "离线模式";
  }
}

function showSettingsTestResult(ok, msg) {
  const el = $("#settings-test-result");
  el.classList.remove("hidden");
  if (ok) {
    el.className = "text-sm px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    el.textContent = msg || "连接成功 ✓";
  } else {
    el.className = "text-sm px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800";
    el.textContent = msg || "连接失败 ✗";
  }
}

function hideSettingsTestResult() {
  $("#settings-test-result").classList.add("hidden");
}

async function handleSettingsTest() {
  const url = $("#settings-api-url").value.trim().replace(/\/+$/, "");
  if (!url) {
    showSettingsTestResult(false, "请输入 API 地址");
    return;
  }
  const btn = $("#settings-test");
  btn.textContent = "测试中...";
  btn.disabled = true;
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      showSettingsTestResult(true, "连接成功 ✓");
    } else {
      showSettingsTestResult(false, `服务器返回 ${res.status}`);
    }
  } catch (e) {
    showSettingsTestResult(false, `连接失败: ${e.message || "网络错误"}`);
  } finally {
    btn.textContent = "测试连接";
    btn.disabled = false;
  }
}

async function handleSettingsSave() {
  const url = $("#settings-api-url").value.trim().replace(/\/+$/, "");
  setApiHost(url);
  closeSettings();

  // 重新检测连接状态
  state.online = await api.checkHealth();
  if (state.online && !api.getToken()) {
    showAuthView();
  } else if (state.online && api.getToken()) {
    try {
      state.data = await api.fetchTodos();
      state.authenticated = true;
      render();
      showAppView();
      showUndoToast("已连接到服务器");
    } catch {
      api.clearToken();
      showAuthView(true);
    }
  } else {
    showUndoToast(url ? "无法连接服务器，保持离线模式" : "已切换到离线模式");
  }
}

function handleSettingsClear() {
  clearApiHost();
  $("#settings-api-url").value = "";
  hideSettingsTestResult();
  updateSettingsStatus();
}

function bindSettingsEvents() {
  const mobileBtn = $("#settings-btn");
  const desktopBtn = $("#settings-btn-desktop");
  if (mobileBtn) mobileBtn.addEventListener("click", openSettings);
  if (desktopBtn) desktopBtn.addEventListener("click", openSettings);
  $("#settings-cancel").addEventListener("click", closeSettings);
  $("#settings-test").addEventListener("click", handleSettingsTest);
  $("#settings-save").addEventListener("click", handleSettingsSave);
  $("#settings-clear").addEventListener("click", handleSettingsClear);
  settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) closeSettings(); });
  settingsModal.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSettings(); });
}

/* ========== 手势交互：Tab 左右滑动 + 卡片滑动操作 ========== */
function initSwipeGestures() {
  const isMobile = () => !window.matchMedia("(min-width: 768px)").matches;

  // --- Tab 左右滑动切换 ---
  const mainEl = document.querySelector("main");
  if (mainEl) {
    let startX = 0, startY = 0, tracking = false;
    mainEl.addEventListener("touchstart", (e) => {
      if (!isMobile()) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });
    mainEl.addEventListener("touchend", (e) => {
      if (!tracking || !isMobile()) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return; // 不够远或纵向滑动
      const order = ["todo", "doing", "done"];
      const idx = order.indexOf(mobileActive);
      if (dx < 0 && idx < 2) { mobileActive = order[idx + 1]; updateMobileView(); }
      else if (dx > 0 && idx > 0) { mobileActive = order[idx - 1]; updateMobileView(); }
    }, { passive: true });
  }

  // --- 卡片滑动操作（事件委托） ---
  Object.values(cols).forEach((col) => {
    let swipeEl = null, swipeStartX = 0, swipeStartY = 0, swiping = false, swipeDx = 0;

    col.addEventListener("touchstart", (e) => {
      if (!isMobile()) return;
      const container = e.target.closest(".swipe-container");
      if (!container) return;
      swipeEl = container;
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
      swiping = false;
      swipeDx = 0;
      const content = swipeEl.querySelector(".swipe-content");
      if (content) content.classList.add("swiping");
    }, { passive: true });

    col.addEventListener("touchmove", (e) => {
      if (!swipeEl || !isMobile()) return;
      const dx = e.touches[0].clientX - swipeStartX;
      const dy = e.touches[0].clientY - swipeStartY;
      if (!swiping && Math.abs(dy) > Math.abs(dx)) { swipeEl = null; return; }
      if (Math.abs(dx) > 10) swiping = true;
      if (!swiping) return;
      e.preventDefault();
      swipeDx = Math.max(-100, Math.min(100, dx));
      const content = swipeEl.querySelector(".swipe-content");
      if (content) content.style.transform = `translateX(${swipeDx}px)`;
      // 显示对应操作背景
      const leftAction = swipeEl.querySelector(".swipe-action-left");
      const rightAction = swipeEl.querySelector(".swipe-action-right");
      if (leftAction) leftAction.style.opacity = swipeDx > 30 ? "1" : "0";
      if (rightAction) rightAction.style.opacity = swipeDx < -30 ? "1" : "0";
    }, { passive: false });

    col.addEventListener("touchend", () => {
      if (!swipeEl) return;
      const content = swipeEl.querySelector(".swipe-content");
      const leftAction = swipeEl.querySelector(".swipe-action-left");
      const rightAction = swipeEl.querySelector(".swipe-action-right");
      const id = swipeEl.dataset.id;

      if (content) { content.classList.remove("swiping"); content.style.transform = ""; }
      if (leftAction) leftAction.style.opacity = "0";
      if (rightAction) rightAction.style.opacity = "0";

      if (swiping && id) {
        if (swipeDx > 70) {
          // 右滑 → 标记完成
          changeStatus(id, "done");
        } else if (swipeDx < -70) {
          // 左滑 → 删除
          openDeleteModal(id);
        }
      }
      swipeEl = null;
      swiping = false;
      swipeDx = 0;
    }, { passive: true });
  });
}

/* ========== 手势交互：下拉刷新 ========== */
function initPullToRefresh() {
  const isMobile = () => !window.matchMedia("(min-width: 768px)").matches;
  const appView = $("#app-view");
  const pullEl = $("#pull-refresh");
  const pullText = $("#pull-text");
  if (!appView || !pullEl) return;

  let startY = 0, pulling = false, pullDist = 0;
  const threshold = 60;

  appView.addEventListener("touchstart", (e) => {
    if (!isMobile() || !state.online) return;
    if (appView.scrollTop > 5) return; // 只在顶部触发
    startY = e.touches[0].clientY;
    pulling = true;
    pullDist = 0;
  }, { passive: true });

  appView.addEventListener("touchmove", (e) => {
    if (!pulling) return;
    pullDist = Math.max(0, e.touches[0].clientY - startY);
    if (pullDist > 10) {
      const h = Math.min(pullDist * 0.5, 80);
      pullEl.style.height = `${h}px`;
      pullEl.style.opacity = Math.min(h / 40, 1);
      pullEl.style.transform = `translateY(0)`;
      if (pullDist > threshold) {
        pullText.textContent = "释放刷新";
        pullEl.querySelector(".pull-icon").style.transform = "rotate(180deg)";
      } else {
        pullText.textContent = "下拉刷新";
        pullEl.querySelector(".pull-icon").style.transform = "";
      }
    }
  }, { passive: true });

  appView.addEventListener("touchend", async () => {
    if (!pulling) return;
    pulling = false;
    if (pullDist > threshold && state.online) {
      pullText.textContent = "刷新中...";
      pullEl.classList.add("refreshing");
      try {
        state.data = await api.fetchTodos();
        render();
        showUndoToast("数据已刷新");
      } catch { /* ignore */ }
      pullEl.classList.remove("refreshing");
    }
    pullEl.style.height = "0";
    pullEl.style.opacity = "0";
    pullEl.style.transform = "translateY(-1rem)";
    pullDist = 0;
  }, { passive: true });
}

/* ========== 手势交互：详情面板 Bottom Sheet 拖拽关闭 ========== */
function initDetailSheetDrag() {
  const isMobile = () => !window.matchMedia("(min-width: 768px)").matches;
  const drawer = $("#detail-drawer");
  if (!drawer) return;

  let startY = 0, dragging = false, dragDist = 0;
  const dragHandle = drawer; // 整个 drawer 头部区域可拖拽

  dragHandle.addEventListener("touchstart", (e) => {
    if (!isMobile()) return;
    // 只在内容区滚动到顶部时允许拖拽
    const scrollArea = drawer.querySelector(".overflow-y-auto");
    if (scrollArea && scrollArea.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    dragging = true;
    dragDist = 0;
  }, { passive: true });

  dragHandle.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    dragDist = e.touches[0].clientY - startY;
    if (dragDist < 0) { dragDist = 0; return; } // 只允许下拉
    if (dragDist > 20) {
      drawer.style.transition = "none";
      drawer.style.transform = `translateY(${dragDist}px)`;
    }
  }, { passive: true });

  dragHandle.addEventListener("touchend", () => {
    if (!dragging) return;
    dragging = false;
    drawer.style.transition = "";
    if (dragDist > 120) {
      closeDetailPanel();
    } else {
      drawer.style.transform = "";
      // 恢复正常位置
      const isMob = !window.matchMedia("(min-width: 768px)").matches;
      if (isMob) {
        drawer.classList.remove("translate-y-full");
      }
    }
    dragDist = 0;
  }, { passive: true });
}

/* ========== 离线状态指示器 ========== */
function initOfflineIndicator() {
  const banner = $("#offline-banner");
  const bannerText = $("#offline-banner-text");
  if (!banner) return;

  function showBanner(text, type) {
    bannerText.textContent = text;
    banner.classList.remove("hidden", "bg-amber-100", "dark:bg-amber-900/30", "text-amber-800", "dark:text-amber-200",
      "bg-emerald-100", "dark:bg-emerald-900/30", "text-emerald-800", "dark:text-emerald-200");
    if (type === "offline") {
      banner.classList.add("bg-amber-100", "dark:bg-amber-900/30", "text-amber-800", "dark:text-amber-200");
    } else {
      banner.classList.add("bg-emerald-100", "dark:bg-emerald-900/30", "text-emerald-800", "dark:text-emerald-200");
    }
  }

  function hideBanner() {
    banner.classList.add("hidden");
  }

  // 初始状态
  if (!navigator.onLine) {
    showBanner("当前处于离线模式，数据仅保存在本地", "offline");
  }

  window.addEventListener("offline", () => {
    state.online = false;
    showBanner("网络已断开，切换到离线模式", "offline");
  });

  window.addEventListener("online", async () => {
    // 重新检测后端
    state.online = await api.checkHealth();
    if (state.online) {
      showBanner("网络已恢复", "online");
      setTimeout(hideBanner, 3000);
      // 尝试同步数据
      if (api.getToken()) {
        try {
          state.data = await api.fetchTodos();
          render();
        } catch { /* ignore */ }
      }
    } else {
      showBanner("网络已恢复，但无法连接服务器", "offline");
    }
  });
}

/* ========== 启动动画 ========== */
function initSplashAnimation() {
  const splash = $("#splash-screen");
  if (!splash) return;

  // 粒子动画
  const canvas = $("#splash-particles");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 1 - 0.3,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    let animId;
    function drawParticles() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) { p.y = window.innerHeight + 10; p.x = Math.random() * window.innerWidth; }
        if (p.x < -10) p.x = window.innerWidth + 10;
        if (p.x > window.innerWidth + 10) p.x = -10;
      });
      animId = requestAnimationFrame(drawParticles);
    }
    drawParticles();
    // 存储 animId 以便后续清理
    splash._particleAnim = animId;
  }

  // 触发入场动画
  requestAnimationFrame(() => {
    const icon = $("#splash-icon");
    const title = $("#splash-title");
    const loader = $("#splash-loader");
    if (icon) { icon.style.opacity = "1"; icon.style.transform = "scale(1) translateY(0)"; }
    if (title) { title.style.opacity = "1"; title.style.transform = "translateY(0)"; }
    if (loader) loader.style.opacity = "1";
  });
}

function dismissSplash() {
  const splash = $("#splash-screen");
  if (!splash) return;
  splash.classList.add("splash-exit");
  if (splash._particleAnim) cancelAnimationFrame(splash._particleAnim);
  setTimeout(() => splash.remove(), 700);
}

/* ========== 初始化 ========== */
export async function init() {
  // 启动动画
  initSplashAnimation();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      const prefix = location.origin + "/apps/web/";
      regs.forEach((r) => { if (r.scope?.startsWith(prefix)) r.unregister(); });
    });
    navigator.serviceWorker.register("./sw.js").then((r) => r.update());
  }

  initTheme();
  bindAuthEvents();

  state.online = await api.checkHealth();
  const hasToken = !!api.getToken();

  if (state.online && hasToken) {
    try {
      state.data = await api.fetchTodos();
      state.authenticated = true;
      ensureAppReady();
      render();
      showAppView();
    } catch {
      api.clearToken();
      showAuthView(true);
    }
  } else if (state.online && !hasToken) {
    showAuthView();
  } else {
    state.data = api.loadLocal();
    ensureAppReady();
    render();
    showAppView();
  }

  // 最少显示 1.5 秒启动动画，然后淡出
  setTimeout(dismissSplash, 1500);

  // 每分钟刷新倒计时
  setInterval(() => {
    if (!authView.classList.contains("hidden")) return;
    render();
  }, 60000);
}
