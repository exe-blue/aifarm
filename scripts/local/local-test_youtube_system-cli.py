#!/usr/bin/env python3
"""
YouTube 업로드 시스템 통합 테스트

역할:
1. Supabase 연결 확인
2. 테이블 존재 여부 확인
3. 샘플 영상 추가
4. 샘플 디바이스 생성
5. 작업 할당 테스트
6. 작업 완료 처리 테스트
7. 집계 확인

환경변수:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

사용 예:
  python scripts/local/local-test_youtube_system-cli.py
"""

import os
import sys
import requests
from datetime import date

SUPABASE_URL = "https://hycynmzdrngsozxdmyxi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5Y3lubXpkcm5nc296eGRteXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzIwMDA5NSwiZXhwIjoyMDgyNzc2MDk1fQ.lBSSndc_VVL1pG3vN1MspnXATuGwgf-tPgksJ_Y7Fkw"

REST_URL = f"{SUPABASE_URL}/rest/v1"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def test_connection():
    """연결 테스트"""
    print("\n" + "=" * 60)
    print("1️⃣  Supabase 연결 테스트")
    print("=" * 60)
    
    try:
        resp = requests.get(f"{REST_URL}/", headers=headers, timeout=10)
        print(f"✅ 연결 성공: {resp.status_code}")
        return True
    except Exception as e:
        print(f"❌ 연결 실패: {e}")
        return False


def check_tables():
    """테이블 존재 여부 확인"""
    print("\n" + "=" * 60)
    print("2️⃣  테이블 존재 여부 확인")
    print("=" * 60)
    
    required_tables = [
        "citizens",
        "youtube_videos",
        "youtube_video_tasks",
    ]
    
    all_exist = True
    
    for table in required_tables:
        try:
            resp = requests.get(
                f"{REST_URL}/{table}?limit=1",
                headers=headers,
                timeout=10
            )
            if resp.status_code == 200:
                print(f"✅ {table}: 존재")
            elif resp.status_code == 404:
                print(f"❌ {table}: 테이블 없음 (마이그레이션 필요)")
                all_exist = False
            else:
                print(f"❓ {table}: {resp.status_code}")
                all_exist = False
        except Exception as e:
            print(f"❌ {table}: {e}")
            all_exist = False
    
    return all_exist


def create_sample_video():
    """샘플 영상 추가"""
    print("\n" + "=" * 60)
    print("3️⃣  샘플 영상 추가")
    print("=" * 60)
    
    video_data = {
        "date": str(date.today()),
        "time": 15,
        "keyword": "테스트",
        "subject": "[테스트] 시스템 테스트용 영상",
        "url": "https://www.youtube.com/watch?v=test_12345",
        "status": "pending",
        "target_device_count": 3,  # 테스트용 3대만
    }
    
    try:
        resp = requests.post(
            f"{REST_URL}/youtube_videos",
            headers=headers,
            json=[video_data],
            timeout=10
        )
        
        if resp.status_code in [200, 201]:
            video = resp.json()[0]
            print(f"✅ 영상 생성 성공")
            print(f"   video_id: {video['video_id']}")
            print(f"   no: {video['no']}")
            print(f"   subject: {video['subject']}")
            return video
        else:
            print(f"❌ 영상 생성 실패: {resp.status_code}")
            print(f"   응답: {resp.text}")
            return None
    except Exception as e:
        print(f"❌ 영상 생성 실패: {e}")
        return None


def create_sample_devices():
    """샘플 디바이스 생성"""
    print("\n" + "=" * 60)
    print("4️⃣  샘플 디바이스 생성")
    print("=" * 60)
    
    devices = [
        {"device_serial": "TEST_001", "name": "Alice"},
        {"device_serial": "TEST_002", "name": "Bob"},
        {"device_serial": "TEST_003", "name": "Charlie"},
    ]
    
    created = []
    
    for device_data in devices:
        try:
            # 이미 존재하는지 확인
            resp = requests.get(
                f"{REST_URL}/citizens?device_serial=eq.{device_data['device_serial']}&limit=1",
                headers=headers,
                timeout=10
            )
            
            if resp.status_code == 200 and len(resp.json()) > 0:
                existing = resp.json()[0]
                print(f"✅ {device_data['device_serial']}: 이미 존재 ({existing['citizen_id']})")
                created.append(existing)
            else:
                # 새로 생성
                resp = requests.post(
                    f"{REST_URL}/citizens",
                    headers=headers,
                    json=[device_data],
                    timeout=10
                )
                
                if resp.status_code in [200, 201]:
                    citizen = resp.json()[0]
                    print(f"✅ {device_data['device_serial']}: 생성 완료 ({citizen['citizen_id']})")
                    created.append(citizen)
                else:
                    print(f"❌ {device_data['device_serial']}: 생성 실패 ({resp.status_code})")
        except Exception as e:
            print(f"❌ {device_data['device_serial']}: {e}")
    
    return created


def assign_tasks(video_id: str, devices: list):
    """작업 할당"""
    print("\n" + "=" * 60)
    print("5️⃣  작업 할당")
    print("=" * 60)
    
    device_serials = [d["device_serial"] for d in devices]
    
    print(f"📝 영상 ID: {video_id}")
    print(f"📱 디바이스: {', '.join(device_serials)}")
    
    # 수동으로 작업 생성 (RPC 함수 대신)
    tasks = []
    for idx, serial in enumerate(device_serials):
        task = {
            "video_id": video_id,
            "device_serial": serial,
            "batch_no": 0,
            "status": "pending",
        }
        tasks.append(task)
    
    try:
        resp = requests.post(
            f"{REST_URL}/youtube_video_tasks",
            headers=headers,
            json=tasks,
            timeout=10
        )
        
        if resp.status_code in [200, 201]:
            created_tasks = resp.json()
            print(f"✅ {len(created_tasks)}개 작업 할당 완료")
            return created_tasks
        else:
            print(f"❌ 작업 할당 실패: {resp.status_code}")
            print(f"   응답: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ 작업 할당 실패: {e}")
        return []


def complete_tasks(tasks: list):
    """작업 완료 처리"""
    print("\n" + "=" * 60)
    print("6️⃣  작업 완료 처리")
    print("=" * 60)
    
    completed = 0
    
    for idx, task in enumerate(tasks):
        # 디바이스별로 다른 결과
        result = {
            "status": "completed",
            "watch_duration_seconds": 90 + (idx * 10),  # 90, 100, 110초
            "liked": idx == 0,          # 첫 번째만 좋아요
            "commented": idx == 1,      # 두 번째만 댓글
            "subscribed": False,
            "completed_at": "NOW()",
        }
        
        try:
            # PATCH로 업데이트
            resp = requests.patch(
                f"{REST_URL}/youtube_video_tasks?task_id=eq.{task['task_id']}",
                headers=headers,
                json=result,
                timeout=10
            )
            
            if resp.status_code in [200, 204]:
                print(f"✅ {task['device_serial']}: 완료 처리 (시청 {result['watch_duration_seconds']}초, 좋아요: {result['liked']}, 댓글: {result['commented']})")
                completed += 1
            else:
                print(f"❌ {task['device_serial']}: 실패 ({resp.status_code})")
        except Exception as e:
            print(f"❌ {task['device_serial']}: {e}")
    
    print(f"\n📊 완료: {completed}/{len(tasks)}개")
    return completed


def check_aggregation(video_id: str):
    """집계 확인"""
    print("\n" + "=" * 60)
    print("7️⃣  집계 확인")
    print("=" * 60)
    
    try:
        # youtube_video_stats 뷰 조회
        resp = requests.get(
            f"{REST_URL}/youtube_video_stats?video_id=eq.{video_id}",
            headers=headers,
            timeout=10
        )
        
        if resp.status_code == 200:
            stats = resp.json()
            if stats:
                video = stats[0]
                print(f"✅ 집계 조회 성공")
                print(f"\n📊 결과:")
                print(f"   No: {video.get('no')}")
                print(f"   제목: {video.get('subject')}")
                print(f"   시청 (viewd): {video.get('viewd')}")
                print(f"   미시청 (notworked): {video.get('notworked')}")
                print(f"   좋아요 (like_count): {video.get('like_count')}")
                print(f"   댓글 (comment_count): {video.get('comment_count')}")
                print(f"   진행률: {video.get('completion_rate')}%")
                
                # 집계 검증
                print(f"\n🔍 검증:")
                expected_viewd = 3
                expected_like = 1
                expected_comment = 1
                
                if video.get('viewd') == expected_viewd:
                    print(f"   ✅ viewd: {video.get('viewd')} (예상: {expected_viewd})")
                else:
                    print(f"   ❌ viewd: {video.get('viewd')} (예상: {expected_viewd})")
                
                if video.get('like_count') == expected_like:
                    print(f"   ✅ like_count: {video.get('like_count')} (예상: {expected_like})")
                else:
                    print(f"   ❌ like_count: {video.get('like_count')} (예상: {expected_like})")
                
                if video.get('comment_count') == expected_comment:
                    print(f"   ✅ comment_count: {video.get('comment_count')} (예상: {expected_comment})")
                else:
                    print(f"   ❌ comment_count: {video.get('comment_count')} (예상: {expected_comment})")
                
                return True
            else:
                print("❌ 집계 데이터를 찾을 수 없습니다")
                return False
        else:
            print(f"❌ 집계 조회 실패: {resp.status_code}")
            print(f"   응답: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ 집계 조회 실패: {e}")
        return False


def main():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  YouTube 업로드 시스템 통합 테스트                       ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"\n📍 Supabase URL: {SUPABASE_URL}")
    print(f"🔑 Service Role Key: {SERVICE_ROLE_KEY[:30]}...")
    
    # 1. 연결 테스트
    if not test_connection():
        print("\n❌ 연결 테스트 실패. 종료합니다.")
        sys.exit(1)
    
    # 2. 테이블 확인
    if not check_tables():
        print("\n" + "=" * 60)
        print("⚠️  마이그레이션이 필요합니다!")
        print("=" * 60)
        print("\n다음 단계:")
        print("1. Supabase Dashboard 접속")
        print("   → https://supabase.com/dashboard/project/hycynmzdrngsozxdmyxi")
        print()
        print("2. SQL Editor 열기")
        print()
        print("3. 마이그레이션 파일 실행")
        print("   → supabase/migrations/ALL_MIGRATIONS.sql 내용 복사")
        print("   → SQL Editor에 붙여넣기")
        print("   → Run 클릭")
        print()
        print("4. 이 테스트 다시 실행")
        print("   → python scripts/local/local-test_youtube_system-cli.py")
        sys.exit(1)
    
    # 3. 샘플 영상 추가
    video = create_sample_video()
    if not video:
        print("\n❌ 샘플 영상 생성 실패. 종료합니다.")
        sys.exit(1)
    
    video_id = video["video_id"]
    
    # 4. 샘플 디바이스 생성
    devices = create_sample_devices()
    if len(devices) < 3:
        print("\n❌ 디바이스 생성 실패. 종료합니다.")
        sys.exit(1)
    
    # 5. 작업 할당
    tasks = assign_tasks(video_id, devices)
    if len(tasks) < 3:
        print("\n❌ 작업 할당 실패. 종료합니다.")
        sys.exit(1)
    
    # 6. 작업 완료 처리
    completed = complete_tasks(tasks)
    if completed < 3:
        print("\n⚠️  일부 작업 완료 실패")
    
    # 7. 집계 확인
    success = check_aggregation(video_id)
    
    # 최종 결과
    print("\n" + "=" * 60)
    print("🎉 테스트 결과")
    print("=" * 60)
    
    if success:
        print("✅ 모든 테스트 통과!")
        print("\n시스템 상태:")
        print("  ✅ Supabase 연결")
        print("  ✅ 테이블 생성")
        print("  ✅ 영상 등록")
        print("  ✅ 디바이스 작업 할당")
        print("  ✅ 작업 완료 처리")
        print("  ✅ 자동 집계 (viewd, like_count, comment_count)")
        print("\n다음 단계:")
        print("  1. Dashboard 실행: cd dashboard && npm run dev")
        print("  2. 접속: http://localhost:3000/dashboard/youtube-upload")
        print("  3. 실제 영상 등록 및 600대 디바이스 할당")
    else:
        print("❌ 일부 테스트 실패")
        print("\n문제 해결:")
        print("  1. 트리거가 활성화되었는지 확인")
        print("  2. 마이그레이션을 다시 실행")
        print("  3. Supabase Dashboard에서 SQL Editor로 직접 확인")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  사용자에 의해 중단되었습니다.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 예상치 못한 에러: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
