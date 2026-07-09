@echo off
setlocal enabledelayedexpansion

:: Cambiar al directorio donde esta el script
cd /d "%~dp0"
set "PROJECT_DIR=%CD%"
set "LOGS_DIR=%PROJECT_DIR%\logs"

:: Crear directorio de logs si no existe
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

echo ================================================================
echo  Iniciando Sistema de Despacho (Windows)...
echo ================================================================
echo.

:: Intentar obtener la IP local (Wi-Fi/Ethernet)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"Direcci"') do (
    set "LOCAL_IP=%%a"
)
if defined LOCAL_IP (
    set LOCAL_IP=!LOCAL_IP: =!
) else (
    set LOCAL_IP=localhost
)

echo [1/3] Iniciando Frontend (Puerto 5173)...
cd "%PROJECT_DIR%\frontend"
start "Frontend" /b cmd /c "npm run dev -- --host > "%LOGS_DIR%\Frontend.log" 2>&1"

:: Esperar 2 segundos
timeout /t 2 /nobreak >nul

echo [2/3] Iniciando Laravel API (Puerto 8000)...
cd "%PROJECT_DIR%\laravel-api"
start "Laravel" /b cmd /c "php -d extension=pdo_pgsql -d extension=pgsql artisan serve --host=0.0.0.0 > "%LOGS_DIR%\Laravel.log" 2>&1"

:: Esperar 2 segundos
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando Backend Node (Puerto 4000)...
cd "%PROJECT_DIR%\backend"
start "Backend" /b cmd /c "npm run dev --host > "%LOGS_DIR%\Backend.log" 2>&1"

echo.
echo ================================================================
echo  ✅ Todos los servicios iniciados en segundo plano
echo ================================================================
echo.
echo  🌐 Accede a la aplicacion en:
echo     Frontend:    http://localhost:5173
echo     Laravel API: http://localhost:8000
echo     Backend:     http://localhost:4000 (opcional)
echo.
if not "%LOCAL_IP%"=="localhost" (
echo  📱 Para acceder desde celulares/tablets en tu red Wi-Fi:
echo     - Frontend:    http://%LOCAL_IP%:5173
echo     - Laravel API: http://%LOCAL_IP%:8000
)
echo.
echo ================================================================
echo  📋 Los logs se estan guardando en la carpeta "logs"
echo ================================================================
echo.
echo  ⛔ ATENCION: Para detener todos los servicios, NO CIERRES
echo     LA VENTANA DE GOLPE. Presiona una tecla aqui abajo:
echo.
pause

echo.
echo Deteniendo servicios...
taskkill /F /IM php.exe /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
echo ✅ Servicios detenidos exitosamente.

endlocal
