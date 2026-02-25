/**
 * API 客户端 — 封装与后端的所有 HTTP 交互
 * 当后端不可用时自动降级为本地 localStorage 存储
 * 支持 Capacitor Android 环境 + 可配置 API 地址
 */

const API_HOST_KEY = "api_host_url";

function isCapacitor() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function resolveApiHost() {
  // 优先使用用户配置的地址（忽略空值）
  const saved = (localStorage.getItem(API_HOST_KEY) || "").replace(/\/+$/, "").trim();
  if (saved) return saved;

  // 浏览器环境：localhost 指向本地开发服务器
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return `${location.protocol}//${location.hostname}:8001`;
  }

  // 生产环境 / Capacitor 远程加载模式：使用 nginx 代理
  return "/api";
}

let _apiHost = resolveApiHost();

function getApiBase() { return `${_apiHost}/todos`; }
function getAuthBase() { return `${_apiHost}/auth`; }
function getTemplateBase() { return `${_apiHost}/scene-templates`; }
function getTagBase() { return `${_apiHost}/tags`; }
function getSubtaskBase(todoId) { return `${_apiHost}/todos/${todoId}/subtasks`; }

/* ---- API 地址管理 ---- */

export function setApiHost(url) {
  const clean = (url || "").replace(/\/+$/, "").trim();
  if (clean) {
    localStorage.setItem(API_HOST_KEY, clean);
    _apiHost = clean;
  } else {
    // 空值等同于清除自定义配置，回退到默认
    localStorage.removeItem(API_HOST_KEY);
    _apiHost = resolveApiHost();
  }
}

export function getApiHost() {
  return _apiHost;
}

export function clearApiHost() {
  localStorage.removeItem(API_HOST_KEY);
  _apiHost = resolveApiHost();
}

export { isCapacitor };

/* ---- Token 管理 ---- */

let _token = localStorage.getItem("auth_token") || "";

export function setToken(t) {
  _token = t;
  localStorage.setItem("auth_token", t);
}

export function getToken() {
  return _token;
}

export function clearToken() {
  _token = "";
  localStorage.removeItem("auth_token");
}

function headers() {
  const h = { "Content-Type": "application/json" };
  if (_token) h["Authorization"] = `Bearer ${_token}`;
  return h;
}

async function request(method, path, body) {
  const opts = { method, headers: headers() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 204) return null;
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("auth:expired"));
    const err = await res.json().catch(() => ({ detail: "Unauthorized" }));
    throw new Error(err.detail || "Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

/* ---- Auth ---- */

export async function register(email, password, displayName) {
  const body = { email, password };
  if (displayName) body.display_name = displayName;
  let res;
  try {
    res = await fetch(`${getAuthBase()}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`无法连接服务器 (${_apiHost})，请检查网络或在设置中配置正确的 API 地址`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "注册失败");
  }
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

export async function login(email, password) {
  let res;
  try {
    res = await fetch(`${getAuthBase()}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (e) {
    throw new Error(`无法连接服务器 (${_apiHost})，请检查网络或在设置中配置正确的 API 地址`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "登录失败");
  }
  const data = await res.json();
  setToken(data.access_token);
  return data;
}

/* ---- CRUD ---- */

export async function fetchTodos({ query, status, priority, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return request("GET", `${getApiBase()}?${params}`);
}

export async function createTodo(data) {
  return request("POST", getApiBase(), data);
}

export async function updateTodo(id, data) {
  return request("PUT", `${getApiBase()}/${id}`, data);
}

export async function deleteTodo(id) {
  return request("DELETE", `${getApiBase()}/${id}`);
}

/* ---- 场景模版 ---- */

export async function fetchTemplates() {
  return request("GET", getTemplateBase());
}

export async function createTemplate(data) {
  return request("POST", getTemplateBase(), data);
}

export async function updateTemplate(id, data) {
  return request("PUT", `${getTemplateBase()}/${id}`, data);
}

export async function deleteTemplate(id) {
  return request("DELETE", `${getTemplateBase()}/${id}`);
}

export async function applyTemplate(id) {
  return request("POST", `${getTemplateBase()}/${id}/apply`);
}

/* ---- 子任务 ---- */

export async function fetchSubtasks(todoId) {
  return request("GET", getSubtaskBase(todoId));
}

export async function createSubtask(todoId, data) {
  return request("POST", getSubtaskBase(todoId), data);
}

export async function updateSubtask(todoId, subtaskId, data) {
  return request("PUT", `${getSubtaskBase(todoId)}/${subtaskId}`, data);
}

export async function deleteSubtask(todoId, subtaskId) {
  return request("DELETE", `${getSubtaskBase(todoId)}/${subtaskId}`);
}

/* ---- 标签 ---- */

export async function fetchTags() {
  return request("GET", getTagBase());
}

export async function createTag(data) {
  return request("POST", getTagBase(), data);
}

export async function deleteTag(tagId) {
  return request("DELETE", `${getTagBase()}/${tagId}`);
}

export async function bindTag(todoId, tagId) {
  return request("POST", `${getTagBase()}/bind/${todoId}/${tagId}`);
}

export async function unbindTag(todoId, tagId) {
  return request("DELETE", `${getTagBase()}/bind/${todoId}/${tagId}`);
}

/* ---- 本地降级存储 ---- */

const STORAGE_KEY = "todolist_local";

export function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveLocal(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---- 健康检查 ---- */

export async function checkHealth() {
  if (!_apiHost) return false;
  try {
    const res = await fetch(`${_apiHost}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
