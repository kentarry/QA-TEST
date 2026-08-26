CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  pass_hash TEXT,
  salt TEXT,
  must_change INTEGER NOT NULL DEFAULT 1,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '其他',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  edited_at TEXT
);

CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  official INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  edited_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_replies_q ON replies(question_id);

CREATE TABLE IF NOT EXISTS projects (
  name TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  sort INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO projects (name, sort) VALUES
  ('滿貫', 1), ('大滿貫', 2), ('明星3缺1', 3), ('明星GO', 4), ('通用', 5);

INSERT OR IGNORE INTO categories (name, sort) VALUES
  ('環境與帳號', 1), ('流程與規範', 2), ('技術問題', 3), ('檔案與交付', 4), ('時程與請款', 5), ('其他', 6);

INSERT OR IGNORE INTO questions (id, project, category, title, body, author_email, author_name, created_at)
VALUES (1, '通用', '流程與規範', '如何使用這個知識庫？',
'這裡是外包協作的問答知識庫，問題依「專案」分區，所有內容僅限受邀請的帳號登入後查看。

使用方式：先在首頁選擇你負責的專案，進入後即可瀏覽該專案的問答；發問前，請先用搜尋列或右下角的「問 AI」查詢是否已有類似問題，找不到答案再點「提出問題」，描述欄可以直接貼上截圖。

跨專案的一般問題（流程、請款等）請放在「通用」。每個問題都有編號（例如 Q-001），在聊天工具裡討論時可以直接引用。',
'system', '管理者', '2026-08-26T01:00:00.000Z');

INSERT OR IGNORE INTO replies (id, question_id, body, author_email, author_name, official, created_at)
VALUES (1, 1,
'補充幾個使用重點：
1. 首頁搜尋會查詢「全部專案」；進入單一專案後，搜尋只查該專案。
2. 右下角「問 AI」支援直接輸入完整問題，AI 會根據知識庫內容回答並附上題號連結。
3. 回覆被管理者標記為「正式解答」後，問題狀態會變成「已回覆」。
4. 第一次登入請立即修改預設密碼，並可順便設定你的顯示名稱。',
'system', '管理者', 1, '2026-08-26T01:10:00.000Z');
