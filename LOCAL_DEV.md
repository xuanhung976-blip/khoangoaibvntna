# Chạy local fullstack

Không dùng `npm run preview` để test login/API vì Vite preview chỉ serve frontend static và không chạy Vercel API route `/api/rpc`.

Dùng PowerShell:

```powershell
$env:GAS_API_URL="https://script.google.com/macros/s/xxx/exec"
vercel dev --listen 127.0.0.1:3005
```

Mở:

```text
http://127.0.0.1:3005/#/
```

Nếu port `3005` bận, đổi sang port khác và mở đúng port mà `vercel dev` báo trong terminal.

## Kiểm tra nhanh API

Sau khi `vercel dev` báo ready, test `/api/rpc`:

```powershell
$body = '{"funcName":"loginUser","args":["admin","wrong-password"]}'
Invoke-WebRequest -Uri "http://127.0.0.1:3005/api/rpc" -Method POST -ContentType "application/json" -Body $body
```

Kỳ vọng là có JSON trả về. Nếu thiếu env, API trả `RPC_CONFIG_ERROR`. Nếu GAS lỗi hoặc chưa deploy đúng, API trả `RPC_FETCH_FAILED` hoặc `RPC_BAD_RESPONSE`.

## Env

Proxy ưu tiên:

```text
GAS_API_URL
```

Có hỗ trợ alias:

```text
GAS_WEB_APP_URL
```

Frontend vẫn gọi same-origin `/api/rpc`; không gọi Google Apps Script trực tiếp từ browser trong production.
