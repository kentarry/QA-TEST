# 外包知識庫

依專案分區的外包協作問答知識庫，**帳號控管版**：僅限白名單信箱登入使用。

- 正式網址：https://kb.r51yahe123.workers.dev/ （Cloudflare Workers 免費方案）
- 架構：Cloudflare Worker（[app/src/index.js](app/src/index.js)）＋ D1 資料庫（問答／成員）＋ KV（登入 session／圖片）＋ Workers AI（AI 小幫手）
- 前端：[app/public/index.html](app/public/index.html)（單頁應用：登入、發問、回覆、貼圖、搜尋、AI 聊天、管理後台）
- 舊版 GitHub Pages 網站已改為搬遷轉址頁（[site/index.html](site/index.html)），由 Actions 於 push 時部署

## 帳號規則

- 只有「管理後台 → 成員名單」中的信箱可以登入；`ADMIN_EMAILS`（wrangler.toml）內的信箱首次登入時自動成為管理者
- 新帳號預設密碼為 `qwerty`（`DEFAULT_PASSWORD`），**首次登入強制修改密碼**（至少 8 字元）並可設定顯示名稱
- 管理者可重設成員密碼（回到預設密碼重走首次流程）、移除成員
- 密碼以 PBKDF2 + 伺服器密鑰（secret `PEPPER`）雜湊儲存；session 存 KV、效期 30 天

## 權限

| 動作 | 一般成員 | 管理者 |
|---|---|---|
| 瀏覽／搜尋／問 AI | ✓ | ✓ |
| 發問、回覆（可貼圖） | ✓ | ✓ |
| 編輯／刪除自己的內容 | ✓ | ✓ |
| 編輯／刪除任何內容 | — | ✓ |
| 標記「正式解答」 | — | ✓ |
| 成員與專案管理 | — | ✓ |

## 緊急應變

- **單一帳號疑似外洩**：管理後台 → 成員名單 → 「重設密碼」或「移除」（立即生效，已登入的工作階段同步失效）
- **一鍵鎖定全站**：管理後台 → 「緊急鎖定」→ 立即鎖定全站。除 `ADMIN_EMAILS`（部署設定，不受資料庫竄改影響）外，所有成員立刻無法登入與存取任何內容；解除同樣一鍵（鎖定數秒內生效、解除最長約 1 分鐘全面恢復）
- **最終手段**：Cloudflare 儀表板 → Workers & Pages → kb → 刪除 Worker（網址立即失效；D1 資料仍在，可之後重新部署恢復）

## 維運

- **改程式**：修改 app/ 之後 `cd app && npx wrangler deploy`（這台電腦已完成 wrangler login）
- **改資料庫**：`npx wrangler d1 execute kb-db --remote --command "..."`（本機開發用 `--local --config wrangler.dev.toml`）
- **本機測試**：`cd app && npx wrangler dev --local --config wrangler.dev.toml`（本機無 AI 綁定，AI 會退回檢索模式）
- **備份**：網站底部「匯出 JSON／Markdown」
- **免費額度**：Workers 10 萬請求/日、D1 500 萬讀/日、KV 圖片總容量 1GB、Workers AI 每日免費額度——小團隊綽綽有餘；圖片空間若將來不足可遷移 R2

## 歷史版本

- V2（GitHub Pages ＋ Issues 發問，公開網站）：程式保留在 git 歷史；因新增帳號控管需求而汰換
- V1（Claude Artifact）：因外部帳號僅唯讀而汰換
