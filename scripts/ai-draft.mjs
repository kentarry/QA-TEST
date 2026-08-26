// 新問題的 AI 初步回覆：讀取知識庫既有問答，透過 GitHub Models（免費）生成參考回覆，
// 以 issue 留言貼出。不加 [正式解答] 標記，問題狀態維持「待回覆」。
// Env: GITHUB_TOKEN（需 models:read + issues:write）, GITHUB_REPOSITORY, ISSUE_NUMBER

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const ISSUE_NUMBER = parseInt(process.env.ISSUE_NUMBER, 10);
const MODEL = "openai/gpt-4o-mini";
const API = "https://api.github.com";

if (!TOKEN || !REPO || !ISSUE_NUMBER) {
  console.error("Missing GITHUB_TOKEN / GITHUB_REPOSITORY / ISSUE_NUMBER");
  process.exit(1);
}

async function gh(path, init) {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init && init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    console.error("GitHub API failed:", path, res.status, await res.text());
    process.exit(1);
  }
  return res.json();
}

/* ---- 與網站相同的中文斷詞 + BM25 ---- */
const CJK_RE = /[㐀-䶿一-鿿豈-﫿]+|[a-z0-9][a-z0-9_.+#-]*/g;
function tokenize(s) {
  const t = [];
  const str = String(s || "").toLowerCase();
  let m;
  CJK_RE.lastIndex = 0;
  while ((m = CJK_RE.exec(str))) {
    const w = m[0];
    if (/[a-z0-9]/.test(w[0])) t.push(w);
    else if (w.length === 1) t.push(w);
    else for (let i = 0; i < w.length - 1; i++) t.push(w.slice(i, i + 2));
  }
  return t;
}
function retrieve(questions, query, topN) {
  const docs = questions.map((q) => {
    let toks = [];
    const tt = tokenize(q.title);
    for (let i = 0; i < 3; i++) toks = toks.concat(tt);
    toks = toks.concat(tokenize(q.category), tokenize(q.project), tokenize(q.body));
    (q.replies || []).forEach((r) => (toks = toks.concat(tokenize(r.body))));
    const tf = {};
    toks.forEach((w) => (tf[w] = (tf[w] || 0) + 1));
    return { q, tf, len: toks.length };
  });
  const df = {};
  const N = docs.length;
  let avg = 0;
  docs.forEach((d) => {
    avg += d.len;
    Object.keys(d.tf).forEach((w) => (df[w] = (df[w] || 0) + 1));
  });
  avg = N ? avg / N : 1;
  const toks = tokenize(query);
  const k1 = 1.2, b = 0.75;
  const scored = [];
  docs.forEach((d) => {
    let score = 0;
    toks.forEach((w) => {
      const tf = d.tf[w];
      if (!tf) return;
      const idf = Math.log(1 + (N - (df[w] || 1) + 0.5) / ((df[w] || 1) + 0.5));
      score += (idf * (tf * (k1 + 1))) / (tf + k1 * (1 - b + (b * d.len) / (avg || 1)));
    });
    if (score > 0) scored.push({ q: d.q, score });
  });
  scored.sort((a, b2) => b2.score - a.score);
  return scored.slice(0, topN);
}
const clip = (s, n) => (String(s || "").length > n ? String(s).slice(0, n) + "…" : String(s || ""));

/* ---- main ---- */
const issue = await gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}`);
const bodyText = String(issue.body || "");
if (bodyText.includes("[skip-ai]")) {
  console.log("skip-ai marker found, skipping.");
  process.exit(0);
}
// 從表單內文取出「詳細描述」；沒有表單格式就用全文
let detail = bodyText;
const m = bodyText.split(/^###\s+詳細描述\s*$/m);
if (m.length > 1) detail = m[1].split(/^###\s+/m)[0].trim();
const question = `${issue.title}\n${clip(detail, 800)}`;

// 知識庫資料：取自已部署的網站 JSON（可能落後 1 個建置週期，可接受）
const [owner, repoName] = REPO.split("/");
const kbUrl = process.env.KB_DATA_URL || `https://${owner}.github.io/${repoName}/kb-data.json`;
let kb = { questions: [] };
try {
  const r = await fetch(kbUrl, { headers: { "Cache-Control": "no-cache" } });
  if (r.ok) kb = await r.json();
} catch (e) {
  console.log("kb fetch failed, continuing with empty context");
}
const pool = (kb.questions || []).filter((q) => q.num !== ISSUE_NUMBER);
const top = retrieve(pool, question, 4);
const context = top
  .map(({ q }) => {
    const official = (q.replies || []).filter((r) => r.official).map((r) => r.body).join("\n");
    return (
      `【Q-${q.num}】${q.title}（專案：${q.project}｜${q.status === "answered" ? "已回覆" : "待回覆"}）\n` +
      `描述：${clip(q.body, 400)}` +
      (official ? `\n正式解答：${clip(official, 600)}` : "")
    );
  })
  .join("\n\n---\n\n");

const system =
  "你是「外包知識庫」的 AI 助理。一位外包協作夥伴剛送出新問題，請根據下方知識庫既有問答，用繁體中文寫一則簡潔的初步回覆。\n" +
  "規則：\n" +
  "1. 只根據知識庫資料回答，引用時標註題號（例如 Q-001）。\n" +
  "2. 若知識庫沒有足夠資料，就簡短說明目前知識庫沒有現成答案，請對方等待管理者回覆即可；不要編造。\n" +
  "3. 不要重複對方的問題，直接給出重點；不用打招呼與署名。\n\n" +
  "知識庫資料：\n" + (context || "（目前沒有相關資料）");

const aiRes = await fetch("https://models.github.ai/inference/chat/completions", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + TOKEN,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
    max_tokens: 700,
    temperature: 0.3,
  }),
});
if (!aiRes.ok) {
  console.error("Models API failed:", aiRes.status, await aiRes.text());
  process.exit(1);
}
const aiJson = await aiRes.json();
const answer = String(aiJson.choices?.[0]?.message?.content || "").trim();
if (!answer) {
  console.error("Empty answer from model");
  process.exit(1);
}

const comment =
  answer +
  "\n\n> 🤖 AI 依知識庫既有內容自動產生的初步回覆，僅供參考；請以管理者標記的「正式解答」為準。";

await gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}/comments`, {
  method: "POST",
  body: JSON.stringify({ body: comment }),
});
console.log(`AI draft posted to #${ISSUE_NUMBER} (context: ${top.map((t) => "Q-" + t.q.num).join(",") || "none"})`);
