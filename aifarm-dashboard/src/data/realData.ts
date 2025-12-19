// 실제 데이터 기반 - 현재 상태 반영
// 보드 1~19: 미접속, 보드 20: 접속 (6대 정상, 14대 장애)

import { Device, PhoneBoard, DeviceIssue, Activity, WatchRequest, DashboardStats } from '@/types';

// ==================== 보드 데이터 ====================
export const phoneBoards: PhoneBoard[] = Array.from({ length: 30 }, (_, i) => {
  const boardId = i + 1;
  
  if (boardId <= 19) {
    // 보드 1~19: 미접속
    return {
      id: boardId,
      isConnected: false,
      totalSlots: 20,
      onlineDevices: 0,
      offlineDevices: 20,
      errorDevices: 0,
    };
  } else if (boardId === 20) {
    // 보드 20: 접속됨, 6대 정상, 14대 장애
    return {
      id: boardId,
      isConnected: true,
      totalSlots: 20,
      onlineDevices: 6,
      offlineDevices: 0,
      errorDevices: 14,
    };
  } else {
    // 보드 21~30: 아직 설치 안됨
    return {
      id: boardId,
      isConnected: false,
      totalSlots: 20,
      onlineDevices: 0,
      offlineDevices: 20,
      errorDevices: 0,
    };
  }
});

// ==================== 디바이스 데이터 ====================
export const devices: Device[] = [];

// 보드 20의 디바이스만 생성 (현재 접속된 보드)
for (let slot = 1; slot <= 20; slot++) {
  const isOnline = slot <= 6; // 1~6번만 정상
  devices.push({
    id: (20 - 1) * 20 + slot, // 381 ~ 400
    name: `20-${slot}`,
    boardId: 20,
    slotNumber: slot,
    status: isOnline ? 'online' : 'error',
    currentTask: isOnline ? null : null,
    lastSeen: isOnline ? new Date().toISOString() : new Date(Date.now() - 3600000).toISOString(),
  });
}

// ==================== 장애 목록 ====================
export const deviceIssues: DeviceIssue[] = [];

// 보드 1~19 미접속 장애
for (let boardId = 1; boardId <= 19; boardId++) {
  deviceIssues.push({
    id: `board-${boardId}`,
    deviceName: `보드 ${boardId}`,
    boardId: boardId,
    slotNumber: null,
    issueType: 'board_disconnected',
    message: `보드 ${boardId} 전체 미접속 (20대)`,
    detectedAt: new Date(Date.now() - 7200000).toISOString(),
    resolved: false,
  });
}

// 보드 20의 7~20번 슬롯 장애
for (let slot = 7; slot <= 20; slot++) {
  deviceIssues.push({
    id: `device-20-${slot}`,
    deviceName: `20-${slot}`,
    boardId: 20,
    slotNumber: slot,
    issueType: 'device_error',
    message: `디바이스 응답 없음`,
    detectedAt: new Date(Date.now() - 1800000).toISOString(),
    resolved: false,
  });
}

// ==================== 상시 활동 ====================
export const activities: Activity[] = [
  {
    id: 'shorts_remix',
    name: 'Shorts 리믹스',
    icon: '🎬',
    description: '트렌딩 Shorts 분석 및 리믹스 아이디어',
    allocatedDevices: 0,
    activeDevices: 0,
    isEnabled: true,
    todayTasks: 0,
    successRate: 0,
  },
  {
    id: 'playlist_curator',
    name: 'AI 플레이리스트',
    icon: '🎵',
    description: '테마 기반 플레이리스트 생성',
    allocatedDevices: 0,
    activeDevices: 0,
    isEnabled: true,
    todayTasks: 0,
    successRate: 0,
  },
  {
    id: 'persona_commenter',
    name: '페르소나 댓글',
    icon: '💬',
    description: 'AI 페르소나 댓글 작성',
    allocatedDevices: 0,
    activeDevices: 0,
    isEnabled: true,
    todayTasks: 0,
    successRate: 0,
  },
  {
    id: 'trend_scout',
    name: '트렌드 스카우터',
    icon: '🔍',
    description: '신규 트렌드/크리에이터 발굴',
    allocatedDevices: 0,
    activeDevices: 0,
    isEnabled: true,
    todayTasks: 0,
    successRate: 0,
  },
  {
    id: 'challenge_hunter',
    name: '챌린지 헌터',
    icon: '🏆',
    description: '챌린지/밈 탐지',
    allocatedDevices: 0,
    activeDevices: 0,
    isEnabled: true,
    todayTasks: 0,
    successRate: 0,
  },
  {
    id: 'thumbnail_lab',
    name: '썸네일 랩',
    icon: '🔬',
    description: '썸네일/제목 CTR 분석',
    allocatedDevices: 0,
    activeDevices: 0,
    isEnabled: true,
    todayTasks: 0,
    successRate: 0,
  },
];

// ==================== 시청 요청 (빈 상태) ====================
export const watchRequests: WatchRequest[] = [];

// ==================== 대시보드 통계 ====================
export const dashboardStats: DashboardStats = {
  // 디바이스: 600대 중 6대만 정상
  totalDevices: 600,
  onlineDevices: 6,
  offlineDevices: 380, // 보드 1~19 (19 * 20)
  busyDevices: 0,
  errorDevices: 14, // 보드 20의 7~20번
  
  // 보드: 30개 중 1개만 접속
  totalBoards: 30,
  connectedBoards: 1,
  
  // 시청 요청
  pendingRequests: 0,
  activeRequests: 0,
  todayViews: 0,
  
  // 활동
  activeActivities: 0,
};

// ==================== 장애 요약 ====================
export const issueSummary = {
  disconnectedBoards: 19,
  disconnectedBoardDevices: 380,
  errorDevicesOnBoard20: 14,
  totalIssueDevices: 394,
  healthyDevices: 6,
};
