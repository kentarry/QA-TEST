# 外包知識庫

依專案分區的外包協作問答知識庫。網站由 GitHub Pages 承載，發問透過 GitHub Issues，GitHub Actions 會在問答有變動時自動重建網站（約 1–2 分鐘）。

## 運作方式

```
外包在網站按「提出問題」
   → 開啟預填好的 GitHub Issue 表單（需登入 GitHub）
   → 送出後觸發 Actions：scripts/build-kb.mjs 讀取所有 question 標籤的 issues
   → 產生 site/kb-data.json → 部署到 GitHub Pages
```

- 網站原始碼：[site/index.html](site/index.html)（含搜尋、相似問題比對、專案分區）
- 發問表單：[.github/ISSUE_TEMPLATE/question.yml](.github/ISSUE_TEMPLATE/question.yml)
- 自動建置：[.github/workflows/build.yml](.github/workflows/build.yml) ＋ [scripts/build-kb.mjs](scripts/build-kb.mjs)

## 管理者操作

**回覆問題**：到該 issue 底下留言。留言內容包含 `[正式解答]` 字樣（放哪裡都行，會自動隱藏），該題狀態就會變成「已回覆」。直接 Close issue 也會標記為已回覆。

**移除問題**：把 issue 以「Close as not planned」關閉，或直接刪除，網站上就不會顯示。

**新增／改名專案或分類**：編輯 `question.yml` 裡 `id: project` 或 `id: category` 的 `options` 清單後 push，網站的專案卡與表單選項會一起更新（既有問題若專案名稱對不上，會歸到「通用」）。

**手動登錄問答**（例如把 LINE 上問過的問題補進來）：直接開新 issue，加上 `question` 標籤，用發問表單格式即可；沒有表單格式時，整段內文會當作問題描述、發問者顯示為 GitHub 帳號。

## 圖片

發問表單的「詳細描述」與 issue 留言都支援直接貼上／拖曳圖片（GitHub 內建功能），網站會把這些圖片直接顯示在問題與回覆內容中（可點開看原圖）。

## AI 小幫手

網站右下角「✦ 問 AI」聊天視窗，預設為**即時本地檢索模式**：在使用者瀏覽器內以相似度搜尋直接找出最相關的正式解答回覆（附題號連結），零延遲、完全私密、不需要任何帳號、不經過任何伺服器。

（進階選項）若想升級為真正的生成式模型回答，可部署 [worker/](worker/) 的 Cloudflare Worker（免費方案），並把網址填入 [site/config.json](site/config.json) 的 `aiEndpoint` 後 push；留空即維持本地模式。若填入的服務斷線，聊天視窗會自動退回本地檢索。

（歷史備註：曾嘗試以 GitHub Models 做新問題自動回覆，但該服務於 2026-08 進入官方退役期（API 回傳 `github_models_retirement_brownout`），已移除，程式保留在 git 歷史中。網站與建置腳本仍支援顯示機器人留言的「AI 初步回覆」徽章。）

## 注意事項

- 這是公開網站與公開 repo：**請勿在問答中貼帳號密碼、金鑰、未公開素材等機密內容**。
- 發問需要 GitHub 帳號（免費）；瀏覽與搜尋不用。
- Issue 編號即網站上的 Q 編號（例如 issue #12 = Q-012），聊天時可直接引用。

## 本機開發

```
python -m http.server 8124 --directory site
```

開 `http://localhost:8124`，會使用 `site/kb-data.json` 的範例資料（正式站的這個檔案由 Actions 產生）。
