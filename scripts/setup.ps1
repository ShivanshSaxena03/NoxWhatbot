# Setup Script for Jarvis WhatsApp AI Assistant (Windows PowerShell)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   JARVIS WHATSAPP AI ASSISTANT SETUP SCRIPT     " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "[!] .env file not found. Copying .env.example to .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[+] Created .env file. Please edit .env with your Neon DATABASE_URL and OPENROUTER_API_KEY." -ForegroundColor Green
}

Write-Host "[*] Installing dependencies..." -ForegroundColor Cyan
npm install

Write-Host "[*] Generating Prisma Database Client for Neon PostgreSQL..." -ForegroundColor Cyan
npm run db:generate

Write-Host "[*] Building monorepo packages..." -ForegroundColor Cyan
npm run build

Write-Host "=================================================" -ForegroundColor Green
Write-Host "   SETUP COMPLETE!                              " -ForegroundColor Green
Write-Host "   Run 'npm run dev' to start local servers      " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
