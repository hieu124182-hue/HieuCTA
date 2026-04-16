# 🔭 Career Trend AI — 100% Miễn Phí

**Stack:** Gemini 2.0 Flash (AI) + Google Custom Search (web thời gian thực) + Render.com (hosting)
**Chi phí:** $0 — không cần credit card cho bất kỳ service nào

---

## Lấy 3 API Keys miễn phí

### 1. GEMINI API KEY (bắt buộc)
> Model AI mạnh nhất, hoàn toàn miễn phí, không cần credit card

1. Vào: https://aistudio.google.com/apikey
2. Đăng nhập bằng tài khoản Google
3. Click **"Create API Key"**
4. Copy key (dạng `AIzaSy...`)

---

### 2. GOOGLE SEARCH API KEY (để tìm web thật)
> 100 lượt tìm kiếm/ngày miễn phí — đủ cho cá nhân dùng

**Bước A — Lấy API Key:**
1. Vào: https://console.cloud.google.com/apis/credentials
2. Đăng nhập Google → tạo project mới (đặt tên tùy ý)
3. Click **"+ Create Credentials"** → **"API Key"**
4. Copy key vừa tạo

**Bước B — Bật Custom Search API:**
1. Vào: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
2. Click **"Enable"**

---

### 3. GOOGLE SEARCH ENGINE ID (CX)
> Tạo search engine tìm toàn bộ web

1. Vào: https://programmablesearchengine.google.com/
2. Click **"Add"** → tạo search engine mới
3. Ở mục **"What to search?"** chọn **"Search the entire web"**
4. Đặt tên tùy ý → Click **"Create"**
5. Vào **"Customize"** → Copy **"Search engine ID"** (dạng số dài như `017576662512468239146:omuauf...`)

---

## Deploy lên Render.com

### Bước 1 — Upload lên GitHub
```bash
# Trong thư mục career-ai-free
git init
git add .
git commit -m "Initial commit"
```
- Vào github.com → New repository → đặt tên `career-ai-free`
- Copy 2 lệnh `git remote add` và `git push` → paste vào terminal

### Bước 2 — Tạo Web Service trên Render
1. Vào render.com → đăng nhập bằng GitHub
2. **"New +"** → **"Web Service"**
3. Chọn repo `career-ai-free`
4. Cấu hình:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### Bước 3 — Thêm Environment Variables
Kéo xuống phần **"Environment Variables"**, thêm 3 biến:

| Key | Value |
|-----|-------|
| `GEMINI_API_KEY` | `AIzaSy...` (từ bước 1) |
| `GOOGLE_SEARCH_API_KEY` | `AIzaSy...` (từ bước 2A) |
| `GOOGLE_SEARCH_CX` | `017576...` (từ bước 3) |

> Nếu chưa có Google Search keys, chỉ điền `GEMINI_API_KEY` — app vẫn chạy, chỉ không có web search thật

### Bước 4 — Deploy
- Click **"Create Web Service"**
- Chờ 2-3 phút → nhận URL dạng `https://career-ai-free-xxxx.onrender.com`

---

## Chạy local để test

```bash
# Tạo file .env
cat > .env << EOF
GEMINI_API_KEY=AIzaSy...
GOOGLE_SEARCH_API_KEY=AIzaSy...
GOOGLE_SEARCH_CX=017576...
EOF

# Cài và chạy
npm install
npm run dev
```

Mở: http://localhost:3000

---

## Cấu trúc
```
career-ai-free/
├── server.js        # Express + Gemini API + Google Search
├── package.json
├── .gitignore
├── README.md
└── public/
    └── index.html   # Toàn bộ frontend
```

## Giới hạn free tier
| Service | Giới hạn |
|---------|---------|
| Gemini 2.0 Flash | 15 req/phút, 1500 req/ngày |
| Google Custom Search | 100 search/ngày |
| Render.com | Ngủ sau 15 phút idle, wake up ~30s |
