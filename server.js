const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────
// BƯỚC 1: Google Custom Search — tìm web thật
// ─────────────────────────────────────────────
async function searchWeb(query, numResults = 6) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx    = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) return [];

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${numResults}&lr=lang_vi&gl=vn&dateRestrict=m6`;
    const res  = await fetch(url);
    const data = await res.json();

    if (!data.items) return [];

    return data.items.map(item => ({
      title:   item.title,
      link:    item.link,
      snippet: item.snippet,
      source:  item.displayLink,
    }));
  } catch (err) {
    console.error("Search error:", err.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// BƯỚC 2: Gemini — phân tích kết quả tìm kiếm
// ─────────────────────────────────────────────
async function analyzeWithGemini(systemPrompt, userQuery, searchResults, conversationHistory) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình trong Environment Variables");

  // Ghép kết quả tìm kiếm vào context
  let searchContext = "";
  if (searchResults.length > 0) {
    searchContext = `\n\n=== KẾT QUẢ TÌM KIẾM THỜI GIAN THỰC (${new Date().toLocaleDateString("vi-VN")}) ===\n`;
    searchResults.forEach((r, i) => {
      searchContext += `\n[${i + 1}] ${r.title}\nNguồn: ${r.source} | URL: ${r.link}\nNội dung: ${r.snippet}\n`;
    });
    searchContext += `\n=== HẾT KẾT QUẢ TÌM KIẾM ===\n`;
    searchContext += `\nHãy phân tích dựa trên các kết quả tìm kiếm thực tế trên và trích dẫn nguồn cụ thể.\n`;
  } else {
    searchContext = `\n\n[Lưu ý: Không có kết quả tìm kiếm web. Hãy sử dụng kiến thức có sẵn và ghi rõ điều đó.]\n`;
  }

  // Build conversation history cho Gemini
  const contents = [];

  // Thêm lịch sử trò chuyện
  for (const msg of conversationHistory) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }

  // Thêm message hiện tại với search context
  contents.push({
    role: "user",
    parts: [{ text: userQuery + searchContext }],
  });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.95,
    },
  };

  // Dùng gemini-2.0-flash — model mạnh nhất, miễn phí
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data.error?.message || "Lỗi Gemini API";
    throw new Error(msg);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini không trả về kết quả");
  return text;
}

// ─────────────────────────────────────────────
// API ENDPOINT
// ─────────────────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  const { query, system, history = [], mode } = req.body;

  if (!query) return res.status(400).json({ error: "Thiếu query" });

  try {
    // 1. Tạo search query tối ưu dựa theo chế độ
    const searchQueries = buildSearchQueries(query, mode);

    // 2. Chạy song song các tìm kiếm
    const searchPromises = searchQueries.map(q => searchWeb(q, 5));
    const searchArrays   = await Promise.all(searchPromises);
    const searchResults  = searchArrays.flat().slice(0, 12); // max 12 kết quả

    // 3. Phân tích với Gemini
    const answer = await analyzeWithGemini(system, query, searchResults, history);

    res.json({
      answer,
      sources: searchResults.map(r => ({ title: r.title, link: r.link, source: r.source })),
      searchCount: searchResults.length,
    });
  } catch (err) {
    console.error("Analyze error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Xây dựng nhiều query tìm kiếm để có kết quả đa dạng hơn
function buildSearchQueries(userQuery, mode) {
  const year = new Date().getFullYear();
  const base = userQuery;

  const byMode = {
    realtime: [
      `${base} ${year} thị trường lao động Việt Nam`,
      `${base} trending jobs ${year}`,
    ],
    history: [
      `${base} lịch sử phát triển 2020 2021 2022 2023 2024`,
      `${base} market trend history Vietnam`,
    ],
    predict: [
      `${base} dự đoán xu hướng tương lai 2025 2030`,
      `${base} future jobs forecast ${year}`,
    ],
    verify: [
      `${base} fact check thực tế số liệu`,
      `${base} research study data evidence`,
    ],
  };

  return byMode[mode] || [`${base} ${year}`, `${base} Vietnam`];
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status:    "ok",
    gemini:    !!process.env.GEMINI_API_KEY,
    search:    !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX),
    timestamp: new Date().toISOString(),
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Career Trend AI (Free Stack) đang chạy tại http://localhost:${PORT}`);
  console.log(`   Gemini API:    ${process.env.GEMINI_API_KEY    ? "✅ Đã cấu hình" : "❌ Chưa có"}`);
  console.log(`   Google Search: ${process.env.GOOGLE_SEARCH_API_KEY ? "✅ Đã cấu hình" : "❌ Chưa có (vẫn hoạt động, không có web search)"}`);
});
