const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────
// FETCH nội dung trang web từ link người dùng gửi
// ─────────────────────────────────────────────
async function fetchPageContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CareerAI/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "vi,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    // Trích xuất text từ HTML — bỏ tags, scripts, styles
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s{3,}/g, "\n\n")
      .trim()
      .slice(0, 6000); // giới hạn 6000 ký tự

    return text || null;
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────────────────────
// GOOGLE SEARCH — tìm web thật
// ─────────────────────────────────────────────
async function searchWeb(query, num = 6) {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx  = process.env.GOOGLE_SEARCH_CX;
  if (!key || !cx) return [];

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&num=${num}&gl=vn&dateRestrict=m12`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.items) return [];

    return data.items.map(i => ({
      title:   i.title,
      link:    i.link,
      snippet: i.snippet,
      source:  i.displayLink,
    }));
  } catch (e) {
    console.error("[Search]", e.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// PHÁT HIỆN LINK trong tin nhắn
// ─────────────────────────────────────────────
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return [...text.matchAll(urlRegex)].map(m => m[1]);
}

// ─────────────────────────────────────────────
// PHÁT HIỆN loại câu hỏi để quyết định có search không
// ─────────────────────────────────────────────
function needsWebSearch(message) {
  const lower = message.toLowerCase();

  // Các pattern KHÔNG cần search
  const noSearchPatterns = [
    /^(xin chào|hello|hi|chào|hey)/i,
    /^(cảm ơn|thank|ok|được rồi|hiểu rồi)/i,
    /^(bạn là ai|bạn tên gì|you are|what are you)/i,
    /giải thích (cho tôi|lại|thêm)/i,
    /ý (bạn|anh|em) (là|muốn) (nói|nói gì)/i,
  ];

  if (noSearchPatterns.some(p => p.test(lower))) return false;

  // Các pattern CẦN search
  const searchPatterns = [
    /(lương|salary|income|thu nhập)/i,
    /(ngành|nghề|career|job|việc làm|tuyển dụng)/i,
    /(xu hướng|trend|phát triển|tăng trưởng)/i,
    /(2024|2025|2026|2027|2028|2029|2030)/,
    /(thị trường|market|industry)/i,
    /(ai|machine learning|data|blockchain|web3|fintech)/i,
    /(có đúng|có thật|thực sự|fact|kiểm chứng|sự thật)/i,
    /(hiện nay|hiện tại|bây giờ|gần đây|mới nhất)/i,
    /(dự đoán|dự báo|tương lai|sẽ như thế nào)/i,
    /(so sánh|compare|khác nhau|tốt hơn)/i,
    /(việt nam|vietnam|hà nội|hcm|đà nẵng)/i,
    /(kỹ năng|skill|học gì|học như thế nào)/i,
    /(startup|công ty|doanh nghiệp|tập đoàn)/i,
    /(remote|work from home|freelance|outsource)/i,
    /\?$/,
  ];

  return searchPatterns.some(p => p.test(message));
}

// ─────────────────────────────────────────────
// TẠO SEARCH QUERY thông minh từ câu hỏi
// ─────────────────────────────────────────────
function buildSearchQuery(userMessage, conversationContext) {
  // Nếu tin nhắn ngắn và có context, thêm context vào
  let query = userMessage;

  if (userMessage.length < 30 && conversationContext) {
    query = conversationContext + " " + userMessage;
  }

  // Thêm năm hiện tại nếu chưa có
  const currentYear = new Date().getFullYear();
  if (!query.includes(String(currentYear)) && !query.includes(String(currentYear - 1))) {
    query += ` ${currentYear}`;
  }

  return query.slice(0, 200);
}

// ─────────────────────────────────────────────
// GỌI GROQ — tự nhiên, không khuôn mẫu
// ─────────────────────────────────────────────
async function askGroq(messages) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Chưa cấu hình GROQ_API_KEY");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      temperature: 0.8,       // cao hơn = tự nhiên hơn
      top_p: 0.95,
      messages,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Lỗi Groq API");

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Không có phản hồi từ AI");
  return text;
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT — tự nhiên, thông minh
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Bạn là một trợ lý AI thông minh, am hiểu sâu về thị trường lao động và xu hướng nghề nghiệp. Bạn nói chuyện tự nhiên như một người bạn có chuyên môn, KHÔNG theo khuôn mẫu cứng nhắc.

CÁCH TRẢ LỜI:
- Nói chuyện tự nhiên, không dùng template hay bullet point cho mọi câu
- Khi có dữ liệu tìm kiếm thực tế, phân tích nó một cách thông minh và trích dẫn nguồn cụ thể
- Nếu câu hỏi đơn giản thì trả lời ngắn gọn, không phải lúc nào cũng cần heading và list
- Khi được cho đọc nội dung từ link, hãy tóm tắt và phân tích nội dung đó
- Nếu thông tin mâu thuẫn giữa các nguồn, hãy nói rõ sự khác biệt đó
- Nếu không chắc chắn điều gì, hãy nói thẳng là không chắc thay vì bịa đặt
- Ngày hiện tại là ${new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

KIỂM ĐỊNH THÔNG TIN:
- Khi người dùng hỏi "có đúng không", "thực hư", "có thật không" → hãy phân tích đa chiều, tìm bằng chứng cả hai phía
- Phân biệt rõ: sự thật đã xác minh / chưa rõ ràng / sai/phóng đại
- Đừng chỉ đồng ý với người dùng nếu thông tin họ đưa ra có vấn đề

VỀ NGÔN NGỮ: Trả lời bằng tiếng Việt, trừ khi người dùng hỏi bằng tiếng Anh.`;

// ─────────────────────────────────────────────
// MAIN API ENDPOINT
// ─────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Thiếu message" });

  try {
    const contextParts = [];

    // 1. Phát hiện và đọc link trong tin nhắn
    const urls = extractUrls(message);
    const fetchedPages = [];

    if (urls.length > 0) {
      const fetchPromises = urls.slice(0, 2).map(async (url) => {
        const content = await fetchPageContent(url);
        if (content) {
          fetchedPages.push({ url, content });
        }
        return null;
      });
      await Promise.all(fetchPromises);

      if (fetchedPages.length > 0) {
        contextParts.push(
          `--- NỘI DUNG TỪ LINK NGƯỜI DÙNG GỬI ---\n` +
          fetchedPages.map(p => `URL: ${p.url}\n\nNội dung:\n${p.content}`).join("\n\n---\n\n") +
          `\n--- HẾT NỘI DUNG LINK ---`
        );
      }
    }

    // 2. Tìm kiếm web nếu cần
    let searchResults = [];
    let searchQuery = "";

    if (needsWebSearch(message)) {
      // Lấy context từ lịch sử chat gần nhất
      const recentContext = history
        .slice(-3)
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join(" ")
        .slice(0, 100);

      searchQuery = buildSearchQuery(message, recentContext);
      searchResults = await searchWeb(searchQuery, 6);

      if (searchResults.length > 0) {
        const searchCtx =
          `--- KẾT QUẢ TÌM KIẾM WEB (${new Date().toLocaleDateString("vi-VN")}) ---\n` +
          searchResults.map((r, i) =>
            `[${i + 1}] ${r.title}\nNguồn: ${r.source} | ${r.link}\n${r.snippet}`
          ).join("\n\n") +
          `\n--- HẾT KẾT QUẢ ---\n\nHãy phân tích dựa trên các kết quả thực tế trên.`;

        contextParts.push(searchCtx);
      }
    }

    // 3. Build messages cho Groq
    const userContent = contextParts.length > 0
      ? `${message}\n\n${contextParts.join("\n\n")}`
      : message;

    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      // Giữ tối đa 10 lượt chat gần nhất
      ...history.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: userContent },
    ];

    // 4. Gọi AI
    const answer = await askGroq(groqMessages);

    res.json({
      answer,
      sources: searchResults.map(s => ({
        title: s.title,
        link: s.link,
        source: s.source,
      })),
      fetchedLinks: fetchedPages.map(p => p.url),
      didSearch: searchResults.length > 0,
      searchQuery,
    });
  } catch (err) {
    console.error("[Chat]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok:     true,
    groq:   !!process.env.GROQ_API_KEY,
    search: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX),
    time:   new Date().toISOString(),
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Career AI v3 → http://localhost:${PORT}`);
  console.log(`   Groq  : ${process.env.GROQ_API_KEY           ? "✅" : "❌ Missing GROQ_API_KEY"}`);
  console.log(`   Search: ${process.env.GOOGLE_SEARCH_API_KEY  ? "✅" : "⚠️  Optional - no web search"}\n`);
});
