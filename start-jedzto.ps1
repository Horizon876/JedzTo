param()

$ErrorActionPreference = "Stop"

function Get-JedzToRoot {
    # 1) Normalne uruchomienie .ps1
    if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "package.json"))) {
        return $PSScriptRoot
    }

    # 2) Skompilowane Odpal_JedzTo.exe (ps2exe) — katalog .exe
    try {
        $exePath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
        if ($exePath) {
            $exeDir = Split-Path -Parent $exePath
            if (Test-Path (Join-Path $exeDir "package.json")) {
                return $exeDir
            }
        }
    } catch {}

    # 3) Argumenty wiersza polecen
    try {
        $arg0 = [Environment]::GetCommandLineArgs()[0]
        if ($arg0) {
            $argDir = Split-Path -Parent ([System.IO.Path]::GetFullPath($arg0))
            if (Test-Path (Join-Path $argDir "package.json")) {
                return $argDir
            }
        }
    } catch {}

    # 4) Fallback: biezacy katalog
    $cwd = (Get-Location).Path
    if (Test-Path (Join-Path $cwd "package.json")) {
        return $cwd
    }

    throw "Nie znaleziono katalogu projektu JedzTo (brak package.json obok launchera)."
}

function Pause-Exit {
    param([int]$Code = 0)
    Write-Host ""
    Write-Host "Nacisnij Enter, aby zamknac to okno..." -ForegroundColor Gray
    try {
        [void][System.Console]::ReadLine()
    } catch {
        Start-Sleep -Seconds 30
    }
    exit $Code
}

try {
    $root = Get-JedzToRoot
    Set-Location $root

    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "   JedzTo - uruchamianie wszystkich serwisow" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host "Katalog: $root" -ForegroundColor DarkGray

    function Ensure-Dependencies {
        param(
            [string]$Path,
            [string]$Label
        )
        $nodeModules = Join-Path $Path "node_modules"
        if (-not (Test-Path $nodeModules)) {
            Write-Host "[$Label] Brak node_modules - instaluje zaleznosci (moze potrwac kilka minut)..." -ForegroundColor Yellow
            Push-Location $Path
            npm install
            if ($LASTEXITCODE -ne 0) {
                throw "npm install nie powiodlo sie w $Path"
            }
            Pop-Location
        }
    }

    Ensure-Dependencies -Path (Join-Path $root "jedzto-local-api") -Label "API"
    Ensure-Dependencies -Path (Join-Path $root "enatega-multivendor-admin") -Label "Admin"
    Ensure-Dependencies -Path (Join-Path $root "enatega-multivendor-app") -Label "App"
    Ensure-Dependencies -Path (Join-Path $root "enatega-multivendor-rider") -Label "Kuchnia"

    $localIp = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp,Manual -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -ne "127.0.0.1" } |
        Select-Object -First 1 -ExpandProperty IPAddress)
    if (-not $localIp) { $localIp = "127.0.0.1" }

    function Start-ServiceWindow {
        param(
            [string]$Title,
            [string]$WorkDir,
            [string]$Command
        )
        Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-Command",
            "`$host.ui.RawUI.WindowTitle = '$Title'; Set-Location '$WorkDir'; $Command"
        )
    }

    Write-Host "`nUruchamiam API (GraphQL)..." -ForegroundColor Green
    Start-ServiceWindow -Title "JedzTo - API" -WorkDir $root -Command "npm run api:dev"

    Start-Sleep -Seconds 2

    Write-Host "Uruchamiam Panel Admina..." -ForegroundColor Green
    Start-ServiceWindow -Title "JedzTo - Admin" -WorkDir $root -Command "npm run admin"

    Start-Sleep -Seconds 1

    Write-Host "Uruchamiam Aplikacje Mobilna (Expo)..." -ForegroundColor Green
    Start-ServiceWindow -Title "JedzTo - App (Expo)" -WorkDir $root -Command "powershell -NoProfile -ExecutionPolicy Bypass -File '.\scripts\start-expo-lan.ps1' -Target app"

    Start-Sleep -Seconds 1

    Write-Host "Uruchamiam Aplikacje Kuchni (Expo)..." -ForegroundColor Green
    Start-ServiceWindow -Title "JedzTo - Kuchnia (Expo)" -WorkDir $root -Command "powershell -NoProfile -ExecutionPolicy Bypass -File '.\scripts\start-expo-lan.ps1' -Target kitchen"

    Start-Sleep -Seconds 3

    Write-Host "`n=====================================================" -ForegroundColor Cyan
    Write-Host " Wszystko uruchomione! Adresy:" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host " API (GraphQL) : http://localhost:8001/graphql"
    Write-Host " Admin         : http://localhost:3000"
    Write-Host " Mobile (Expo) : exp://$($localIp):8081"
    Write-Host " Kuchnia (Expo): exp://$($localIp):8082"
    Write-Host ""
    Write-Host " Dane logowania (seed):"
    Write-Host "   SUPER_ADMIN:       admin@jedzto.local / admin1234"
    Write-Host "   RESTAURANT_OWNER1: owner1@jedzto.local / owner1234  (panel + kuchnia)"
    Write-Host "   RESTAURANT_OWNER2: owner2@jedzto.local / owner1234  (panel + kuchnia)"
    Write-Host "   CUSTOMER:          demo@jedzto.local / demo1234"
    Write-Host "====================================================="

    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"

    Write-Host "`nTo okno mozna zamknac - serwisy dzialaja we wlasnych oknach." -ForegroundColor Gray
    Pause-Exit -Code 0
}
catch {
    Write-Host ""
    Write-Host "BLAD uruchamiania JedzTo:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ScriptStackTrace) {
        Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    }
    Pause-Exit -Code 1
}
