#[test]
fn production_build_embeds_the_complete_screenshot_frontend() {
    assert!(
        !tauri::is_dev(),
        "production mode must not use the development server"
    );
    let context: tauri::Context<tauri::Wry> = tauri::generate_context!();
    for file in [
        "index.html",
        "app.js",
        "capture-controls.mjs",
        "main.css",
        "styles.css",
        "capture.html",
        "capture.js",
        "overlay.html",
    ] {
        assert!(
            context.assets().get(&file.into()).is_some(),
            "missing bundled asset: {file}"
        );
    }
    let index = context.assets().get(&"index.html".into()).unwrap();
    assert!(String::from_utf8_lossy(&index).contains("ScreenTrans"));
    let script = context.assets().get(&"app.js".into()).unwrap();
    assert!(!String::from_utf8_lossy(&script).contains("translate_text"));
}
