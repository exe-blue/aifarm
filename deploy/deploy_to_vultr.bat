@echo off
chcp 65001 >nul
echo ==========================================
echo AIFarm Vultr 서버 배포 스크립트
echo ==========================================

set SERVER=158.247.210.152
set SERVER_USER=root
set LOCAL_PATH=d:\exe.blue\ai-fram\aifarm

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

echo 1-1. 설정 스크립트 업로드...
scp d:\exe.blue\ai-fram\deploy\aifarm_setup.sh %SERVER_USER%@%SERVER%:/root/

echo.
echo 1-2. aifarm 프로젝트 폴더 업로드...
scp -r %LOCAL_PATH% %SERVER_USER%@%SERVER%:/opt/

echo.
echo [Step 2] 서버에서 설정 스크립트를 실행합니다...
ssh %SERVER_USER%@%SERVER% "chmod +x /root/aifarm_setup.sh && bash /root/aifarm_setup.sh"

echo.
echo [Step 3] 환경변수 파일 생성...
ssh %SERVER_USER%@%SERVER% "cat > /opt/aifarm/.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
HOST=0.0.0.0
PORT=8080
MAX_WORKERS=100
EOF"

echo.
echo [Step 4] 서비스 시작...
ssh %SERVER_USER%@%SERVER% "systemctl start aifarm"

echo.
echo [Step 5] 상태 확인...
ssh %SERVER_USER%@%SERVER% "systemctl status aifarm"

echo.
echo ==========================================
echo 배포 완료!
echo.
echo 다음 URL로 접속하세요:
echo   http://%SERVER%:8080/dashboard
echo.
echo 로그 확인: ssh %SERVER_USER%@%SERVER% "journalctl -u aifarm -f"
echo ==========================================
pause