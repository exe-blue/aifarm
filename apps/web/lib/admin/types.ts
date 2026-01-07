// lib/admin/types.ts
// Admin Dashboard 타입 및 유틸리티

// ============================================
// Wormhole Type
// ============================================

export type WormholeType = 'alpha' | 'beta' | 'gamma';

export const WORMHOLE_TYPE_CONFIG: Record<WormholeType, {
  label: string;
  symbol: string;
  color: string;
  description: string;
}> = {
  alpha: {
    label: 'Alpha',
    symbol: 'α',
    color: 'rgb(239, 68, 68)',
    description: '강한 동기화 - 높은 위험',
  },
  beta: {
    label: 'Beta',
    symbol: 'β',
    color: 'rgb(234, 179, 8)',
    description: '중간 동기화 - 중간 위험',
  },
  gamma: {
    label: 'Gamma',
    symbol: 'γ',
    color: 'rgb(147, 51, 234)',
    description: '약한 동기화 - 낮은 위험',
  },
};

// ============================================
// Type Distribution Types
// ============================================

export interface TypeDistributionItem {
  count: number;
  percentage: number;
}

export interface TypeDistributionData {
  alpha: TypeDistributionItem;
  beta: TypeDistributionItem;
  gamma: TypeDistributionItem;
  total: number;
}

// ============================================
// Resonance Histogram Types
// ============================================

export interface ResonanceHistogramBin {
  range: string;
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number;
}

// ============================================
// KPI Types
// ============================================

export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  unit?: string;
}

// ============================================
// Wormhole Types
// ============================================

export interface WormholeListItem {
  id: string;
  type: 'α' | 'β' | 'γ';
  score: number;
  trigger: string;
  detectedAt: Date;
  nodeCount: number;
}

export interface TopContextItem {
  context: string;
  count: number;
  avgScore: number;
  lastSeen: Date;
}

// ============================================
// Color Utilities
// ============================================

/**
 * 강도(Score)에 따른 색상 반환
 * @param score - 0~1 사이의 점수
 * @returns 색상 문자열
 */
export function getIntensityColor(score: number): string {
  if (score >= 0.8) return 'rgb(239, 68, 68)';    // red-500 (Critical)
  if (score >= 0.6) return 'rgb(249, 115, 22)';   // orange-500 (High)
  if (score >= 0.4) return 'rgb(234, 179, 8)';    // yellow-500 (Medium)
  if (score >= 0.2) return 'rgb(34, 197, 94)';    // green-500 (Low)
  return 'rgb(107, 114, 128)';                     // gray-500 (Minimal)
}

/**
 * 웜홀 타입에 따른 색상 반환
 */
export function getWormholeTypeColor(type: 'α' | 'β' | 'γ'): string {
  switch (type) {
    case 'α': return 'rgb(239, 68, 68)';   // red
    case 'β': return 'rgb(234, 179, 8)';   // yellow
    case 'γ': return 'rgb(147, 51, 234)';  // purple
    default: return 'rgb(107, 114, 128)';  // gray
  }
}

/**
 * 변화율에 따른 색상 반환
 */
export function getChangeColor(changeType: 'positive' | 'negative' | 'neutral'): string {
  switch (changeType) {
    case 'positive': return 'rgb(34, 197, 94)';   // green
    case 'negative': return 'rgb(239, 68, 68)';   // red
    default: return 'rgb(107, 114, 128)';         // gray
  }
}

// ============================================
// Time Filter Types
// ============================================

export type TimeFilter = '1h' | '24h' | '7d' | '30d' | 'all';

// ============================================
// KPI Types
// ============================================

export interface KPIMetric {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

// ============================================
// Wormhole Event Types (Admin용)
// ============================================

export interface WormholeEvent {
  id: string;
  type: WormholeType;
  level: WormholeLevel;
  score: number;
  intensity: number;  // same as score, for compatibility
  trigger: string;
  context: string;    // trigger context description
  nodeIds: string[];
  nodes: string[];    // node display names
  nodeCount: number;
  detectedAt: string;
  timestamp: string;  // alias for detectedAt
  isFalsePositive: boolean;
}

export type WormholeLevel = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

export const WORMHOLE_LEVEL_CONFIG: Record<WormholeLevel, {
  label: string;
  color: string;
  threshold: number;
}> = {
  critical: { label: 'Critical', color: 'rgb(239, 68, 68)', threshold: 0.9 },
  high: { label: 'High', color: 'rgb(249, 115, 22)', threshold: 0.7 },
  medium: { label: 'Medium', color: 'rgb(234, 179, 8)', threshold: 0.5 },
  low: { label: 'Low', color: 'rgb(34, 197, 94)', threshold: 0.3 },
  minimal: { label: 'Minimal', color: 'rgb(107, 114, 128)', threshold: 0 },
};

// ============================================
// Utility Functions
// ============================================

export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ============================================
// Top Context Types
// ============================================

export interface TopContextItem {
  id?: string;
  context: string;
  title?: string;
  contentType?: string;
  rank?: number;
  type?: WormholeType;
  count: number;
  avgScore: number;
  avgIntensity?: number;
  lastSeen: string;
}

// Alias for compatibility
export type TopContext = TopContextItem;

