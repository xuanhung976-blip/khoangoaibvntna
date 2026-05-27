# Deploy frontend len Vercel

Backend GAS URL:
https://script.google.com/macros/s/AKfycbz_vOZwwXPHaJXj29KWj-OOAB0ZarWgXWy_cBr9l4aofoRZc-Vdoi8NudBaMct8crlQ4g/exec

Vercel settings:
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist

Environment Variables tren Vercel:
- Name: VITE_API_URL
- Value: https://script.google.com/macros/s/AKfycbz_vOZwwXPHaJXj29KWj-OOAB0ZarWgXWy_cBr9l4aofoRZc-Vdoi8NudBaMct8crlQ4g/exec

Link du kien sau deploy:
https://khoangoaibvntna.vercel.app

Ghi nho:
- Khong copy dist vao Google Apps Script nua.
- Google Apps Script chi la API backend.
- Nguoi dung mo link Vercel, khong mo link GAS.
