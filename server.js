const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────────────
// GOOGLE CUSTOM SEARCH — tìm web thời gian thực
// ─────────────────────────────────────────────────────
async function searchWeb(query, num = 6) {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx  = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) return [];

  try {
    const year = new Date().getFullYear();
    const url  = `https://www.googleapis.com/customsearch/v1`
      + `?key=${key}&cx=${cx}`
      + `&q=${encodeURIComponent(query + " " + year)}`
      + `&num=${num}&gl=vn&lr=lang_vi&dateRestrict=m9`;

    const res  = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map(item => ({
      title:   item.title,
      link:    item.link,
      snippet: item.snippet,
      source:  item.displayLink,
    }));
  } catch (e) {
    console.error("[Search]", e.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────
// GROQ — llama-3.3-70b-versatile (model xịn nhất, free)
// ─────────────────────────────────────────────────────
async function askGroq(systemPrompt, userQuery, searchResults, history) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Chưa cấu hình GROQ_API_KEY trong Environment Variables");

  // Ghép kết quả web vào context
  const now = new Date().toLocaleDateString("vi-VN", {
    year: "numeric", month: "long", day: "numeric"
  });

  let webCtx = "";
  if (searchResults.length > 0) {
    webCtx = `\n\n--- KẾT QUẢ TÌM KIẾM THỰC TẾ (${now}) ---\n`;
    searchResults.forEach((r, i) => {
      webCtx += `[${i + 1}] ${r.title}\n`;
      webCtx += `Nguồn: ${r.source} | ${r.link}\n`;
      webCtx += `Nội dung: ${r.snippet}\n\n`;
    });
    webCtx += `--- HẾT KẾT QUẢ TÌM KIẾM ---\n`;
    webCtx += `\nHãy phân tích DỰA TRÊN các kết quả trên, trích dẫn nguồn cụ thể.\n`;
  } else {
    webCtx = `\n\n[Không có kết quả web. Dùng kiến thức có sẵn, ghi rõ "theo kiến thức đào tạo".]\n`;
  }

  // Build messages (giữ tối đa 6 lượt chat để tránh quá token)
  const chatHistory = history.slice(-6).map(m => ({
    role:    m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const messages = [
    ...chatHistory,
    { role: "user", content: userQuery + webCtx },
  ];

  const body = {
    model:       "llama-3.3-70b-versatile",   // model mạnh nhất Groq, free
    max_tokens:  4096,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  };

  const res  = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Lỗi Groq API");

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq không trả về kết quả");
  return text;
}

// ─────────────────────────────────────────────────────
// QUERY BUILDER — tạo nhiều query tìm kiếm đa dạng
// ─────────────────────────────────────────────────────
function buildQueries(query, mode) {
  const yr = new Date().getFullYear();
  const q  = query;
  const map = {
    realtime: [
      `${q} thị trường lao động Việt Nam ${yr}`,
      `${q} trending jobs salary ${yr}`,
    ],
    history: [
      `${q} lịch sử phát triển 2020 2021 2022 2023 2024 2025`,
      `${q} Vietnam labor market history growth`,
    ],
    predict: [
      `${q} xu hướng tương lai dự báo 2026 2030`,
      `${q} future of work forecast report ${yr}`,
    ],
    verify: [
      `${q} nghiên cứu số liệu thực tế bằng chứng`,
      `${q} research study data statistics evidence`,
    ],
  };
  return map[mode] || [`${q} ${yr}`, `${q} Vietnam`];
}

// ─────────────────────────────────────────────────────
// API ENDPOINT
// ─────────────────────────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  const { query, system, history = [], mode } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: "Thiếu query" });

  try {
    // 1. Tìm kiếm song song
    const queries  = buildQueries(query, mode);
    const results  = await Promise.all(queries.map(q => searchWeb(q, 5)));
    const flat     = results.flat();

    // Dedup theo link
    const seen     = new Set();
    const sources  = flat.filter(r => {
      if (seen.has(r.link)) return false;
      seen.add(r.link);
      return true;
    }).slice(0, 10);

    // 2. Gọi Groq
    const answer = await askGroq(system, query, sources, history);

    res.json({
      answer,
      sources: sources.map(s => ({ title: s.title, link: s.link, source: s.source })),
      model:   "llama-3.3-70b-versatile",
      searchCount: sources.length,
    });
  } catch (err) {
    console.error("[Analyze]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok:     true,
    groq:   !!process.env.GROQ_API_KEY,
    search: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX),
    year:   new Date().getFullYear(),
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Career Trend AI running → http://localhost:${PORT}`);
  console.log(`   Groq API  : ${process.env.GROQ_API_KEY           ? "✅ OK" : "❌ Missing GROQ_API_KEY"}`);
  console.log(`   Web Search: ${process.env.GOOGLE_SEARCH_API_KEY  ? "✅ OK" : "❌ Missing (optional)"}\n`);
});
