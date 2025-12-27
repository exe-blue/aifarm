@echo off
REM Final test script - simulates deploy.bat caret detection logic
setlocal EnableDelayedExpansion

echo ==========================================
echo Final Caret Detection Test
echo ==========================================
echo.
echo This test simulates the exact logic used in deploy.bat
echo to verify caret detection works correctly.
echo.

REM Temp file for caret detection (same as deploy.bat)
set "CARET_CHECK_TMP=%TEMP%\deploy_caret_check_%RANDOM%.tmp"

set "PASS_COUNT=0"
set "FAIL_COUNT=0"

REM Parse test_values.txt similar to deploy.bat
for /f "usebackq tokens=*" %%L in ("%~dp0test_values.txt") do (
    set "LINE=%%L"
    
    if not "!LINE!"=="" (
        for /f "tokens=1,* delims==" %%a in ("!LINE!") do (
            set "KEY=%%a"
            set "VAL=%%b"
            
            echo Testing: !KEY!
            
            REM Exact same logic as deploy.bat
            set "SAFE_VAL=1"
            echo !VAL! | findstr /l /c:"&" >nul && set "SAFE_VAL=0"
            echo !VAL! | findstr /l /c:"|" >nul && set "SAFE_VAL=0"
            echo !VAL! | findstr /l /c:"<" >nul && set "SAFE_VAL=0"
            echo !VAL! | findstr /l /c:">" >nul && set "SAFE_VAL=0"
            echo !VAL! | findstr /l /c:"`" >nul && set "SAFE_VAL=0"
            REM Caret detection using temp file method
            >"!CARET_CHECK_TMP!" (set VAL)
            findstr /l "^^" "!CARET_CHECK_TMP!" >nul 2>&1 && set "SAFE_VAL=0"
            
            REM Check results - NORMAL_KEY should be SAFE, others should be UNSAFE
            set "EXPECTED=0"
            if "!KEY!"=="NORMAL_KEY" set "EXPECTED=1"
            
            if "!SAFE_VAL!"=="!EXPECTED!" (
                echo   [PASS] SAFE_VAL=!SAFE_VAL! as expected
                set /a PASS_COUNT+=1
            )
            if not "!SAFE_VAL!"=="!EXPECTED!" (
                echo   [FAIL] SAFE_VAL=!SAFE_VAL! expected !EXPECTED!
                set /a FAIL_COUNT+=1
            )
            echo.
        )
    )
)

REM Cleanup
if exist "!CARET_CHECK_TMP!" del "!CARET_CHECK_TMP!" >nul 2>&1

echo ==========================================
echo Test Results
echo ==========================================
echo   Passed: !PASS_COUNT!
echo   Failed: !FAIL_COUNT!
echo.
if "!FAIL_COUNT!"=="0" echo   ALL TESTS PASSED!
if not "!FAIL_COUNT!"=="0" echo   SOME TESTS FAILED!
echo ==========================================
pause