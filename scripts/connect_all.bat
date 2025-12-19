@echo off
REM connect_all.bat - 600대 ADB 연결 스크립트 (Windows)

echo === 600대 ADB 연결 시작 ===

REM VLAN 10: 10.0.10.1 ~ 10.0.10.254 (254대)
for /L %%i in (1,1,254) do (
    start /B adb connect 10.0.10.%%i:5555
)
timeout /t 5 /nobreak >nul

REM VLAN 11: 10.0.11.1 ~ 10.0.11.254 (254대)
for /L %%i in (1,1,254) do (
    start /B adb connect 10.0.11.%%i:5555
)
timeout /t 5 /nobreak >nul

REM VLAN 12: 10.0.12.1 ~ 10.0.12.92 (92대)
for /L %%i in (1,1,92) do (
    start /B adb connect 10.0.12.%%i:5555
)
timeout /t 5 /nobreak >nul

echo === 연결 완료 ===
adb devices | findstr ":5555"

