@echo off
chcp 65001 >nul
echo ==========================================
echo AIFarm Vultr 서버 배포 스크립트
echo ==========================================

REM ============================================================
REM Environment Variable Configuration
REM Set these via environment or they will be prompted
REM ============================================================

REM Check for SERVER environment variable or prompt
if not defined SERVER (
    if defined AIFARM_SERVER_HOST (
        set SERVER=%AIFARM_SERVER_HOST%
    ) else (
        set /p SERVER="Enter server IP address: "
    )
)

REM Check for SERVER_USER environment variable or use default (non-root)
if not defined SERVER_USER (
    if defined AIFARM_SERVER_USER (
        set SERVER_USER=%AIFARM_SERVER_USER%
    ) else (
        set SERVER_USER=deploy
        echo Using default deploy user: deploy (not root for security)
    )
)

REM Check for LOCAL_PATH environment variable or prompt
if not defined LOCAL_PATH (
    if defined AIFARM_LOCAL_PATH (
        set LOCAL_PATH=%AIFARM_LOCAL_PATH%
    ) else (
        set /p LOCAL_PATH="Enter local aifarm path: "
    )
)

REM Validate required variables
if "%SERVER%"=="" (
    echo ERROR: SERVER is required. Set SERVER environment variable or enter when prompted.
    exit /b 1
)
if "%LOCAL_PATH%"=="" (
    echo ERROR: LOCAL_PATH is required. Set LOCAL_PATH environment variable or enter when prompted.
    exit /b 1
)

REM Warn if using root user
if "%SERVER_USER%"=="root" (
    echo.
    echo ⚠️ WARNING: Using root user is not recommended!
    echo Please create a dedicated deploy user with sudo access instead.
    echo.
    set /p CONTINUE_AS_ROOT="Continue anyway? (y/N): "
    if /i not "%CONTINUE_AS_ROOT%"=="y" (
        echo Aborting. Create a deploy user and retry.
        exit /b 1
    )
)

echo.
echo [Step 0] SSH 호스트 키 확인...
echo 서버 호스트 키를 known_hosts에 추가합니다 (MITM 공격 방지)

REM Check if .ssh directory exists, create if not
if not exist "%USERPROFILE%\.ssh" (
    echo .ssh 디렉토리 생성 중...
    mkdir "%USERPROFILE%\.ssh"
)

REM Check if host key already exists in known_hosts
findstr /C:"%SERVER%" "%USERPROFILE%\.ssh\known_hosts" >nul 2>&1
if %errorlevel% neq 0 (
    echo 호스트 키가 없습니다. ssh-keyscan으로 추가합니다...
    ssh-keyscan -H %SERVER% >> "%USERPROFILE%\.ssh\known_hosts" 2>nul
    if %errorlevel% equ 0 (
        echo 호스트 키가 known_hosts에 추가되었습니다.
    ) else (
        echo 경고: ssh-keyscan 실패. 계속하시겠습니까?
        pause
    )
) else (
    echo 호스트 키가 이미 known_hosts에 존재합니다.
)

echo.
echo [Step 1] 프로젝트 파일을 서버에 업로드합니다...
echo 비밀번호를 입력하라는 메시지가 나오면 서버 비밀번호를 입력하세요.
echo.

REM Set remote home directory based on user
if "%SERVER_USER%"=="root" (
    set REMOTE_HOME=/root
) else (
    set REMOTE_HOME=/home/%SERVER_USER%
)

echo 1-1. 설정 스크립트 업로드...
scp "%~dp0aifarm_setup.sh" %SERVER_USER%@%SERVER%:%REMOTE_HOME%/

echo.
echo 1-2. aifarm 프로젝트 폴더 업로드 (to user home first)...
scp -r "%LOCAL_PATH%" %SERVER_USER%@%SERVER%:%REMOTE_HOME%/aifarm_upload/

echo.
echo [Step 2] 서버에서 설정 스크립트를 실행합니다...
if "%SERVER_USER%"=="root" (
    ssh %SERVER_USER%@%SERVER% "chmod +x %REMOTE_HOME%/aifarm_setup.sh && bash %REMOTE_HOME%/aifarm_setup.sh"
    ssh %SERVER_USER%@%SERVER% "mv %REMOTE_HOME%/aifarm_upload/* /opt/aifarm/ 2>/dev/null || cp -r %REMOTE_HOME%/aifarm_upload/* /opt/aifarm/"
) else (
    ssh %SERVER_USER%@%SERVER% "chmod +x %REMOTE_HOME%/aifarm_setup.sh && sudo bash %REMOTE_HOME%/aifarm_setup.sh"
    ssh %SERVER_USER%@%SERVER% "sudo mv %REMOTE_HOME%/aifarm_upload/* /opt/aifarm/ 2>/dev/null || sudo cp -r %REMOTE_HOME%/aifarm_upload/* /opt/aifarm/"
)

echo.
echo [Step 3] 환경변수 파일 생성...

REM ============================================================
REM Supabase Credentials - Required for runtime
REM ============================================================

REM Check for SUPABASE_URL
if not defined SUPABASE_URL (
    set /p SUPABASE_URL="Enter SUPABASE_URL (e.g., https://xxxx.supabase.co): "
)

REM Check for SUPABASE_KEY
if not defined SUPABASE_KEY (
    set /p SUPABASE_KEY="Enter SUPABASE_KEY (anon key from Supabase dashboard): "
)

REM Validate Supabase credentials
if "%SUPABASE_URL%"=="" (
    echo ERROR: SUPABASE_URL is required!
    echo Set SUPABASE_URL environment variable or provide when prompted.
    exit /b 1
)
if "%SUPABASE_KEY%"=="" (
    echo ERROR: SUPABASE_KEY is required!
    echo Set SUPABASE_KEY environment variable or provide when prompted.
    exit /b 1
)

REM Check for placeholder values
echo %SUPABASE_URL% | findstr /i "your-project" >nul
if %errorlevel%==0 (
    echo.
    echo ==========================================
    echo ERROR: SUPABASE_URL contains placeholder value!
    echo Please provide your actual Supabase project URL.
    echo Get it from: https://app.supabase.com/project/_/settings/api
    echo ==========================================
    exit /b 1
)

echo %SUPABASE_KEY% | findstr /i "your-anon-key" >nul
if %errorlevel%==0 (
    echo.
    echo ==========================================
    echo ERROR: SUPABASE_KEY contains placeholder value!
    echo Please provide your actual Supabase anon key.
    echo Get it from: https://app.supabase.com/project/_/settings/api
    echo ==========================================
    exit /b 1
)

echo Creating .env file with validated credentials...
if "%SERVER_USER%"=="root" (
    ssh %SERVER_USER%@%SERVER% "cat > /opt/aifarm/.env << 'EOF'
SUPABASE_URL=%SUPABASE_URL%
SUPABASE_KEY=%SUPABASE_KEY%
HOST=0.0.0.0
PORT=8080
MAX_WORKERS=100
EOF"
) else (
    ssh %SERVER_USER%@%SERVER% "sudo bash -c 'cat > /opt/aifarm/.env << EOF
SUPABASE_URL=%SUPABASE_URL%
SUPABASE_KEY=%SUPABASE_KEY%
HOST=0.0.0.0
PORT=8080
MAX_WORKERS=100
EOF'"
)

echo.
echo [Step 4] 서비스 시작...
if "%SERVER_USER%"=="root" (
    ssh %SERVER_USER%@%SERVER% "systemctl start aifarm"
) else (
    ssh %SERVER_USER%@%SERVER% "sudo systemctl start aifarm"
)

echo.
echo [Step 5] 상태 확인...
if "%SERVER_USER%"=="root" (
    ssh %SERVER_USER%@%SERVER% "systemctl status aifarm"
) else (
    ssh %SERVER_USER%@%SERVER% "sudo systemctl status aifarm"
)

echo.
echo ==========================================
echo 배포 완료!
echo.
echo 다음 URL로 접속하세요:
echo   http://%SERVER%:8080/dashboard
echo.
if "%SERVER_USER%"=="root" (
    echo 로그 확인: ssh %SERVER_USER%@%SERVER% "journalctl -u aifarm -f"
) else (
    echo 로그 확인: ssh %SERVER_USER%@%SERVER% "sudo journalctl -u aifarm -f"
)
echo ==========================================
pause