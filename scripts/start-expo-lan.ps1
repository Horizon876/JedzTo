param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('app', 'kitchen', 'rider')]
    [string]$Target
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $root "package.json"))) {
    $root = Split-Path -Parent $MyInvocation.MyCommand.Path
    if (-not (Test-Path (Join-Path $root "package.json"))) {
        $root = (Get-Location).Path
    }
}

function Get-LanIp {
    $candidates = @()

    try {
        $candidates += Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp, Manual -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike '169.254.*' -and $_.IPAddress -ne '127.0.0.1' } |
            Select-Object -ExpandProperty IPAddress
    } catch {}

    try {
        $candidates += Get-NetIPConfiguration -ErrorAction SilentlyContinue |
            Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
            ForEach-Object { $_.IPv4Address.IPAddress }
    } catch {}

    try {
        $ipconfig = ipconfig | Out-String
        $matches = [regex]::Matches($ipconfig, 'IPv4 Address[.\s]*:\s*(\d+\.\d+\.\d+\.\d+)')
        foreach ($m in $matches) {
            $ip = $m.Groups[1].Value
            if ($ip -ne '127.0.0.1' -and $ip -notlike '169.254.*') {
                $candidates += $ip
            }
        }
    } catch {}

    $ip = $candidates |
        Where-Object { $_ -and $_ -ne '127.0.0.1' } |
        Select-Object -First 1

    if (-not $ip) { $ip = '127.0.0.1' }
    return $ip
}

function Stop-PortListeners([int]$Port) {
    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne 0) {
                Write-Host "Zamykam proces PID $procId na porcie $Port..." -ForegroundColor DarkYellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

function Ensure-Dir([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Force -Path $Path | Out-Null
    }
}

if ($Target -eq 'app') {
    $project = Join-Path $root 'enatega-multivendor-app'
    $port = 8081
    $title = 'JedzTo - App (Expo)'
    $qrFile = Join-Path $root 'expo-qr.png'
} elseif ($Target -eq 'rider') {
    $project = Join-Path $root 'enatega-multivendor-rider'
    $port = 8083
    $title = 'JedzTo - Kierowca (Expo)'
    $qrFile = Join-Path $root 'expo-rider-qr.png'
    $env:EXPO_PUBLIC_APP_ROLE = 'delivery'
} else {
    $project = Join-Path $root 'enatega-multivendor-rider'
    $port = 8082
    $title = 'JedzTo - Kuchnia (Expo)'
    $qrFile = Join-Path $root 'expo-kitchen-qr.png'
    $env:EXPO_PUBLIC_APP_ROLE = 'kitchen'
}

try { $host.ui.RawUI.WindowTitle = $title } catch {}

$lanIp = Get-LanIp
$url = "exp://${lanIp}:${port}"

# Per-target temp dirs — NEVER share one metro-cache between Expo apps.
# Shared %USERPROFILE%\.jedzto-temp\metro-cache caused recurring EPERM on Windows.
$tempRoot = Join-Path $env:USERPROFILE ".jedzto-temp\$Target"
Ensure-Dir $tempRoot
Ensure-Dir (Join-Path $tempRoot "metro-cache")

$env:EXPO_OFFLINE = '1'
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $lanIp
$env:EXPO_DEV_SERVER_HOSTNAME = $lanIp
$env:EXPO_PUBLIC_JEDZTO_API_HOST = $lanIp
$env:TMPDIR = $tempRoot
$env:TEMP = $tempRoot
$env:TMP = $tempRoot

# Free the port from a previous crashed Metro before starting.
Stop-PortListeners -Port $port
Start-Sleep -Milliseconds 400

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " $title" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " LAN IP : $lanIp" -ForegroundColor Green
Write-Host " API    : http://${lanIp}:8001/graphql" -ForegroundColor Green
Write-Host " Port   : $port" -ForegroundColor Green
Write-Host " Temp   : $tempRoot" -ForegroundColor DarkGray
Write-Host " QR URL : $url" -ForegroundColor Yellow
Write-Host ""
Write-Host " Zeskanuj PONIZSZY kod (albo otwarty plik PNG)." -ForegroundColor Yellow
Write-Host " Ignoruj QR z Expo, jesli pokazuje localhost/127.0.0.1." -ForegroundColor DarkYellow
Write-Host "=====================================================" -ForegroundColor Cyan

try {
    npx --yes qrcode -o $qrFile -w 512 $url | Out-Null
    Write-Host "Zapisano QR: $qrFile" -ForegroundColor Green
    Start-Process $qrFile
} catch {
    Write-Host "Nie udalo sie wygenerowac PNG QR: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    npx --yes qrcode $url
} catch {}

Write-Host ""
Write-Host "Start Expo: $project" -ForegroundColor DarkGray
Set-Location $project
npx expo start --lan --port $port --clear
