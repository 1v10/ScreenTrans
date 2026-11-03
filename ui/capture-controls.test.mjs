import test from "node:test";
import assert from "node:assert/strict";
import { captureSettings, shortcutFromEvent, sameShortcut, swappedLanguages } from "./capture-controls.mjs";

test("legacy screenshot settings exclude removed engine credentials", () => {
  const settings = captureSettings({ fromLang: "ja", autostart: false, hotkey: "Control+Alt+D", overlayOpacity: 0.8,
    llmConfig: { apiKey: "old-secret" }, popupShortcut: "Alt+Q", customProxy: "http://example" });
  assert.equal(settings.fromLang, "ja");
  assert.equal(settings.hotkey, "Control+Alt+D");
  assert.equal(settings.autostart, false);
  assert.equal(settings.overlayOpacity, 0.8);
  assert.equal(settings.copyHotkey, "CommandOrControl+Shift+C");
  assert.equal(JSON.stringify(settings).includes("old-secret"), false);
  assert.equal("popupShortcut" in settings, false);
});
test("language swap never makes auto detection the target", () => {
  assert.deepEqual(swappedLanguages("auto", "zh-CHS"), { fromLang: "zh-CHS", toLang: "en" });
  assert.deepEqual(swappedLanguages("ja", "zh-CHS"), { fromLang: "zh-CHS", toLang: "ja" });
});
test("shortcut recording supports alternate keyboard layouts", () => {
  assert.equal(shortcutFromEvent({ key: "д", code: "KeyD", ctrlKey: true, altKey: true }), "CommandOrControl+Alt+D");
});
test("typing, modifier keys and IME cannot become global shortcuts", () => {
  assert.equal(shortcutFromEvent({ key: "x", code: "KeyX" }), null);
  assert.equal(shortcutFromEvent({ key: "Shift", shiftKey: true }), null);
  assert.equal(shortcutFromEvent({ key: "x", ctrlKey: true, isComposing: true }), null);
  assert.equal(shortcutFromEvent({ key: "F8" }), "F8");
});
test("conflicts recognize legacy Control spelling", () => {
  assert.equal(sameShortcut("Control+Shift+C", "CommandOrControl+Shift+C"), true);
  assert.equal(sameShortcut("Shift+Control+C", "CommandOrControl+Shift+C"), true);
  assert.equal(sameShortcut("Control+Shift+X", "CommandOrControl+Shift+C"), false);
  assert.equal(sameShortcut("", ""), false);
});
