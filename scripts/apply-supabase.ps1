# Aplica los SQL de scripts/supabase en orden.
# Uso:
#   $env:SUPABASE_DB_URL = "postgresql://postgres:...@db.xxx.supabase.co:5432/postgres"
#   .\scripts\apply-supabase.ps1
#
# Si no tienes psql, copia/pega cada archivo en el SQL Editor del dashboard.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sqlDir = Join-Path $PSScriptRoot "supabase"
$files = @(
  "001_schema.sql",
  "002_rls.sql",
  "003_storage.sql"
)

if (-not $env:SUPABASE_DB_URL) {
  Write-Host "SUPABASE_DB_URL no está definida." -ForegroundColor Yellow
  Write-Host "Abre el SQL Editor de Supabase y ejecuta en orden:" -ForegroundColor Cyan
  foreach ($f in $files) {
    Write-Host "  - scripts/supabase/$f"
  }
  Write-Host "Luego 004_setup_admin.sql tras crear el usuario admin."
  exit 0
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
  Write-Host "psql no está en el PATH. Usa el SQL Editor del dashboard." -ForegroundColor Yellow
  exit 1
}

foreach ($f in $files) {
  $path = Join-Path $sqlDir $f
  Write-Host ">> Applying $f ..." -ForegroundColor Cyan
  & psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) { throw "Failed on $f" }
}

Write-Host "OK. Ahora crea el admin en Auth y ejecuta 004_setup_admin.sql" -ForegroundColor Green
