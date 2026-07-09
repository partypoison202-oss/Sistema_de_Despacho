$ErrorActionPreference = "SilentlyContinue"

Write-Host "Iniciando Sistema de Despacho..." -ForegroundColor Cyan
Write-Host ""

$ProjectDir = $PSScriptRoot
$LogsDir = Join-Path $ProjectDir "logs"
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir | Out-Null }

Write-Host "Directorio del proyecto: $ProjectDir"
Write-Host ""

# Intentar obtener la IP local (usando ipconfig para mayor compatibilidad)
$IP = "localhost"
$ipconfigOutput = (ipconfig | Select-String -Pattern 'IPv4')
if ($ipconfigOutput) {
    $IP = ($ipconfigOutput | Select-Object -Last 1).Line.Split(':')[-1].Trim()
}
if (-not $IP -or $IP -eq "") { $IP = "localhost" }

function Start-ServiceJob {
    param($Name, $Path, $Command, $LogFile)
    Write-Host "$Name" -ForegroundColor Yellow
    
    $JobScript = {
        param($p, $c, $l)
        Set-Location $p
        cmd.exe /c "$c > ""$l"" 2>&1"
    }
    Start-Job -Name $Name -ScriptBlock $JobScript -ArgumentList $Path, $Command, $LogFile | Out-Null
}

# 1. Iniciar Frontend
Start-ServiceJob -Name 'Iniciando Frontend (Vite) en puerto 5173...' -Path "$ProjectDir\frontend" -Command 'npm run dev -- --host' -LogFile "$LogsDir\Frontend.log"

# 2. Iniciar Laravel API
Start-ServiceJob -Name 'Iniciando Laravel API en puerto 8000...' -Path "$ProjectDir\laravel-api" -Command 'C:\php84\php.exe -d extension=pdo_pgsql -d extension=pgsql artisan serve --host=0.0.0.0' -LogFile "$LogsDir\Laravel API.log"

# 3. Iniciar Backend Node
Start-ServiceJob -Name 'Iniciando Backend Node en puerto 4000...' -Path "$ProjectDir\backend" -Command 'npm run dev --host' -LogFile "$LogsDir\Backend Node.log"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Todos los servicios estan corriendo en segundo plano:" -ForegroundColor Green
Write-Host "   - Frontend:    http://localhost:5173"
Write-Host "   - Laravel API: http://localhost:8000"
Write-Host "   - Node API:    http://localhost:4000"
Write-Host ""

if ($IP -ne "localhost") {
    Write-Host "Para acceder desde otros dispositivos (CELULARES/TABLETS) en tu red Wi-Fi:" -ForegroundColor Cyan
    Write-Host "   - Frontend:    http://$($IP):5173"
    Write-Host "   - Laravel API: http://$($IP):8000"
} else {
    Write-Host "(No se pudo detectar la IP local para compartir en red)" -ForegroundColor Cyan
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Los logs se estan escribiendo en la carpeta: $LogsDir" -ForegroundColor DarkGray
Write-Host "Presiona [Ctrl+C] en esta ventana para detener todos los servicios." -ForegroundColor Red
Write-Host "========================================================" -ForegroundColor Cyan

try {
    while ($true) { Start-Sleep -Seconds 1 }
}
finally {
    Write-Host ""
    Write-Host "Deteniendo todos los servicios..." -ForegroundColor Yellow
    Get-Job | Stop-Job -PassThru | Remove-Job
    
    Stop-Process -Name "php" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
}
