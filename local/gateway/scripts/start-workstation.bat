@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ═══════════════════════════════════════════════════════════════
echo   DoAi.Me Workstation Startup
echo   Device → Node → Network → Server
echo ═══════════════════════════════════════════════════════════════
echo.

:: ───────────────────────────────────────────────────────────────
:: Step 1: Pre-flight checks
:: ───────────────────────────────────────────────────────────────
echo [1/6] Pre-flight 체크...

where adb >nul 2>&1
if errorlevel 1 (
    echo   ERROR: ADB가 설치되어 있지 않거나 PATH에 없습니다.
    echo   설치: https://developer.android.com/studio/releases/platform-tools
    pause
    exit /b 1
)
echo   - ADB 확인됨

where node >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Node.js가 설치되어 있지 않습니다.
    echo   설치: https://nodejs.org
    pause
    exit /b 1
)
echo   - Node.js 확인됨

where curl >nul 2>&1
if errorlevel 1 (
    echo   WARNING: curl이 없어 health check를 건너뜁니다.
)

:: ───────────────────────────────────────────────────────────────
:: Step 2: Check LAIXI.EXE
:: ───────────────────────────────────────────────────────────────
echo.
echo [2/6] LAIXI.EXE 상태 확인...

tasklist /FI "IMAGENAME eq laixi.exe" 2>nul | find /I "laixi.exe" >nul
if errorlevel 1 (
    echo   WARNING: LAIXI.EXE가 실행되지 않았습니다.
    echo   Device 제어를 위해 LAIXI.EXE를 먼저 실행하세요.
    echo.
    set /p CONTINUE="LAIXI 없이 계속하시겠습니까? (y/n): "
    if /i not "!CONTINUE!"=="y" (
        echo   종료합니다.
        pause
        exit /b 1
    )
) else (
    echo   - LAIXI.EXE 실행 중
)

:: ───────────────────────────────────────────────────────────────
:: Step 3: Start ADB server
:: ───────────────────────────────────────────────────────────────
echo.
echo [3/6] ADB 서버 시작...
adb start-server >nul 2>&1
echo   - ADB 서버 시작됨

:: Device count
for /f %%i in ('adb devices ^| find /c /v ""') do set /a DEVICE_COUNT=%%i-2
echo   - 연결된 디바이스: %DEVICE_COUNT%대

:: ───────────────────────────────────────────────────────────────
:: Step 4: Check Cloud Gateway
:: ───────────────────────────────────────────────────────────────
echo.
echo [4/6] Cloud Gateway 연결 확인...
curl -s http://158.247.210.152:3100/health >nul 2>&1
if errorlevel 1 (
    echo   WARNING: Cloud Gateway에 연결할 수 없습니다.
    echo   URL: http://158.247.210.152:3100
) else (
    echo   - Cloud Gateway 접속 가능
)

:: ───────────────────────────────────────────────────────────────
:: Step 5: Start Local Gateway
:: ───────────────────────────────────────────────────────────────
echo.
echo [5/6] Local Gateway 시작...
cd /d %~dp0..

:: Check if already running
curl -s http://localhost:3100/health >nul 2>&1
if not errorlevel 1 (
    echo   - Local Gateway가 이미 실행 중입니다.
    goto :verify
)

:: Start gateway in new window
start "DoAi-Gateway" cmd /k "npm start"
echo   - Gateway 시작 대기 중...
timeout /t 8 /nobreak >nul

:: ───────────────────────────────────────────────────────────────
:: Step 6: Verify connections
:: ───────────────────────────────────────────────────────────────
:verify
echo.
echo [6/6] 연결 상태 확인...

:: Local Gateway
curl -s http://localhost:3100/health >nul 2>&1
if errorlevel 1 (
    echo   ERROR: Local Gateway 시작 실패
    echo   로그를 확인하세요.
    pause
    exit /b 1
)
echo   - Local Gateway: http://localhost:3100

:: Cloud Gateway Node Registration
curl -s http://158.247.210.152:3100/api/nodes | find "node_" >nul 2>&1
if not errorlevel 1 (
    echo   - Cloud Gateway 노드 등록 완료
) else (
    echo   - Cloud Gateway 노드 등록 확인 필요
)

:: ───────────────────────────────────────────────────────────────
:: Complete
:: ───────────────────────────────────────────────────────────────
echo.
echo ═══════════════════════════════════════════════════════════════
echo   Workstation 준비 완료!
echo.
echo   Local Gateway:  http://localhost:3100
echo   Cloud Gateway:  http://158.247.210.152:3100
echo   디바이스:       %DEVICE_COUNT%대
echo.
echo   테스트: node scripts/test-connection.js
echo ═══════════════════════════════════════════════════════════════
echo.
pause
