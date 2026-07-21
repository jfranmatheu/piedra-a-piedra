# Arranca server + cloudflared tunnel
# Uso: .\start-with-tunnel.ps1 [-Port 8765]

param(
    [int]$Port = 8765,
    [string]$Model = "modelo.stones"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    Write-Host "[!] cloudflared no está en el PATH." -ForegroundColor Yellow
    Write-Host "    Instálalo: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    Write-Host "    Arrancando solo el server local..." -ForegroundColor Yellow
    python server.py --port $Port --model $Model
    exit
}

Write-Host "[piedra] Server en http://127.0.0.1:$Port" -ForegroundColor Cyan
$server = Start-Process -FilePath "python" -ArgumentList "server.py","--port",$Port,"--model",$Model -PassThru -NoNewWindow

Start-Sleep -Seconds 1

Write-Host "[piedra] Levantando cloudflared tunnel..." -ForegroundColor Cyan
try {
    cloudflared tunnel --url "http://127.0.0.1:$Port"
}
finally {
    if (-not $server.HasExited) {
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
}
