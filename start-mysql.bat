@echo off
echo Starting MySQL Server 8.4...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo MySQL is already running.
) else (
    start /B "" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
    echo MySQL started.
    timeout /t 3 /nobreak >nul
)
echo Done.
