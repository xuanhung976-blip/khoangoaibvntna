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
- `SUPABASE_URL`: URL project Supabase, chỉ dùng phía server.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role secret, chỉ dùng phía server.
- Không cấu hình `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` hoặc khóa AI trên Vercel; các biến public cũ đã được gỡ.

Local fullstack test:
- Tao `.env.local` voi `GAS_API_URL=...`
- Chay `vercel dev`
- Frontend se goi same-origin `/api/rpc`

Google Apps Script:
- GAS backend chỉ dùng mã nguồn trong thư mục `gas/` (đúng với `rootDir` trong `.clasp.json`).
- Backend phải có `doPost(e)` dispatcher trong `gas/Code.js`.
- Sau khi sửa `gas/Code.js`, cần chạy `clasp push` và deploy lại Web App GAS để URL `/exec` nhận POST từ Vercel proxy.
- Bản hiện tại chỉ cho phép `loginUser` gọi không có phiên; mọi API đọc/ghi khác đều kiểm tra session.

Supabase:
- Browser không gọi Supabase trực tiếp; dữ liệu bệnh nhân đi qua `/api/clinical`, được kiểm tra session GAS trước khi dùng service role.
- Chạy `supabase_schema_patch_v5_security.sql` trong SQL Editor sau khi hai secret server đã được cấu hình và API kiểm tra thành công.
- Không đưa service-role key hoặc mật khẩu vào biến `VITE_*`.

Báo cáo kiểm soát dữ liệu (chỉ đọc):
- Chỉ chạy trong môi trường quản trị đã nạp `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`; không lưu service key vào repository.
- `npm run report:surgery-data -- 2026-08`
- `npm run report:sync`

Link du kien sau deploy:
https://khoangoaibvntna.vercel.app

Ghi nho:
- Khong copy dist vao Google Apps Script nua.
- Google Apps Script chi la API backend.
- Browser khong goi truc tiep Google Apps Script.
- Nguoi dung mo link Vercel, khong mo link GAS.
