# Deploy frontend len Vercel

Backend GAS URL:
https://script.google.com/macros/s/AKfycbz_vOZwwXPHaJXj29KWj-OOAB0ZarWgXWy_cBr9l4aofoRZc-Vdoi8NudBaMct8crlQ4g/exec

Vercel settings:
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist

Environment Variables tren Vercel:
- Name: GAS_API_URL
- Value: https://script.google.com/macros/s/AKfycbz_vOZwwXPHaJXj29KWj-OOAB0ZarWgXWy_cBr9l4aofoRZc-Vdoi8NudBaMct8crlQ4g/exec

Local fullstack test:
- Tao `.env.local` voi `GAS_API_URL=...`
- Chay `vercel dev`
- Frontend se goi same-origin `/api/rpc`

Google Apps Script:
- GAS backend phai co `doPost(e)` dispatcher trong `Code.js`.
- Sau khi sua `Code.js`, can deploy lai Web App GAS de URL `/exec` nhan POST tu Vercel proxy.

Link du kien sau deploy:
https://khoangoaibvntna.vercel.app

Ghi nho:
- Khong copy dist vao Google Apps Script nua.
- Google Apps Script chi la API backend.
- Browser khong goi truc tiep Google Apps Script.
- Nguoi dung mo link Vercel, khong mo link GAS.
