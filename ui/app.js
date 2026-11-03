import { LANGUAGES, defaultSettings, captureSettings, swappedLanguages, shortcutFromEvent, sameShortcut } from "./capture-controls.mjs";

const app = document.querySelector("#app");
const mode = window.__APP_MODE__ || "main";
document.body.dataset.mode = mode.startsWith("overlay") ? "overlay" : "main";
const state = { settings: null, settingsOpen: true, busy: false, status: "", statusType: "", recording: null };
let invoke, listen;
let pendingSave = Promise.resolve();
const icons = {
  capture: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/><path d="M8 8h8v8H8z"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  pin: '<path d="M9 3h6l-1 7 3 3v2H7v-2l3-3zM12 15v6"/>',
  settings: '<path d="m9 3-1 3-3 1v4l2 1-2 2v4l3 1 1 2h6l1-2 3-1v-4l-2-2 2-1V7l-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const shortcutHtml = value => value ? value.replaceAll("CommandOrControl", "Ctrl").replaceAll("Control", "Ctrl").split("+").map(part => `<kbd>${escapeHtml(part)}</kbd>`).join('<span class="key-plus">+</span>') : '<span class="muted">未设置</span>';

function setCapturePreparing(active) {
  document.documentElement.classList.toggle("capture-preparing", active);
  document.body.classList.toggle("capture-preparing", active);
}

function updateStatus() {
  const status = document.querySelector("#status");
  if (status) {
    status.textContent = state.status || "框选后自动翻译，按 Esc 或右键取消";
    status.classList.toggle("error", state.statusType === "error");
  }
  document.querySelectorAll("[data-capture]").forEach(button => { button.disabled = state.busy || Boolean(state.recording); });
}

function showError(error) {
  state.status = error instanceof Error ? error.message : String(error);
  state.statusType = "error";
  updateStatus();
}

async function ensureTauriApi() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const tauri = window.__TAURI__;
    const internal = window.__TAURI_INTERNALS__;
    invoke = tauri?.core?.invoke || internal?.invoke;
    listen = tauri?.event?.listen;
    if (invoke) return;
    if (!tauri && !internal && attempt > 4) break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  // Standalone browser preview. Capture always requires the desktop runtime.
  invoke = async (command, args) => {
    if (command === "load_settings") return captureSettings(JSON.parse(localStorage.getItem("screentrans-preview") || "null") || defaultSettings());
    if (command === "save_settings") {
      localStorage.setItem("screentrans-preview", JSON.stringify(captureSettings(args.settings)));
      return args.settings;
    }
    if (["set_pin_on_top", "resize_main_window", "hide_window"].includes(command)) return;
    throw new Error("请在 ScreenTrans 桌面应用中使用截图功能");
  };
}

function saveSettings() {
  const snapshot = captureSettings(state.settings);
  const task = pendingSave.then(() => invoke("save_settings", { settings: snapshot }));
  pendingSave = task.catch(() => {});
  return task;
}

async function changeSetting(key, value) {
  const previous = state.settings[key];
  state.settings[key] = value;
  try {
    await saveSettings();
    state.status = "设置已保存";
    state.statusType = "";
  } catch (error) {
    if (state.settings[key] === value) state.settings[key] = previous;
    showError(error);
  }
  renderMain();
}

function languageOptions(selected, target = false) {
  return LANGUAGES.filter(([value]) => !target || value !== "auto").map(([value, label]) =>
    `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("");
}

function renderMain() {
  if (!state.settings) {
    app.innerHTML = '<main class="screen-app"><section class="card loading-card">正在加载…</section></main>';
    return;
  }
  const settings = state.settings;
  app.innerHTML = `
    <main class="screen-app">
      <header class="app-header" data-tauri-drag-region>
        <div class="brand"><span class="brand-icon">${icon("capture")}</span><div><h1>ScreenTrans</h1><p>截图翻译 · 截图取字</p></div></div>
        <div class="header-actions">
          <button class="icon-button ${settings.pinOnTop ? "active" : ""}" id="pin-btn" title="${settings.pinOnTop ? "取消置顶" : "置顶窗口"}" aria-label="${settings.pinOnTop ? "取消置顶" : "置顶窗口"}" aria-pressed="${settings.pinOnTop}">${icon("pin")}</button>
          <button class="icon-button ${state.settingsOpen ? "active" : ""}" id="settings-btn" title="基础设置" aria-label="基础设置" aria-expanded="${state.settingsOpen}" aria-controls="settings-panel">${icon("settings")}</button>
        </div>
      </header>
      <section class="card capture-card" aria-label="截图操作">
        <div class="language-row">
          <label class="language-field"><span>源语言</span><select id="from-lang" aria-label="源语言">${languageOptions(settings.fromLang)}</select></label>
          <button class="swap-button" id="lang-swap" title="交换源语言和目标语言" aria-label="交换源语言和目标语言">⇄</button>
          <label class="language-field"><span>目标语言</span><select id="to-lang" aria-label="目标语言">${languageOptions(settings.toLang, true)}</select></label>
        </div>
        <div class="capture-actions">
          <button class="action-button primary" data-capture="begin_capture">${icon("capture")}<span class="action-label">截图翻译</span><span class="action-shortcut">${shortcutHtml(settings.hotkey)}</span></button>
          <button class="action-button secondary" data-capture="begin_copy_capture">${icon("copy")}<span class="action-label">截图取字</span><span class="action-shortcut">${shortcutHtml(settings.copyHotkey)}</span></button>
        </div>
        <p class="status" id="status" role="status" aria-live="polite"></p>
      </section>
      <section class="card settings-card" id="settings-panel" aria-label="基础设置" ${state.settingsOpen ? "" : "hidden"}>
        <div class="setting-row"><div><span class="setting-label">开机自启</span><p class="setting-description">启动后静默进入系统托盘</p></div><button class="toggle ${settings.autostart ? "on" : ""}" id="autostart" role="switch" aria-label="开机自启" aria-checked="${settings.autostart}"></button></div>
        <div class="setting-row"><label class="setting-label" for="shortcut-row">截图翻译</label><button class="shortcut-button" id="shortcut-row" title="点击修改快捷键">${shortcutHtml(settings.hotkey)}<span class="shortcut-hint">修改</span></button></div>
        <div class="setting-row"><label class="setting-label" for="copy-shortcut-row">截图取字</label><button class="shortcut-button" id="copy-shortcut-row" title="点击修改快捷键">${shortcutHtml(settings.copyHotkey)}<span class="shortcut-hint">修改</span></button></div>
      </section>
      <footer class="app-footer">关闭窗口后继续驻留托盘</footer>
    </main>`;
  updateStatus();
  document.querySelector("#from-lang").addEventListener("change", event => { void changeSetting("fromLang", event.target.value); });
  document.querySelector("#to-lang").addEventListener("change", event => { void changeSetting("toLang", event.target.value); });
  document.querySelector("#lang-swap").addEventListener("click", async () => {
    const previous = { ...state.settings };
    Object.assign(state.settings, swappedLanguages(settings.fromLang, settings.toLang));
    try { await saveSettings(); } catch (error) { state.settings = previous; showError(error); }
    renderMain();
  });
  document.querySelector("#autostart").addEventListener("click", () => { void changeSetting("autostart", !settings.autostart); });
  document.querySelector("#pin-btn").addEventListener("click", () => { void changeSetting("pinOnTop", !settings.pinOnTop); });
  document.querySelector("#settings-btn").addEventListener("click", () => { state.settingsOpen = !state.settingsOpen; renderMain(); void fitWindowToContent().catch(showError); });
  document.querySelectorAll("[data-capture]").forEach(button => button.addEventListener("click", () => { void startCapture(button.dataset.capture); }));
  document.querySelector("#shortcut-row").addEventListener("click", () => recordShortcut("hotkey", "#shortcut-row"));
  document.querySelector("#copy-shortcut-row").addEventListener("click", () => recordShortcut("copyHotkey", "#copy-shortcut-row"));
}

async function fitWindowToContent() {
  await new Promise(resolve => requestAnimationFrame(resolve));
  const content = document.querySelector(".screen-app");
  if (content) await invoke("resize_main_window", { height: Math.max(240, Math.min(640, Math.ceil(content.getBoundingClientRect().height))) });
}

async function startCapture(command) {
  if (state.busy || state.recording) return;
  state.busy = true;
  updateStatus();
  try {
    await saveSettings();
    setCapturePreparing(true);
    document.activeElement?.blur();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await invoke(command);
  } catch (error) {
    state.busy = false;
    setCapturePreparing(false);
    showError(error);
  }
}

function recordShortcut(field, selector) {
  if (state.recording) return;
  const button = document.querySelector(selector);
  state.recording = field;
  button.classList.add("recording");
  button.textContent = "按下组合键…";
  state.status = "按 Esc 取消，按 Backspace 清除快捷键";
  state.statusType = "";
  updateStatus();
  const finish = value => {
    document.removeEventListener("keydown", onKey, true);
    window.removeEventListener("blur", cancel);
    state.recording = null;
    state.status = "";
    if (value !== null) void changeSetting(field, value);
    else renderMain();
  };
  const cancel = () => finish(null);
  const onKey = event => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") return finish(null);
    if (event.key === "Backspace" && !event.ctrlKey && !event.altKey && !event.metaKey) return finish("");
    const shortcut = shortcutFromEvent(event);
    if (!shortcut) return;
    const other = field === "hotkey" ? "copyHotkey" : "hotkey";
    if (sameShortcut(shortcut, state.settings[other])) {
      state.status = "截图翻译和截图取字需要使用不同的快捷键";
      state.statusType = "error";
      updateStatus();
      return;
    }
    finish(shortcut);
  };
  document.addEventListener("keydown", onKey, true);
  window.addEventListener("blur", cancel, { once: true });
}

async function renderOverlay() {
  const payload = await invoke("load_overlay_payload");
  const selection = payload.selection;
  const ratio = window.devicePixelRatio || 1;
  app.innerHTML = '<div class="overlay-root"><img class="overlay-image" alt="截图翻译结果"></div>';
  const image = document.querySelector(".overlay-image");
  image.src = `data:image/jpeg;base64,${payload.renderedImageBase64}`;
  Object.assign(image.style, { left: `${selection.x / ratio}px`, top: `${selection.y / ratio}px`, width: `${selection.width / ratio}px`, height: `${selection.height / ratio}px`, opacity: payload.overlayOpacity });
  if (payload.closeOnOutsideClick) document.querySelector(".overlay-root").addEventListener("click", () => { void invoke("close_overlay"); });
  window.addEventListener("keydown", event => { if (event.key === "Escape") void invoke("close_overlay"); });
}

async function boot() {
  if (mode === "main") renderMain();
  await ensureTauriApi();
  if (mode.startsWith("overlay")) return renderOverlay();
  state.settings = captureSettings(await invoke("load_settings"));
  if (listen) await listen("workflow:state", event => {
    const payload = event.payload || {};
    state.busy = Boolean(payload.busy);
    state.status = payload.message || "";
    state.statusType = payload.type || "";
    if (!state.busy) setCapturePreparing(false);
    updateStatus();
  });
  renderMain();
  await fitWindowToContent();
}

window.addEventListener("focus", () => setCapturePreparing(false));
document.addEventListener("keydown", event => { if (event.key === "Escape" && mode === "main" && !state.recording) void invoke?.("hide_window"); });
boot().catch(error => {
  app.innerHTML = `<main class="screen-app"><section class="card loading-card"><p class="error">启动失败：${escapeHtml(error instanceof Error ? error.message : error)}</p><button class="retry-button">重试</button></section></main>`;
  document.querySelector(".retry-button").addEventListener("click", () => location.reload());
});
