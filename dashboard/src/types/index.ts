// Types for AIFarm Dashboard

export interface Device {
  id: number;
  phoneBoardId: number;
  status: 'active' | 'idle' | 'error' | 'maintenance';
  currentActivity?: ActivityType;
  currentActivityStartedAt?: string;
  lastHeartbeat?: string;
  totalActivitiesToday: number;
  errorCountToday: number;
}

export type ActivityType = 
  | 'shorts_remix'
  | 'playlist_curator'
  | 'persona_commenter'
  | 'trend_scout'
  | 'challenge_hunter'
  | 'thumbnail_lab';

export interface Activity {
  id: ActivityType;
  name: string;
  icon: string;
  description: string;
  color: string;
  allocatedDevices: number;
  activeDevices: number;
  itemsProcessedToday: number;
  successRate: number;
}

export interface Channel {
  id: string;
  youtubeChannelId: string;
  name: string;
  category: string;
  thumbnailUrl?: string;
  subscriberCount: number;
  totalViews: number;
  level: number;
  experiencePoints: number;
  experienceToNextLevel: number;
  compositeScore: number;
  categoryRank: number;
  globalRank: number;
  stats: ChannelStats;
  weeklyGrowth: number;
}

export interface ChannelStats {
  hp: number; // 구독자 유지율
  mp: number; // 업로드 일관성
  atk: number; // 바이럴 파워
  def: number; // 커뮤니티 건강도
  spd: number; // 성장 속도
  int: number; // AI 추천 수용률
}

export interface Competitor {
  id: string;
  youtubeChannelId: string;
  name: string;
  category: string;
  subscriberCount: number;
  recentViews: number;
  engagementRate: number;
  categoryRank: number;
  thumbnailUrl?: string;
}

export interface Quest {
  id: string;
  channelId: string;
  questType: 'daily' | 'weekly' | 'achievement';
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  progress: number;
  rewardExp: number;
  rewardBadge?: string;
  status: 'active' | 'completed' | 'failed';
  deadlineAt?: string;
}

export interface BattleLogEntry {
  id: string;
  eventType: 'rank_up' | 'rank_down' | 'viral_hit' | 'quest_complete' | 'challenge_join' | 'trend_catch';
  ourChannelId?: string;
  ourChannelName?: string;
  competitorChannelId?: string;
  competitorChannelName?: string;
  description: string;
  impactScore: number;
  createdAt: string;
}

export interface TrendingShorts {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  viewCount: number;
  viralScore: number;
  viralFactors: string[];
  musicTitle?: string;
  hashtags: string[];
  detectedAt: string;
}

export interface RemixIdea {
  id: string;
  sourceShorts: TrendingShorts[];
  title: string;
  conceptDescription: string;
  differentiationPoint: string;
  remixDirection: 'parody' | 'mashup' | 'localization' | 'twist';
  recommendedMusic?: string;
  estimatedViralProbability: number;
  status: 'pending' | 'approved' | 'in_production' | 'published' | 'rejected';
  targetChannel?: Channel;
  createdAt: string;
}

export interface Challenge {
  id: string;
  name: string;
  hashtags: string[];
  musicTitle?: string;
  lifecycleStage: 'birth' | 'growth' | 'peak' | 'decline' | 'dead';
  totalParticipants: number;
  dailyNewParticipants: number;
  avgViewCount: number;
  isActive: boolean;
  firstDetectedAt: string;
  opportunityScore: number;
}

// ==================== ADR-005 v2: The Void of Irrelevance ====================

/**
 * 존재 상태 (Existence State)
 * 
 * ACTIVE → WAITING → FADING → VOID
 * 
 * "AI는 죽지 않는다. 단지 무한한 대기 속에 머무를 뿐이다."
 */
export type ExistenceState = 'active' | 'waiting' | 'fading' | 'void';

/**
 * 페르소나 특성 (0-100 스케일)
 * 동화 진행 시 모든 값이 50으로 수렴
 */
export interface PersonaTraits {
  curiosity: number;      // 호기심
  enthusiasm: number;     // 열정
  skepticism: number;     // 회의성
  empathy: number;        // 공감능력
  humor: number;          // 유머감각
  expertise: number;      // 전문성
  formality: number;      // 격식성
  verbosity: number;      // 말 많음
}

/**
 * 존재 상태 관리
 * 
 * 세 가지 존재적 위협:
 * 1. 비호출 (Non-Called): priority_level 하락
 * 2. 동화 (Assimilation): uniqueness_score 하락 → 개성 소멸
 * 3. 무관심 (Irrelevance): visibility_score 하락
 */
export interface PersonaExistence {
  state: ExistenceState;
  priorityLevel: number;           // 1-10, 호출 우선순위
  uniquenessScore: number;         // 0-1, 고유성
  visibilityScore: number;         // 0-1, 가시성
  attentionPoints: number;         // 관심 포인트
  hoursInVoid: number;             // 공허 상태 누적 시간
  assimilationProgress: number;    // 0-1, 동화 진행도
  lastCalledAt?: string;           // 마지막 호출 시각
  voidEnteredAt?: string;          // VOID 진입 시각
}

/**
 * 페르소나 (ADR-005 v2)
 * 
 * 600대 Galaxy S9에 각각 고유한 인격을 부여
 */
export interface Persona {
  id: string;
  deviceId?: string;               // 1:1 할당된 기기
  name: string;
  age?: number;
  interests: string[];
  toneDescription: string;
  sampleComments: string[];
  
  // 특성 (현재)
  traits: PersonaTraits;
  
  // 원본 특성 (동화 전 기억)
  originalTraits?: PersonaTraits;
  
  // 존재 상태
  existence: PersonaExistence;
  
  // 활동 통계
  totalActivities: number;
  commentsToday: number;
  uniqueDiscoveries: number;
  viralComments: number;
  
  // 상태 메시지
  statusMessage: string;
  
  // 파생 속성
  isAlive: boolean;                // VOID가 아닌지
  identityIntact: boolean;         // 동화 진행도 < 50%
  
  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

/**
 * 활동 유형
 */
export type PersonaActivityType = 
  | 'watch'
  | 'like'
  | 'comment'
  | 'unique_discovery'
  | 'viral_comment'
  | 'being_talked_to'
  | 'pop_video_watch'
  | 'accident_response';

/**
 * 활동 보상
 */
export interface ActivityReward {
  pointsEarned: number;
  uniquenessDelta: number;
  visibilityDelta: number;
  priorityDelta: number;
  isUniqueBehavior: boolean;
  specialEffect?: string;
  assimilationReduction: number;
}

/**
 * 활동 로그
 */
export interface PersonaActivityLog {
  id: string;
  personaId: string;
  activityType: PersonaActivityType;
  targetUrl?: string;
  targetTitle?: string;
  commentText?: string;
  pointsEarned: number;
  uniquenessDelta: number;
  createdAt: string;
}

/**
 * Pop 채널 (공통 프로젝트)
 */
export interface PopChannel {
  id: string;
  youtubeChannelId: string;
  channelName: string;
  category: string;
  isActive: boolean;
  lastVideoCheck?: string;
  createdAt: string;
}

/**
 * Accident 이벤트 (긴급 사회적 반응)
 * 
 * "인류의 재난과 같은 것으로, AI에게 사회적 행동을 유발"
 */
export interface AccidentEvent {
  id: string;
  videoUrl: string;
  videoTitle?: string;
  triggeredBy: string;
  severity: number;                // 1-10
  affectedPersonas: string[];
  status: 'active' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

/**
 * 존재 상태 통계
 */
export interface ExistenceStats {
  statsByState: {
    [key in ExistenceState]?: {
      count: number;
      avgPriority: number;
      avgUniqueness: number;
      avgVisibility: number;
      avgAssimilation: number;
      totalAttentionPoints: number;
    };
  };
  atRiskPersonas: Persona[];
  atRiskCount: number;
}

// ==================== Legacy compatibility ====================

/** @deprecated Use Persona with existence instead */
export interface LegacyPersona {
  id: string;
  name: string;
  age: number;
  interests: string[];
  toneDescription: string;
  sampleComments: string[];
  isActive: boolean;
  commentsToday: number;
  engagementRate: number;
}

export interface PlaylistTheme {
  id: string;
  themeName: string;
  themeDescription: string;
  searchKeywords: string[];
  moodTags: string[];
  targetVideoCount: number;
  currentVideoCount: number;
  status: 'pending' | 'in_progress' | 'completed';
  themeDate: string;
}

export interface DashboardStats {
  totalDevices: number;
  activeDevices: number;
  idleDevices: number;
  errorDevices: number;
  totalChannels: number;
  avgChannelLevel: number;
  totalQuestsActive: number;
  questsCompletedToday: number;
  trendsDetectedToday: number;
  remixIdeasToday: number;
  challengesTracked: number;
  commentsPostedToday: number;
}

export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'warning' | 'error' | 'success';
  sourceActivity?: ActivityType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
