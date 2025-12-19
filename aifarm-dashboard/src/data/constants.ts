// AIFarm Dashboard v4 - Constants

import type { DeviceStatus, ActivityType, WatchRequestStatus } from '@/types';

// ==================== 디바이스 상태 ====================
export const DEVICE_STATUS_CONFIG: Record<DeviceStatus, {
  label: string;
  labelShort: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  online: {
    label: '정상',
    labelShort: '정상',
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    icon: '🟢',
  },
  temp_high: {
    label: '문제-온도',
    labelShort: '온도',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: '🟠',
  },
  wrong_mode: {
    label: '문제-모드',
    labelShort: '모드',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    icon: '🟡',
  },
  disconnected: {
    label: '연결-없음',
    labelShort: '없음',
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: '🔴',
  },
  unstable: {
    label: '연결-불안정',
    labelShort: '불안정',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    icon: '🟣',
  },
};

// ==================== 시청 요청 상태 ====================
export const WATCH_REQUEST_STATUS_CONFIG: Record<WatchRequestStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: '대기중',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
  scheduled: {
    label: '예약됨',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  in_progress: {
    label: '진행중',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  completed: {
    label: '완료',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  failed: {
    label: '실패',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  cancelled: {
    label: '취소됨',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
};

// ==================== 유휴 활동 ====================
export const ACTIVITY_CONFIG: Record<ActivityType, {
  name: string;
  icon: string;
  description: string;
  color: string;
}> = {
  shorts_remix: {
    name: 'Shorts 리믹스',
    icon: '🎬',
    description: 'Shorts 영상을 리믹스하여 재업로드',
    color: 'text-pink-400',
  },
  playlist_curator: {
    name: '플레이리스트 큐레이터',
    icon: '🎵',
    description: '플레이리스트 생성 및 영상 추가',
    color: 'text-blue-400',
  },
  persona_commenter: {
    name: '페르소나 코멘터',
    icon: '💬',
    description: '다양한 페르소나로 댓글 작성',
    color: 'text-green-400',
  },
  trend_scout: {
    name: '트렌드 스카우터',
    icon: '🔍',
    description: '트렌드 영상 발굴 및 시청',
    color: 'text-yellow-400',
  },
  challenge_hunter: {
    name: '챌린지 헌터',
    icon: '🏆',
    description: '인기 챌린지 참여 및 홍보',
    color: 'text-purple-400',
  },
  thumbnail_lab: {
    name: '썸네일 랩',
    icon: '🔬',
    description: '썸네일 클릭률 테스트',
    color: 'text-cyan-400',
  },
};

// ==================== 보드/슬롯 설정 ====================
export const BOARD_CONFIG = {
  TOTAL_BOARDS: 30,
  SLOTS_PER_BOARD: 20,
  TOTAL_DEVICES: 600,
  AP_GROUPS: 5,
} as const;

// ==================== AP 그룹별 서브넷 ====================
export const AP_SUBNETS: Record<number, string> = {
  1: '10.0.1',
  2: '10.0.2',
  3: '10.0.3',
  4: '10.0.4',
  5: '10.0.5',
};

// ==================== 우선순위 ====================
export const PRIORITY_CONFIG: Record<1 | 2 | 3, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  1: {
    label: 'P1 긴급',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  2: {
    label: 'P2 일반',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  3: {
    label: 'P3 낮음',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
};

// ==================== 서버 설정 ====================
export const SERVER_CONFIG = {
  VULTR_IP: '158.247.210.152',
  DEVICE_CONTROL_PORT: 10039,
  SCREEN_STREAM_PORT: 22222,
  ADB_PORT: 5037,
} as const;

// ==================== 색상 팔레트 ====================
export const COLORS = {
  // 배경
  bgPrimary: '#09090b',
  bgSecondary: '#18181b',
  bgTertiary: '#27272a',
  
  // 텍스트
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  
  // 상태
  statusOnline: '#22c55e',
  statusTemp: '#f97316',
  statusMode: '#eab308',
  statusOffline: '#ef4444',
  statusUnstable: '#a855f7',
  
  // 액센트
  accentBlue: '#3b82f6',
  accentPurple: '#8b5cf6',
  accentCyan: '#06b6d4',
} as const;

// ==================== 네비게이션 메뉴 ====================
export const NAV_MENU = {
  management: {
    label: '관리',
    icon: 'Settings',
    items: [
      { href: '/dashboard/devices', label: '기기 관리', icon: 'Smartphone', description: '600대 디바이스 상태' },
      { href: '/dashboard/channels', label: '채널 관리', icon: 'Youtube', description: 'YouTube 채널 통계' },
      { href: '/dashboard/boards', label: '보드 현황', icon: 'LayoutGrid', description: '30개 보드 연결 상태' },
    ],
  },
  tasks: {
    label: '작업',
    icon: 'Play',
    items: [
      { href: '/dashboard/watch', label: '시청 요청', icon: 'PlayCircle', description: '영상 시청 요청', highlight: true },
      { href: '/dashboard/uploads', label: '업로드 관리', icon: 'Upload', description: '영상 업로드 스케줄' },
      { href: '/dashboard/logs', label: '작업 로그', icon: 'History', description: '완료된 작업 히스토리' },
    ],
  },
  idle: {
    label: '유휴',
    icon: 'Activity',
    items: [
      { href: '/dashboard/idle', label: '활동 현황', icon: 'Activity', description: '6대 유휴 활동 모니터링' },
      { href: '/dashboard/idle/settings', label: '활동 설정', icon: 'Settings2', description: '활동별 할당/확률 설정' },
    ],
  },
} as const;
