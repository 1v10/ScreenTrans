use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Preferences shared by screen translation and screenshot text extraction.
/// Unknown legacy text-engine fields are ignored when loading an older config.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct TranslatorSettings {
    pub from_lang: String,
    pub to_lang: String,
    pub overlay_opacity: f32,
    pub overlay_font_scale: f32,
    pub close_on_outside_click: bool,
    pub autostart: bool,
    pub hotkey: String,
    pub copy_hotkey: String,
    pub pin_on_top: bool,
}

impl Default for TranslatorSettings {
    fn default() -> Self {
        Self {
            from_lang: "auto".into(),
            to_lang: "zh-CHS".into(),
            overlay_opacity: 0.92,
            overlay_font_scale: 1.0,
            close_on_outside_click: true,
            autostart: false,
            hotkey: default_hotkey(),
            copy_hotkey: default_copy_hotkey(),
            pin_on_top: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryQuery {
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectionPayload {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub monitor_id: String,
    pub monitor_x: i32,
    pub monitor_y: i32,
    pub monitor_width: u32,
    pub monitor_height: u32,
    #[serde(default = "default_monitor_scale_factor")]
    pub monitor_scale_factor: f64,
}

fn default_monitor_scale_factor() -> f64 {
    1.0
}

fn default_hotkey() -> String {
    "CommandOrControl+Shift+X".to_string()
}

fn default_copy_hotkey() -> String {
    "CommandOrControl+Shift+C".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationResponse {
    pub request_id: String,
    pub lan_from: String,
    pub lan_to: String,
    pub rendered_image_base64: String,
    pub regions: Vec<OverlayRegion>,
    pub pairs: Vec<TranslationPair>,
    pub raw: Value,
    pub history_item: TranslationHistoryItem,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPayload {
    pub request_id: String,
    pub lan_from: String,
    pub lan_to: String,
    pub selection: SelectionPayload,
    pub overlay_opacity: f32,
    pub overlay_font_scale: f32,
    pub close_on_outside_click: bool,
    pub rendered_image_base64: String,
    pub regions: Vec<OverlayRegion>,
    pub pairs: Vec<TranslationPair>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayRegion {
    pub rect: BoundingBox,
    pub local_rect: BoundingBox,
    pub source: String,
    pub translated: String,
    pub color: String,
    pub lines: Vec<RegionLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegionLine {
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BoundingBox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationPair {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationHistoryItem {
    pub id: String,
    pub created_at: DateTime<Utc>,
    pub from_lang: String,
    pub to_lang: String,
    pub selection: SelectionPayload,
    pub pairs: Vec<TranslationPair>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureViewPayload {
    pub image_base64: String,
    pub image_mime: String,
    pub image_width: u32,
    pub image_height: u32,
    pub copy_text_mode: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CaptureMode {
    #[default]
    Translate,
    CopyText,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrTextResult {
    pub text: String,
    pub request_id: String,
    pub lan_from: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureTranslatePayload {
    pub image_base64: String,
    pub selection: CaptureRect,
}

impl TranslationHistoryItem {
    pub fn from_response(
        selection: SelectionPayload,
        request_id: String,
        from_lang: String,
        to_lang: String,
        pairs: Vec<TranslationPair>,
    ) -> Self {
        Self {
            id: request_id,
            created_at: Utc::now(),
            from_lang,
            to_lang,
            selection,
            pairs,
        }
    }
}
