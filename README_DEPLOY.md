# Deploy frontend len Vercel

Backend GAS URL:
https://script.google.com/macros/s/AKfycbyDFOw5JmJf88YYYS3mU7IorWF_F2tUyuNOF8belqwats3xTd1njTI_ab0ahonrvzHrQA/exec

Vercel settings:
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist

Environment Variables tren Vercel:
- Name: GAS_API_URL
- Value: https://script.google.com/macros/s/AKfycbyDFOw5JmJf88YYYS3mU7IorWF_F2tUyuNOF8belqwats3xTd1njTI_ab0ahonrvzHrQA/exec

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
