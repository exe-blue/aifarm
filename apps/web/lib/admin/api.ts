// lib/admin/api.ts
// Admin Dashboard API 유틸리티

import type { WormholeEvent, TopContextItem } from './types';

// ============================================
// API Base
// ============================================

const API_BASE = '/api/admin';

// ============================================
// Wormhole APIs
// ============================================

export async function fetchRecentWormholes(limit = 20): Promise<WormholeEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/wormholes?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (error) {
    console.error('Failed to fetch wormholes:', error);
    return [];
  }
}

export async function fetchTopContexts(timeFilter?: string, limit = 10): Promise<TopContextItem[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (timeFilter) params.append('timeFilter', timeFilter);
    
    const res = await fetch(`${API_BASE}/top-contexts?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.contexts || [];
  } catch (error) {
    console.error('Failed to fetch top contexts:', error);
    return [];
  }
}

// ============================================
// Live Updates (WebSocket)
// ============================================

export function connectToLiveUpdates(
  onEvent: (event: WormholeEvent) => void,
  onError?: (error: Event) => void
): WebSocket | null {
  // MVP: WebSocket 연결은 나중에 구현
  // 현재는 null 반환
  console.log('Live updates: WebSocket connection not implemented yet');
  return null;
}

// ============================================
// KPI APIs
// ============================================

export async function fetchKPIData() {
  try {
    const res = await fetch(`${API_BASE}/kpi`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch KPI data:', error);
    return null;
  }
}

// ============================================
// Type Distribution APIs
// ============================================

export async function fetchTypeDistribution() {
  try {
    const res = await fetch(`${API_BASE}/type-distribution`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch type distribution:', error);
    return null;
  }
}

// ============================================
// Histogram APIs
// ============================================

export async function fetchHistogram() {
  try {
    const res = await fetch(`${API_BASE}/histogram`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch histogram:', error);
    return null;
  }
}

