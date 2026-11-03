use std::path::{Path, PathBuf};

use tokio::fs;

use crate::error::AppResult;
use crate::models::{TranslationHistoryItem, TranslatorSettings};

#[derive(Debug, Clone)]
pub struct ConfigStore {
    base_dir: PathBuf,
    settings_file: PathBuf,
    history_file: PathBuf,
}

impl ConfigStore {
    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }

    /// Import screenshot preferences once, without copying removed engine credentials.
    pub async fn migrate_legacy_settings(&self, legacy_dir: PathBuf) -> AppResult<()> {
        if fs::try_exists(&self.settings_file).await? {
            return Ok(());
        }
        let legacy_file = legacy_dir.join("settings.json");
        if !fs::try_exists(&legacy_file).await? {
            return Ok(());
        }
        let settings: TranslatorSettings = serde_json::from_slice(&fs::read(legacy_file).await?)?;
        self.save_settings(&settings).await
    }

    pub fn new(base_dir: PathBuf) -> Self {
        let settings_file = base_dir.join("settings.json");
        let history_file = base_dir.join("history.json");
        Self {
            base_dir,
            settings_file,
            history_file,
        }
    }

    pub async fn ensure(&self) -> AppResult<()> {
        fs::create_dir_all(&self.base_dir).await?;
        if fs::metadata(&self.settings_file).await.is_err() {
            let bytes = serde_json::to_vec_pretty(&TranslatorSettings::default())?;
            fs::write(&self.settings_file, bytes).await?;
        }
        if fs::metadata(&self.history_file).await.is_err() {
            fs::write(&self.history_file, b"[]").await?;
        }
        Ok(())
    }

    pub async fn load_settings(&self) -> AppResult<TranslatorSettings> {
        self.ensure().await?;
        let bytes = fs::read(&self.settings_file).await?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub async fn save_settings(&self, settings: &TranslatorSettings) -> AppResult<()> {
        self.ensure().await?;
        let bytes = serde_json::to_vec_pretty(settings)?;
        fs::write(&self.settings_file, bytes).await?;
        Ok(())
    }

    pub async fn load_history(&self) -> AppResult<Vec<TranslationHistoryItem>> {
        self.ensure().await?;
        let bytes = fs::read(&self.history_file).await?;
        Ok(serde_json::from_slice(&bytes)?)
    }

    pub async fn save_history(&self, history: &[TranslationHistoryItem]) -> AppResult<()> {
        self.ensure().await?;
        let bytes = serde_json::to_vec_pretty(history)?;
        fs::write(&self.history_file, bytes).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn migration_preserves_capture_preferences_without_credentials_or_overwrites() {
        let temp =
            std::env::temp_dir().join(format!("screentrans-config-{}", uuid::Uuid::new_v4()));
        let legacy = temp.join("legacy");
        fs::create_dir_all(&legacy).await.unwrap();
        fs::write(
            legacy.join("settings.json"),
            br#"{
            "fromLang":"ja", "toLang":"zh-CHS", "autostart":true,
            "hotkey":"Control+Alt+D", "copyHotkey":"Control+Shift+C",
            "pinOnTop":true, "overlayOpacity":0.8,
            "llmConfig":{"apiKey":"test-secret","model":"unused"},
            "textTranslateEngine":"llm", "popupShortcut":"Alt+Q",
            "proxyMode":"custom", "customProxy":"http://localhost:1234"
        }"#,
        )
        .await
        .unwrap();
        let store = ConfigStore::new(temp.join("new"));
        store.migrate_legacy_settings(legacy.clone()).await.unwrap();
        let settings = store.load_settings().await.unwrap();
        assert_eq!(settings.from_lang, "ja");
        assert_eq!(settings.hotkey, "Control+Alt+D");
        assert!(settings.autostart && settings.pin_on_top);
        assert_eq!(settings.overlay_opacity, 0.8);
        let saved = fs::read_to_string(&store.settings_file).await.unwrap();
        for removed in [
            "test-secret",
            "llmConfig",
            "textTranslateEngine",
            "popupShortcut",
            "proxyMode",
            "customProxy",
        ] {
            assert!(!saved.contains(removed), "legacy field leaked: {removed}");
        }
        let mut settings = settings;
        settings.from_lang = "en".into();
        store.save_settings(&settings).await.unwrap();
        store.migrate_legacy_settings(legacy).await.unwrap();
        assert_eq!(store.load_settings().await.unwrap().from_lang, "en");
        // The test owns this unique temporary directory in its entirety.
        fs::remove_dir_all(temp).await.unwrap();
    }
}
