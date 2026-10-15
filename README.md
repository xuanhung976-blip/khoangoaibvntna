# Hệ thống quản lý Khoa Ngoại Tổng hợp

Ứng dụng Vite/React sử dụng Google Apps Script cho xác thực và các phân hệ hành chính; dữ liệu lâm sàng đi qua API server trước khi truy cập Supabase.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure `GAS_API_URL`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` on the server. Never expose the Supabase service key through a `VITE_*` variable.
3. Run the app:
   `npm run dev`
