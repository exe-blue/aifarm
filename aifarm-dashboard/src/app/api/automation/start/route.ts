import { NextResponse } from 'next/server';

// 백엔드 API URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST() {
  try {
    // 백엔드 자동화 시작 API 호출
    const response = await fetch(`${BACKEND_URL}/api/automation/start`, {
      method: 'POST',
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
      message: '자동화 시스템이 시작되었습니다',
      active_devices: data.active_devices || 6,
      started_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('자동화 시작 실패:', error);
    
    // 개발 모드에서는 모의 응답 반환
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: '자동화 시스템이 시작되었습니다 (개발 모드)',
        active_devices: 6,
        started_at: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(
      { success: false, error: '자동화 시작에 실패했습니다' },
      { status: 500 }
    );
  }
}
