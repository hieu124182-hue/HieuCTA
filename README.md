# 🔭 Career Trend AI 2026 — Groq Edition

**Stack hoàn toàn miễn phí:**
| Service | Dùng cho | Giới hạn free |
|---|---|---|
| Groq (Llama 3.3 70B) | AI phân tích | 14,400 req/ngày |
| Google Custom Search | Web search thật | 100 search/ngày |
| Render.com | Hosting | Free tier |

---

## BƯỚC 1 — Lấy 3 API Keys miễn phí

### 🔑 GROQ_API_KEY
1. Vào **console.groq.com** → đăng nhập bằng Google/GitHub
2. Menu trái → **API Keys** → **Create API Key**
3. Copy key (dạng `gsk_...`)
> Không cần credit card, không cần verify gì cả

---

### 🔑 GOOGLE_SEARCH_API_KEY
1. Vào **console.cloud.google.com** → đăng nhập Google
2. Tạo project mới (tên tùy ý)
3. **APIs & Services** → **Credentials** → **+ Create Credentials** → **API Key**
4. Copy key (dạng `AIzaSy...`)
5. Bật API: vào **APIs & Services** → **Library** → tìm **"Custom Search API"** → **Enable**

---

### 🔑 GOOGLE_SEARCH_CX (Search Engine ID)
1. Vào **programmablesearchengine.google.com**
2. Click **"Add"** → điền tên tùy ý
3. Chọn **"Search the entire web"** → **Create**
4. Vào **Customize** → copy **Search engine ID**
   (dạng `b46414b9c0d244c4c` hoặc `017576662512468239146:xxxxx`)

---

## BƯỚC 2 — Thay thế code cũ trong repo bằng Terminal

### Nếu repo cũ tên là `career-trend-ai` hoặc `career-ai-free`:

```bash
# 1. Clone repo cũ về máy (bỏ qua nếu đã có sẵn)
git clone https://github.com/TEN_BAN/TEN_REPO.git
cd TEN_REPO

# 2. Xóa toàn bộ code cũ
rm -rf public server.js package.json package-lock.json .gitignore README.md

# 3. Copy code mới vào (giải nén career-ai-groq.zip trước)
cp /đường/dẫn/career-ai-groq/server.js .
cp /đường/dẫn/career-ai-groq/package.json .
cp /đường/dẫn/career-ai-groq/.gitignore .
cp /đường/dẫn/career-ai-groq/README.md .
cp -r /đường/dẫn/career-ai-groq/public .

# 4. Install dependencies
npm install

# 5. Commit và push lên GitHub
git add .
git commit -m "Upgrade to Groq Llama 3.3 70B - free stack 2026"
git push origin main
```

### Sau khi push — Render tự động redeploy
- Render sẽ detect commit mới và tự build lại (~2 phút)
- Không cần làm gì thêm trên Render

---

## BƯỚC 3 — Cập nhật Environment Variables trên Render

1. Vào **dashboard.render.com** → chọn web service
2. Tab **Environment** → xóa key cũ (nếu có `GEMINI_API_KEY` hay `ANTHROPIC_API_KEY`)
3. Thêm 3 keys mới:

| Key | Value |
|---|---|
| `GROQ_API_KEY` | `gsk_...` |
| `GOOGLE_SEARCH_API_KEY` | `AIzaSy...` |
| `GOOGLE_SEARCH_CX` | ID của search engine |

4. Click **Save Changes** → Render tự redeploy thêm 1 lần nữa

---

## Chạy local để test trước

```bash
# Trong thư mục project
cat > .env << 'EOF'
GROQ_API_KEY=gsk_xxx
GOOGLE_SEARCH_API_KEY=AIzaSy_xxx
GOOGLE_SEARCH_CX=xxx
EOF

npm install
npm run dev
# Mở http://localhost:3000
```

---

## Cấu trúc project
```
career-ai-groq/
├── server.js          ← Express server + Groq + Google Search
├── package.json
├── .gitignore
├── README.md
└── public/
    └── index.html     ← Toàn bộ frontend (HTML + CSS + JS)
```
