// Build site/kb-data.json from GitHub Issues.
// Runs in GitHub Actions (Node 20+, no dependencies). Env: GITHUB_TOKEN, GITHUB_REPOSITORY.
import { readFile, writeFile } from "node:fs/promises";

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY; // "owner/name"
const MARKER = "[正式解答]";
const API = "https://api.github.com";

if (!TOKEN || !REPO) {
  console.error("Missing GITHUB_TOKEN or GITHUB_REPOSITORY");
  process.exit(1);
}

async function gh(path) {
  const res = await fetch(API + path, {
    headers: {
      Authorization: "Bearer " + TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    console.error("GitHub API failed:", path, res.status, await res.text());
    process.exit(1);
  }
  return res.json();
}

async function ghPaged(path) {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const batch = await gh(path + (path.includes("?") ? "&" : "?") + "per_page=100&page=" + page);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

// Extract a dropdown's options from the issue-form yml (single source of truth
// for the project / category lists shown on the site).
function extractOptions(yml, fieldId) {
  const idIdx = yml.indexOf("id: " + fieldId);
  if (idIdx === -1) return [];
  const optIdx = yml.indexOf("options:", idIdx);
  if (optIdx === -1) return [];
  const lines = yml.slice(optIdx).split("\n").slice(1);
  const out = [];
  for (const ln of lines) {
    const m = ln.match(/^\s+-\s+(.+?)\s*$/);
    if (!m) break;
    out.push(m[1].replace(/^["']|["']$/g, ""));
  }
  return out;
}

// Issue-form bodies render as "### <field label>\n\n<value>" sections.
function parseForm(body) {
  const map = {};
  const parts = String(body || "").split(/^###\s+/m);
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    const nl = seg.indexOf("\n");
    if (nl === -1) continue;
    const key = seg.slice(0, nl).trim();
    let val = seg.slice(nl + 1).trim();
    if (val === "_No response_") val = "";
    map[key] = val;
  }
  return map;
}

function stripMarker(text) {
  return String(text || "").split(MARKER).join("").trim();
}

const yml = await readFile(".github/ISSUE_TEMPLATE/question.yml", "utf8");
const projects = extractOptions(yml, "project");
const categories = extractOptions(yml, "category");
if (!projects.length) {
  console.error("No project options found in question.yml");
  process.exit(1);
}

const rawIssues = await ghPaged(`/repos/${REPO}/issues?state=all&labels=question`);
const questions = [];
for (const issue of rawIssues) {
  if (issue.pull_request) continue;
  if (issue.state === "closed" && issue.state_reason === "not_planned") continue;

  const form = parseForm(issue.body);
  const hasForm = Object.keys(form).length > 0;
  const detail = form["詳細描述"] !== undefined ? form["詳細描述"] : (hasForm ? "" : String(issue.body || "").trim());

  let replies = [];
  if (issue.comments > 0) {
    const comments = await ghPaged(`/repos/${REPO}/issues/${issue.number}/comments`);
    replies = comments.map((c) => {
      const login = c.user ? c.user.login : "unknown";
      const isBot = /\[bot\]$/.test(login) || login === "github-actions";
      return {
        author: isBot ? "AI 助理" : login,
        ai: isBot || undefined,
        body: stripMarker(c.body),
        createdAt: c.created_at,
        editedAt: c.updated_at !== c.created_at ? c.updated_at : null,
        official: !isBot && String(c.body || "").includes(MARKER),
      };
    });
  }

  const answered = replies.some((r) => r.official) || issue.state === "closed";
  questions.push({
    num: issue.number,
    url: issue.html_url,
    title: issue.title,
    author: form["你的名字"] || (issue.user ? issue.user.login : "unknown"),
    project: projects.includes(form["專案"]) ? form["專案"] : "通用",
    category: categories.includes(form["分類"]) ? form["分類"] : "其他",
    body: detail,
    createdAt: issue.created_at,
    editedAt: null,
    status: answered ? "answered" : "open",
    replies,
  });
}

const data = {
  v: 1,
  repo: REPO,
  repoUrl: `https://github.com/${REPO}`,
  generatedAt: new Date().toISOString(),
  projects,
  categories,
  questions,
};

await writeFile("site/kb-data.json", JSON.stringify(data, null, 1), "utf8");
console.log(`Wrote site/kb-data.json — ${questions.length} questions, projects: ${projects.join(", ")}`);
