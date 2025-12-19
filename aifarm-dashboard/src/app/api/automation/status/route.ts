import { NextResponse } from 'next/server';

// 백엔드 API URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // 백엔드 자동화 상태 API 호출
    const response = await fetch(`${BACKEND_URL}/api/automation/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      status: data.status,
      active_devices: data.active_devices,
      running_since: data.running_since,
      total_actions: data.total_actions,
    });
  } catch (error) {
    console.error('상태 조회 실패:', error);
    
    // 개발 모드에서는 모의 응답 반환
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        status: 'idle',
        active_devices: 0,
        running_since: null,
        total_actions: 0,
      });
    }
    
    return NextResponse.json(
      { success: false, error: '상태 조회에 실패했습니다' },
      { status: 500 }
    );
  }
}
