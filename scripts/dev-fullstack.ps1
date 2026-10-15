param([int]$Port = 3007)
Set-Location (Split-Path $PSScriptRoot -Parent)
# Nạp biến server-side từ .env.local (vercel dev không tự nạp khi có .env).
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$') {
    $value = $Matches[2].Trim('"')
    [Environment]::SetEnvironmentVariable($Matches[1], $value, 'Process')
  }
}
# API dùng SUPABASE_URL; .env chỉ có bản VITE_.
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*VITE_SUPABASE_URL\s*=\s*(.*)\s*$' -and -not $env:SUPABASE_URL) { $env:SUPABASE_URL = $Matches[1].Trim('"') }
}
vercel dev --listen "127.0.0.1:$Port" --yes
