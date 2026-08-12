# Fix recurring Metro EPERM on Windows by clearing shared/locked caches
# and freeing Expo ports. Run: npm run fix:metro

$ErrorActionPreference = "Continue"
$tempRoot = Join-Path $env:USERPROFILE ".jedzto-temp"

Write-Host "=== JedzTo Metro cache fix ===" -ForegroundColor Cyan

function Stop-PortListeners([int]$Port) {
    try {
        $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -and $procId -ne 0) {
                Write-Host "Stopping PID $procId (port $Port)" -ForegroundColor DarkYellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# Stop Expo/Metro on known ports
@(8081, 8082, 8083) | ForEach-Object { Stop-PortListeners -Port $_ }
Start-Sleep -Milliseconds 800

# Remove the OLD shared metro-cache that caused EPERM between apps
$sharedCache = Join-Path $tempRoot "metro-cache"
if (Test-Path -LiteralPath $sharedCache) {
    Write-Host "Removing shared cache: $sharedCache" -ForegroundColor Yellow
    cmd /c "rmdir /s /q `"$sharedCache`"" 2>$null
    if (Test-Path -LiteralPath $sharedCache) {
        # Fallback when files are still briefly locked
        Get-ChildItem -LiteralPath $sharedCache -Force -ErrorAction SilentlyContinue |
            ForEach-Object {
                cmd /c "rmdir /s /q `"$($_.FullName)`"" 2>$null | Out-Null
            }
        Remove-Item -LiteralPath $sharedCache -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Remove stale metro file-map blobs in the shared temp root
if (Test-Path -LiteralPath $tempRoot) {
    Get-ChildItem -LiteralPath $tempRoot -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like "metro-file-map-*" } |
        ForEach-Object {
            Write-Host "Removing $($_.Name)" -ForegroundColor DarkGray
            Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
        }
}

# Ensure per-app temp dirs exist (used by start-expo-lan.ps1)
foreach ($name in @("app", "kitchen", "store")) {
    $dir = Join-Path $tempRoot $name
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $dir "metro-cache") | Out-Null
}

# Clear project-local metro caches
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $root "package.json"))) {
    $root = (Get-Location).Path
}

@(
    "enatega-multivendor-app",
    "enatega-multivendor-store",
    "enatega-multivendor-rider"
) | ForEach-Object {
    $cache = Join-Path $root "$_\.metro-cache"
    if (Test-Path -LiteralPath $cache) {
        Write-Host "Clearing project cache: $cache" -ForegroundColor DarkGray
        cmd /c "rmdir /s /q `"$cache`"" 2>$null
    }
    $expo = Join-Path $root "$_\.expo"
    if (Test-Path -LiteralPath $expo) {
        Remove-Item -LiteralPath (Join-Path $expo "metro") -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "Done. Start again with: npm run app   OR   npm run kitchen" -ForegroundColor Green
Write-Host "Each app now uses its own cache under %USERPROFILE%\.jedzto-temp\<app|kitchen>" -ForegroundColor Green
