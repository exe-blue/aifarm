# ═══════════════════════════════════════════════════════════════════
#  DoAi.Me PC Node OOBE (Out of Box Experience) Script
#  Windows PowerShell에서 실행
#
#  기능:
#    1. 시스템 정보 수집 (CPU, RAM, USB 포트)
#    2. Supabase node_health 테이블에 자동 등록
#    3. ADB로 연결된 디바이스 자동 감지 및 등록
#    4. config.json 자동 생성
#
#  사용법:
#    .\oobe-pc.ps1
#
#  @author DoAi.Me Team
#  @version 1.0.0
#  @date 2026-01-06
# ═══════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════
# 설정 (반드시 수정)
# ═══════════════════════════════════════════════════════════════════

$SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
$SUPABASE_ANON_KEY = "YOUR_ANON_KEY"

# ═══════════════════════════════════════════════════════════════════
# 변수 초기화
# ═══════════════════════════════════════════════════════════════════

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir "config.json"
$adbPath = "C:\Program Files\Laixi\tools\platform-tools\adb.exe"

# ═══════════════════════════════════════════════════════════════════
# 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════

function Write-Banner {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║        DoAi.Me PC Node OOBE Setup                         ║" -ForegroundColor Cyan
    Write-Host "║        Out of Box Experience                              ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "[$Step] $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  [ERROR] $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [INFO] $Message" -ForegroundColor Gray
}

# ═══════════════════════════════════════════════════════════════════
# 설정 검증
# ═══════════════════════════════════════════════════════════════════

function Test-Configuration {
    Write-Step "1/6" "설정 검증 중..."

    if ($SUPABASE_URL -eq "https://YOUR_PROJECT.supabase.co") {
        Write-Error "SUPABASE_URL을 설정하세요!"
        Write-Host "  스크립트 상단의 `$SUPABASE_URL 변수를 수정하세요." -ForegroundColor Yellow
        return $false
    }

    if ($SUPABASE_ANON_KEY -eq "YOUR_ANON_KEY") {
        Write-Error "SUPABASE_ANON_KEY를 설정하세요!"
        Write-Host "  스크립트 상단의 `$SUPABASE_ANON_KEY 변수를 수정하세요." -ForegroundColor Yellow
        return $false
    }

    Write-Success "설정 검증 완료"
    return $true
}

# ═══════════════════════════════════════════════════════════════════
# 시스템 정보 수집
# ═══════════════════════════════════════════════════════════════════

function Get-SystemInfo {
    Write-Step "2/6" "시스템 정보 수집 중..."

    $info = @{}

    # 컴퓨터 이름
    $info.hostname = $env:COMPUTERNAME
    Write-Info "호스트명: $($info.hostname)"

    # CPU 정보
    try {
        $cpu = Get-CimInstance -ClassName Win32_Processor | Select-Object -First 1
        $info.cpu = @{
            name = $cpu.Name.Trim()
            cores = $cpu.NumberOfCores
            threads = $cpu.NumberOfLogicalProcessors
        }
        Write-Info "CPU: $($info.cpu.name) ($($info.cpu.cores)코어/$($info.cpu.threads)스레드)"
    } catch {
        $info.cpu = @{ name = "Unknown"; cores = 0; threads = 0 }
    }

    # RAM 정보
    try {
        $ram = Get-CimInstance -ClassName Win32_ComputerSystem
        $totalRamGB = [math]::Round($ram.TotalPhysicalMemory / 1GB, 1)
        $info.ram = @{
            total_gb = $totalRamGB
        }
        Write-Info "RAM: ${totalRamGB}GB"
    } catch {
        $info.ram = @{ total_gb = 0 }
    }

    # USB 포트 정보
    try {
        $usbHubs = Get-CimInstance -ClassName Win32_USBHub | Measure-Object
        $info.usb = @{
            hub_count = $usbHubs.Count
        }
        Write-Info "USB Hub: $($info.usb.hub_count)개"
    } catch {
        $info.usb = @{ hub_count = 0 }
    }

    # 네트워크 정보
    try {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 |
               Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } |
               Select-Object -First 1).IPAddress
        $info.ip_address = $ip
        Write-Info "IP 주소: $ip"
    } catch {
        $info.ip_address = "0.0.0.0"
    }

    # OS 정보
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem
        $info.os = @{
            name = $os.Caption
            version = $os.Version
            build = $os.BuildNumber
        }
        Write-Info "OS: $($info.os.name)"
    } catch {
        $info.os = @{ name = "Windows"; version = "Unknown"; build = "0" }
    }

    Write-Success "시스템 정보 수집 완료"
    return $info
}

# ═══════════════════════════════════════════════════════════════════
# Node ID 생성/확인
# ═══════════════════════════════════════════════════════════════════

function Get-NodeId {
    Write-Step "3/6" "Node ID 확인 중..."

    # 기존 config.json이 있으면 node_id 읽기
    if (Test-Path $configPath) {
        try {
            $existingConfig = Get-Content $configPath -Raw | ConvertFrom-Json
            if ($existingConfig.node_id) {
                Write-Success "기존 Node ID 발견: $($existingConfig.node_id)"
                return $existingConfig.node_id
            }
        } catch {
            Write-Info "기존 config.json 파싱 실패, 새로 생성"
        }
    }

    # 새 Node ID 생성
    # 호스트명 기반 또는 사용자 입력
    $hostname = $env:COMPUTERNAME

    # 간단한 숫자 추출 시도 (예: DOAI-PC-01 → NODE_01)
    if ($hostname -match '(\d+)$') {
        $nodeNum = [int]$matches[1]
        $nodeId = "NODE_{0:D2}" -f $nodeNum
    } else {
        # 숫자 없으면 사용자 입력
        Write-Host ""
        Write-Host "  이 PC의 Node 번호를 입력하세요 (1-99): " -NoNewline -ForegroundColor Yellow
        $inputNum = Read-Host

        if ($inputNum -match '^\d+$') {
            $nodeNum = [int]$inputNum
            $nodeId = "NODE_{0:D2}" -f $nodeNum
        } else {
            $nodeId = "NODE_01"
        }
    }

    Write-Success "Node ID: $nodeId"
    return $nodeId
}

# ═══════════════════════════════════════════════════════════════════
# Supabase에 노드 등록
# ═══════════════════════════════════════════════════════════════════

function Register-NodeToSupabase {
    param(
        [string]$NodeId,
        [hashtable]$SystemInfo
    )

    Write-Step "4/6" "Supabase에 노드 등록 중..."

    $headers = @{
        "apikey" = $SUPABASE_ANON_KEY
        "Authorization" = "Bearer $SUPABASE_ANON_KEY"
        "Content-Type" = "application/json"
        "Prefer" = "return=representation"
    }

    $body = @{
        p_node_id = $NodeId
        p_node_name = "미니PC-$($NodeId.Split('_')[1])"
        p_node_type = "MINI_PC"
        p_ip_address = $SystemInfo.ip_address
        p_hardware_info = @{
            cpu = $SystemInfo.cpu
            ram = $SystemInfo.ram
            usb = $SystemInfo.usb
            hostname = $SystemInfo.hostname
        }
        p_os_info = $SystemInfo.os
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/register_node_oobe" `
            -Method POST `
            -Headers $headers `
            -Body $body

        Write-Success "노드 등록 완료"
        Write-Info "응답: $($response | ConvertTo-Json -Compress)"
        return $true
    } catch {
        Write-Error "노드 등록 실패: $_"
        Write-Info "직접 등록을 시도합니다..."

        # RPC 실패 시 직접 upsert 시도
        try {
            $directBody = @{
                node_id = $NodeId
                node_name = "미니PC-$($NodeId.Split('_')[1])"
                node_type = "MINI_PC"
                ip_address = $SystemInfo.ip_address
                status = "INITIALIZING"
                oobe_completed = $true
                oobe_completed_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                hardware_info = @{
                    cpu = $SystemInfo.cpu
                    ram = $SystemInfo.ram
                    usb = $SystemInfo.usb
                    hostname = $SystemInfo.hostname
                }
                os_info = $SystemInfo.os
                last_heartbeat = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            } | ConvertTo-Json -Depth 5

            $directHeaders = @{
                "apikey" = $SUPABASE_ANON_KEY
                "Authorization" = "Bearer $SUPABASE_ANON_KEY"
                "Content-Type" = "application/json"
                "Prefer" = "resolution=merge-duplicates"
            }

            Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/node_health" `
                -Method POST `
                -Headers $directHeaders `
                -Body $directBody

            Write-Success "직접 등록 완료"
            return $true
        } catch {
            Write-Error "직접 등록도 실패: $_"
            return $false
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# ADB로 연결된 디바이스 감지 및 등록
# ═══════════════════════════════════════════════════════════════════

function Register-ConnectedDevices {
    param([string]$NodeId)

    Write-Step "5/6" "연결된 디바이스 감지 중..."

    # ADB 경로 확인
    if (-not (Test-Path $adbPath)) {
        # 기본 경로에 없으면 시스템 PATH에서 찾기
        $adbPath = (Get-Command adb -ErrorAction SilentlyContinue).Source
        if (-not $adbPath) {
            Write-Error "ADB를 찾을 수 없습니다"
            Write-Info "Laixi를 설치하거나 ADB 경로를 확인하세요"
            return @()
        }
    }

    Write-Info "ADB 경로: $adbPath"

    # 디바이스 목록 가져오기
    try {
        $adbOutput = & $adbPath devices -l 2>&1
        $lines = $adbOutput -split "`n" | Where-Object { $_ -match 'device\s' -and $_ -notmatch '^List' }

        if ($lines.Count -eq 0) {
            Write-Info "연결된 디바이스 없음"
            return @()
        }

        Write-Info "감지된 디바이스: $($lines.Count)대"

        $devices = @()
        $headers = @{
            "apikey" = $SUPABASE_ANON_KEY
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        }

        foreach ($line in $lines) {
            if ($line -match '^(\S+)\s+device') {
                $serial = $matches[1]

                # 모델명 추출
                $model = "Unknown"
                if ($line -match 'model:(\S+)') {
                    $model = $matches[1]
                }

                # Android 버전 가져오기
                $androidVersion = "Unknown"
                try {
                    $androidVersion = (& $adbPath -s $serial shell getprop ro.build.version.release 2>&1).Trim()
                } catch {}

                Write-Info "  디바이스: $serial ($model, Android $androidVersion)"

                # Supabase에 등록
                try {
                    $body = @{
                        p_serial = $serial
                        p_node_id = $NodeId
                        p_model = $model
                        p_android_version = $androidVersion
                        p_registered_by = "OOBE:$NodeId"
                    } | ConvertTo-Json

                    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/register_device_oobe" `
                        -Method POST `
                        -Headers $headers `
                        -Body $body

                    $devices += @{
                        serial = $serial
                        model = $model
                        android_version = $androidVersion
                    }

                    Write-Success "  $serial 등록 완료"
                } catch {
                    Write-Error "  $serial 등록 실패: $_"
                }
            }
        }

        return $devices
    } catch {
        Write-Error "ADB 실행 오류: $_"
        return @()
    }
}

# ═══════════════════════════════════════════════════════════════════
# config.json 생성
# ═══════════════════════════════════════════════════════════════════

function New-ConfigFile {
    param(
        [string]$NodeId,
        [array]$Devices
    )

    Write-Step "6/6" "config.json 생성 중..."

    $nodeNum = $NodeId.Split('_')[1]

    $config = @{
        node_id = $NodeId
        node_name = "미니PC-$nodeNum"
        supabase = @{
            url = $SUPABASE_URL
            anon_key = $SUPABASE_ANON_KEY
        }
        laixi = @{
            api_base = "http://127.0.0.1:8080"
            adb_path = $adbPath
        }
        heartbeat = @{
            interval_ms = 30000
            task_poll_ms = 5000
        }
        devices = $Devices
    }

    $configJson = $config | ConvertTo-Json -Depth 5
    $configJson | Out-File -FilePath $configPath -Encoding UTF8

    Write-Success "config.json 생성 완료"
    Write-Info "경로: $configPath"

    return $configPath
}

# ═══════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════

function Start-OOBE {
    Write-Banner

    # 1. 설정 검증
    if (-not (Test-Configuration)) {
        Write-Host ""
        Write-Host "OOBE 중단. 설정을 수정 후 다시 실행하세요." -ForegroundColor Red
        exit 1
    }

    # 2. 시스템 정보 수집
    $systemInfo = Get-SystemInfo

    # 3. Node ID 확인
    $nodeId = Get-NodeId

    # 4. Supabase에 노드 등록
    $nodeRegistered = Register-NodeToSupabase -NodeId $nodeId -SystemInfo $systemInfo

    # 5. 연결된 디바이스 등록
    $devices = Register-ConnectedDevices -NodeId $nodeId

    # 6. config.json 생성
    $configPath = New-ConfigFile -NodeId $nodeId -Devices $devices

    # 완료 메시지
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    OOBE 완료!                             ║" -ForegroundColor Green
    Write-Host "╠═══════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  Node ID     : $($nodeId.PadRight(42))║" -ForegroundColor Green
    Write-Host "║  디바이스 수 : $($devices.Count.ToString().PadRight(42))║" -ForegroundColor Green
    Write-Host "║  config.json : 생성됨                                     ║" -ForegroundColor Green
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Yellow
    Write-Host "  1. npm install (최초 1회)" -ForegroundColor White
    Write-Host "  2. npm start (Heartbeat 시작)" -ForegroundColor White
    Write-Host ""
}

# 실행
Start-OOBE
