export const LANGUAGES = [
  ["auto", "自动检测"], ["zh-CHS", "中文简体"], ["zh-CHT", "中文繁体"],
  ["en", "英语"], ["ja", "日语"], ["ko", "韩语"],
  ["fr", "法语"], ["de", "德语"], ["ru", "俄语"], ["es", "西班牙语"],
];

export function defaultSettings() {
  return {
    fromLang: "auto", toLang: "zh-CHS", autostart: false,
    hotkey: "CommandOrControl+Shift+X", copyHotkey: "CommandOrControl+Shift+C",
    pinOnTop: false, overlayOpacity: 0.92, overlayFontScale: 1, closeOnOutsideClick: true,
  };
}

export function captureSettings(value = {}) {
  const defaults = defaultSettings();
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
    key, typeof value[key] === typeof fallback ? value[key] : fallback,
  ]));
}

export function swappedLanguages(from, to) {
  return { fromLang: to, toLang: from === "auto" ? (to === "zh-CHS" ? "en" : "zh-CHS") : from };
}

const KEY_NAMES = {
  " ": "Space", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
  Enter: "Return", Tab: "Tab", Backspace: "Backspace", Delete: "Delete", Insert: "Insert",
  Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown",
};

export function shortcutFromEvent(event) {
  if (event.isComposing || ["Control", "Alt", "Shift", "Meta", "Escape"].includes(event.key)) return null;
  const modifiers = [];
  if (event.ctrlKey) modifiers.push("CommandOrControl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.metaKey) modifiers.push("Super");
  const key = /^Key[A-Z]$/.test(event.code ?? "") ? event.code.slice(3)
    : KEY_NAMES[event.key] ?? (/^F\d{1,2}$/.test(event.key) ? event.key
      : event.key.length === 1 ? event.key.toUpperCase() : null);
  if (!key || (!event.ctrlKey && !event.altKey && !event.metaKey && !/^F\d{1,2}$/.test(key))) return null;
  return [...modifiers, key].join("+");
}

export function sameShortcut(left, right) {
  const normalize = value => value.replaceAll(/CommandOrControl|Control|Ctrl/g, "Control").toLowerCase().split("+").sort().join("+");
  return Boolean(left && right && normalize(left) === normalize(right));
}
