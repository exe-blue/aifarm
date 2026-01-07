/**
 * Laixi Local Device Control API Proxy
 * 
 * Backend API를 프록시하여 로컬 Laixi와 통신합니다.
 * 
 * GET /api/laixi - 상태 및 디바이스 목록
 * POST /api/laixi - YouTube 시청 명령
 * DELETE /api/laixi - YouTube 중지
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8001';

// ============================================
// GET - Laixi 상태 및 디바이스 목록
// ============================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'health';

  try {
    let endpoint: string;
    
    switch (action) {
      case 'devices':
        endpoint = '/api/laixi/devices';
        break;
      case 'health':
      default:
        endpoint = '/api/laixi/health';
    }

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Laixi API] GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Backend 서버에 연결할 수 없습니다',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}

// ============================================
// POST - YouTube 시청 명령
// ============================================

interface WatchRequestBody {
  video_url: string;
  video_id?: string;
  title?: string;
  target_device_ids?: string[] | null;
  watch_duration_seconds?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WatchRequestBody;

    // 필수 파라미터 검증
    if (!body.video_url) {
      return NextResponse.json({
        success: false,
        error: 'video_url은 필수입니다',
      }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/api/laixi/watch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: body.video_url,
        video_id: body.video_id,
        title: body.title,
        target_device_ids: body.target_device_ids,
        watch_duration_seconds: body.watch_duration_seconds || 30,
        mode: 'direct_url',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: data.detail || 'Laixi 명령 실패',
        data,
      }, { status: response.status });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[Laixi API] POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Backend 서버에 연결할 수 없습니다',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}

// ============================================
// DELETE - YouTube 중지
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/api/laixi/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_device_ids: body.target_device_ids || null,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Laixi API] DELETE error:', error);
    return NextResponse.json({
      success: false,
      error: 'Backend 서버에 연결할 수 없습니다',
      detail: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}


