# 佩佩玩跳繩 (Peipei Jump Rope) 🏃‍♀️✨

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Online-brightgreen?style=for-the-badge&logo=google-chrome)](https://apple595201908.github.io/jump-rope-game/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deployed-success?style=for-the-badge&logo=github)](https://apple595201908.github.io/jump-rope-game/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](./LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)]()
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-blue?style=for-the-badge)]()

經典可愛的單鍵跳繩休閒小遊戲！點一下跳起來，掌握絕佳節奏，別讓佩佩輸給一條繩子！

---

## 🌐 線上即玩 (Play Online)

👉 **立即遊玩：[https://apple595201908.github.io/jump-rope-game/](https://apple595201908.github.io/jump-rope-game/)**

手機、平板、電腦瀏覽器打開即可暢玩，支援全螢幕直向與觸控操作。

---

## 🎮 遊戲特色 (Key Features)

- ⚡ **純原生技術（零依賴庫）**：完全由原生 HTML5、CSS3、Vanilla JavaScript 與 Canvas 2D 打造，體積輕巧，秒速載入。
- 🌀 **精準擬真甩繩物理**：
  - 繩索三維穿透層次（繩子在前時覆蓋人物、在後時隱於身後）。
  - 二次貝茲曲線（Quadratic Bezier）動態計算繩子弧度與旋轉速度。
  - 隨跳躍次數逐步加速，極度考驗節奏感與反應力。
- 🔊 **純程式化 Web Audio 音效**：
  - 零外部音效檔案依賴，所有跳躍提示音、甩繩風聲、卡繩音效與破紀錄音效均由 Web Audio API 即時頻率合成。
  - 支援右上角即時靜音開關。
- 🎭 **趣味動態回饋系統**：
  - **表情變化**：連續跳躍超過 10 下開始冒汗、90 下觸發驚恐搖晃。
  - **6 種失誤跌倒動畫**：被繩子絆倒時隨機觸發向左翻倒、向右滑倒、旋轉飛出、壓扁、震動放大等多種 Ragdoll 幽默跌倒特效。
  - **自嘲評語庫**：依據跳躍成績隨機給出幽默風趣的結束評語。
- 🏆 **7 段判定等級與紀錄保存**：
  - 根據跳起時機計算滯空與切繩時間差，精準給出判定等級。
  - 成績自動保存於瀏覽器 LocalStorage，隨時挑戰個人歷史最佳紀錄。
- 📱 **響應式全螢幕佈局**：
  - 自動適配各種行動裝置直向螢幕比例（viewport-fit=cover、SafeArea 適配）。

---

## 🕹️ 操作方式 (Controls)

| 操作設備 | 操作方法 |
| :--- | :--- |
| **📱 手機 / 平板** | 輕觸螢幕任意位置即可跳躍 |
| **💻 電腦（鍵盤）** | 按下 `空白鍵 (Space)` 或 `Enter` |
| **🖱️ 電腦（滑鼠）** | 點擊畫面任意位置 |

---

## 🎯 判定等級說明 (Timing Judgements)

| 判定等級 | 說明 |
| :---: | :--- |
| **GOD!!** | 神級時機！完美起跳，滯空頂點恰好避開繩索切入 |
| **PERFECT!!** | 完美時機！極具節奏感的高分跳躍 |
| **GREAT!** | 優秀時機！相當精準 |
| **NICE!** | 不錯！流暢過繩 |
| **GOOD** | 合格！勉強通過 |
| **KUTAR** | 驚險壓線！差點卡到腳 |
| **POOR** | 時機偏早或偏晚，繩索幾乎擦過腳底 |

---

## 📂 專案檔案結構 (Project Structure)

```text
jump-rope-game/
├── assets/
│   ├── character.png      # 佩佩角色素材 (1024x1536 像素對齊版)
│   └── axun-character.png # 備份相容素材
├── index.html             # 遊戲主頁面與 HUD 結構
├── style.css              # 響應式佈局、動效與主題樣式
├── game.js                # 遊戲核心引擎 (Canvas 渲染、物理、Web Audio)
├── .gitignore             # Git 忽略清單
├── LICENSE                # MIT 開源授權條款
└── README.md              # 專案說明文件
```

---

## 🛠️ 本地執行方式 (Run Locally)

本專案無需任何編譯或打包步驟，使用任何靜態網頁伺服器即可啟動：

### 方法 1：使用 Python（推薦）
```bash
# 進入專案目錄
cd jump-rope-game

# 啟動本地 HTTP 伺服器
python -m http.server 8080
```
在瀏覽器開啟 `http://localhost:8080` 即可遊玩。

### 方法 2：使用 Node.js (npx serve)
```bash
npx serve .
```

### 方法 3：VS Code Live Server
使用 VS Code 打開專案資料夾，右鍵點擊 `index.html` 選擇 **"Open with Live Server"**。

---

## 🎨 自訂更換角色教學 (Custom Character Guide)

若希望將跳繩主角換成其他人物或自訂吉祥物：

1. 準備一張人物站立全身去背 PNG 圖檔。
2. 按照以下標準規格對齊（推薦使用 1024×1536，2:3 長寬比）：
   - **畫布尺寸**：`1024 × 1536 px`
   - **水平置中**：人物中心對齊 `x = 512 px`
   - **腳底位置**：貼地座標 `y = 1484 px`（離底邊保留約 52 px）
   - **頭頂位置**：頭部頂點約 `y = 57 px`
3. 將處理好的圖片替換 `assets/character.png` 即可無縫替換，自動繼承所有跳躍與冒汗碰撞判定！

---

## 📄 開源授權 (License)

本專案採用 [MIT License](./LICENSE) 授權。歡迎自由學習、修改與分享！
