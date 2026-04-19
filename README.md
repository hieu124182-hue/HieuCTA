# 🔭 Career AI v3

Khác hoàn toàn với v1/v2:
- **Không có mode cứng nhắc** — chat tự nhiên như ChatGPT
- **Đọc link** — dán bất kỳ URL nào vào chat, AI đọc và phân tích luôn
- **Tự động tìm web** — phát hiện khi nào cần search, không search lung tung
- **Kiểm định thông tin** — phân tích đa chiều, không trả lời theo khuôn

---

## Thay code cũ trong repo bằng terminal

```bash
# 1. Vào thư mục repo cũ (đã clone sẵn)
cd ~/path/to/your-repo

# 2. Xóa toàn bộ code cũ
rm -rf public server.js package.json package-lock.json .gitignore README.md src

# 3. Giải nén career-ai-v3.zip (đổi đường dẫn cho đúng)
# Trên macOS/Linux:
unzip ~/Downloads/career-ai-v3.zip -d /tmp/
cp /tmp/career-ai-v3/server.js .
cp /tmp/career-ai-v3/package.json .
cp /tmp/career-ai-v3/.gitignore .
cp /tmp/career-ai-v3/README.md .
cp -r /tmp/career-ai-v3/public .

# Trên Windows (PowerShell):
# Expand-Archive ~\Downloads\career-ai-v3.zip -DestinationPath C:\tmp\
# copy C:\tmp\career-ai-v3\server.js .
# copy C:\tmp\career-ai-v3\package.json .
# xcopy C:\tmp\career-ai-v3\public public /E /I

# 4. Push lên GitHub → Render tự redeploy
git add .
git commit -m "v3: natural chat, link reader, smart search"
git push origin main
```

---

## Environment Variables trên Render (giữ nguyên 3 key)

| Key | Mô tả |
|---|---|
| `GROQ_API_KEY` | Lấy tại console.groq.com (free, không cần thẻ) |
| `GOOGLE_SEARCH_API_KEY` | Google Cloud Console → Credentials |
| `GOOGLE_SEARCH_CX` | programmablesearchengine.google.com |

---

## Chạy local

```bash
npm install

# Tạo .env
echo "GROQ_API_KEY=gsk_xxx" > .env
echo "GOOGLE_SEARCH_API_KEY=AIzaSy_xxx" >> .env
echo "GOOGLE_SEARCH_CX=xxx" >> .env

npm run dev
# → http://localhost:3000
```

---

## Cấu trúc
```
career-ai-v3/
├── server.js       ← Groq + Google Search + Link fetcher
├── package.json
├── .gitignore
└── public/
    └── index.html  ← Chat UI tự nhiên như ChatGPT
```
