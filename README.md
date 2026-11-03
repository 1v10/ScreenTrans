# ScreenTrans

个人使用的桌面截图翻译工具，基于 [Glance](https://github.com/Harukaon/Glance) 精简。保留截图翻译、截图取字和必要设置，文本翻译交给独立的浏览器扩展。

## 功能

- 框选屏幕区域后翻译，在原位置显示译后图片。
- 截图取字，将识别文字复制到剪贴板。
- 源语言与目标语言选择、语言交换。
- 两组可修改的全局快捷键，支持再次按下关闭截图。
- 托盘入口、开机静默自启、主窗口置顶；关闭主窗口后驻留托盘。
- 保留截图翻译的本地历史存储和现有原图/译图切换交互。

首页只包含语言、两个截图按钮和基础设置。已删除文本输入/输出、朗读、多引擎文本翻译、模型/API Key/提示词、网络代理配置、弹出文本窗口快捷键和版本/更新检查。软件不会查询上游更新。

| 操作 | 默认快捷键或入口 |
| --- | --- |
| 截图翻译 | `Ctrl+Shift+X`，首页或托盘按钮 |
| 截图取字 | `Ctrl+Shift+C`，首页或托盘按钮 |
| 取消截图 | `Esc` 或鼠标右键 |
| 切换原图/译图 | 翻译完成后在结果区域右键 |
| 修改快捷键 | 基础设置中点击对应快捷键；`Esc` 取消、`Backspace` 清除 |
| 显示主窗口 | 点击托盘图标或托盘的“显示窗口” |
| 退出 | 托盘菜单“退出” |

Windows 当前截取鼠标所在显示器，不支持跨显示器拖选。截图翻译和取字仍使用原有有道远程图片接口；框选图片会发送到该接口。此次精简没有更换 OCR 或图片翻译服务。

## 技术与开发

Rust + Tauri 2，静态 HTML/CSS/JavaScript；Windows 使用 `screenshots` 截屏，`winit` + `softbuffer` 渲染选区和翻译结果。前端不需要 npm 安装或构建。

Windows 需要 Rust MSVC 工具链、C++ Build Tools、WebView2，以及开发服务使用的 Python。

```powershell
cargo install tauri-cli --version "^2"
cargo tauri dev
cargo tauri build
```

`beforeDevCommand` 使用 `python dev_server.py`。打包配置中的产品名和主程序名是 `ScreenTrans`，Cargo 内部包名是 `screentrans`，应用标识是 `com.screen-trans.screentrans`。

也可只编译可执行文件，不生成安装包：

```powershell
cargo build --release --features custom-protocol --manifest-path src-tauri/Cargo.toml
```

此时原始产物为 `src-tauri/target/release/screentrans.exe`；可命名为 `ScreenTrans.exe` 使用。Tauri CLI 打包时会采用 `mainBinaryName`。

直接使用 Cargo 构建成品时，必须启用 `custom-protocol`，将页面资源嵌入程序。仅有 `--release` 不会切换 Tauri 的页面加载模式。未启用该功能的生产构建会被编译检查阻止，以免生成依赖本地开发服务器的成品。

## 配置兼容

首次启动时，若新应用目录尚无 `settings.json`，会尝试从旧的 `com.harukaon.glance` 数据目录迁移语言、截图快捷键、自启、置顶和截图浮层偏好。只序列化仍受支持的设置，不复制旧 API Key、模型、代理或弹出窗口配置；不覆盖已有 ScreenTrans 设置，也不修改原应用数据。

新应用仍使用 `settings.json` 和 `history.json`。旧截图历史留在旧目录；新截图历史写入 ScreenTrans 目录。旧版自启项由旧应用管理，如需弃用原版，应在原版中关闭自启并退出，避免两款应用争用同一截图快捷键。

## 验证

```powershell
node --test ui/*.test.mjs
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --features custom-protocol --manifest-path src-tauri/Cargo.toml
```

前端测试覆盖旧设置字段过滤、语言交换和快捷键录制/冲突。Rust 测试包含首次迁移保留截图设置、排除凭据和不覆盖新设置，以及原有截图坐标与快捷键行为。

## 来源与许可

原项目 Glance 的 README 标注 MIT；本项目保留其截图实现并进行个人用途精简。
