@echo off
title Ethio Matric Academy - Start All Services

echo ============================================
echo   Ethio Matric Academy - Starting Services
echo ============================================
echo.

:: Step 1: Start MySQL if not running
echo [1/3] Checking MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo       MySQL already running. OK
) else (
    echo       Starting MySQL...
    start /B "" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
    timeout /t 5 /nobreak >nul
    echo       MySQL started. OK
)

:: Step 2: Start Backend
echo [2/3] Starting Backend API (port 5000)...
start "Ethio Matric - Backend" cmd /k "cd /d D:\MUSA_WEB\Ethio_Matric_Academy\backend && npm run dev"
timeout /t 3 /nobreak >nul

:: Step 3: Start Frontend  
echo [3/3] Starting Frontend (port 5173)...
start "Ethio Matric - Frontend" cmd /k "cd /d D:\MUSA_WEB\Ethio_Matric_Academy\frontend && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   All services started!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000
echo.
echo   Super Admin: superadmin@ethiomatric.com
echo   Password:    Admin@1234
echo.
echo   Student:     student@ethiomatric.com  
echo   Password:    Student@1234
echo ============================================
echo.
pause
