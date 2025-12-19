/**
 * AIFarm API Client
 * 백엔드 API와 통신하는 클라이언트
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface APIError {
  status: number;
  message: string;
  detail?: string;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error: APIError = {
          status: response.status,
          message: `API Error: ${response.status}`,
        };
        
        try {
          const data = await response.json();
          error.detail = data.detail || data.message;
        } catch {
          // JSON 파싱 실패 시 무시
        }
        
        throw error;
      }

      // 204 No Content 또는 빈 응답 처리
      const contentLength = response.headers.get('content-length');
      if (response.status === 204 || contentLength === '0') {
        return null as T;
      }

      return response.json();
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }      
      // 네트워크 에러
      throw {
        status: 0,
        message: 'Network Error',
        detail: 'Unable to connect to server',
      } as APIError;
    }
  }

  // ==================== Health Check ====================
  
  async healthCheck() {
    return this.request<{
      status: string;
      database: string;
      device_count: number;
      timestamp: string;
    }>('/health');
  }

  // ==================== Dashboard Stats ====================
  
  async getStats() {
    return this.request<{
      devices: {
        total: number;
        active: number;
        idle: number;
        error: number;
      };
      activities: Array<{
        id: string;
        name: string;
        active_devices: number;
        allocated_devices: number;
      }>;
      trends_today: number;
      ideas_today: number;
      total_channels: number;
      avg_channel_level: number;
    }>('/api/stats');
  }

  // ==================== Devices ====================
  
  async getDevices(params?: { phoneboard_id?: number; status?: string; limit?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    
    return this.request<{
      devices: Array<{
        id: number;
        device_id: string;
        phoneboard_id: number;
        slot_number: number;
        status: string;
        current_activity?: string;
        last_heartbeat?: string;
        ip_address?: string;
      }>;
    }>(`/api/devices${query ? `?${query}` : ''}`);
  }

  async sendDeviceCommand(deviceId: number, command: string, params?: Record<string, unknown>) {
    return this.request(`/api/devices/${deviceId}/command`, {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, command, params }),
    });
  }

  async deviceHeartbeat(deviceIds: number[]) {
    return this.request('/api/devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify(deviceIds),
    });
  }

  // ==================== Activities ====================
  
  async getActivities() {
    return this.request<{
      activities: Array<{
        id: string;
        name: string;
        description?: string;
        icon?: string;
        color?: string;
        allocated_devices: number;
        active_devices: number;
        items_processed_today?: number;
        success_rate?: number;
        is_active: boolean;
      }>;
    }>('/api/activities');
  }

  async assignDevicesToActivity(activityId: string, deviceIds: number[]) {
    return this.request(`/api/activities/${activityId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ activity_id: activityId, device_ids: deviceIds }),
    });
  }

  async startActivity(activityId: string) {
    return this.request(`/api/activities/${activityId}/start`, {
      method: 'POST',
    });
  }

  // ==================== Channels ====================
  
  async getChannels() {
    return this.request<{
      channels: Array<{
        id: string;
        youtube_channel_id?: string;
        name: string;
        category?: string;
        level: number;
        experience_points: number;
        subscriber_count: number;
        total_views: number;
        stats?: Record<string, number>;
        weekly_growth?: number;
        category_rank?: number;
        global_rank?: number;
      }>;
    }>('/api/channels');
  }

  async getChannel(channelId: string) {
    return this.request(`/api/channels/${channelId}`);
  }

  async updateChannel(channelId: string, data: { stats?: Record<string, number>; experience_points?: number }) {
    return this.request(`/api/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify({ channel_id: channelId, ...data }),
    });
  }

  // ==================== Trends ====================
  
  async getTrending(limit = 20) {
    return this.request<{
      trending: Array<{
        id: string;
        youtube_video_id?: string;
        title?: string;
        channel_name?: string;
        view_count: number;
        viral_score: number;
        hashtags?: string[];
        detected_at: string;
      }>;
    }>(`/api/trending?limit=${limit}`);
  }

  async getIdeas(status?: string) {
    return this.request<{
      ideas: Array<{
        id: string;
        title?: string;
        concept_description?: string;
        status: string;
        estimated_viral_probability: number;
        created_at: string;
      }>;
    }>(`/api/ideas${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  }

  /**
   * 아이디어 상태 업데이트
   * FastAPI 백엔드가 status를 query parameter로 기대하므로 URL에 포함
   * (updateDORequest와 동일한 패턴)
   */
  async updateIdeaStatus(ideaId: string, status: string) {
    return this.request(`/api/ideas/${ideaId}?status=${encodeURIComponent(status)}`, {
      method: 'PATCH',
    });
  }

  // ==================== DO Requests ====================
  
  async getDORequests(params?: { status?: string; limit?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    
    return this.request<{
      requests: Array<{
        id: string;
        type: string;
        title: string;
        keyword: string;
        status: string;
        priority: number;
        total_agents: number;
        completed_agents: number;
        failed_agents: number;
        created_at: string;
      }>;
    }>(`/api/do-requests${query ? `?${query}` : ''}`);
  }

  async createDORequest(data: {
    title: string;
    keyword: string;
    video_title?: string;
    agent_start?: number;
    agent_end?: number;
    like_probability?: number;
    comment_probability?: number;
    subscribe_probability?: number;
    execute_immediately?: boolean;
    priority?: number;
    memo?: string;
  }) {
    return this.request('/api/do-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDORequest(requestId: string, status?: string) {
    // undefined 매개변수가 URL에 포함되지 않도록 처리
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/api/do-requests/${requestId}${query}`, {
      method: 'PATCH',
    });
  }

  // ==================== Battle Log ====================
  
  async getBattleLog(limit = 50) {
    return this.request<{
      logs: Array<{
        id: string;
        event_type: string;
        description: string;
        our_channel_name?: string;
        impact_score: number;
        created_at: string;
      }>;
    }>(`/api/battle-log?limit=${limit}`);
  }

  async createBattleLog(data: {
    event_type: string;
    description: string;
    our_channel_id?: string;
    our_channel_name?: string;
    impact_score?: number;
  }) {
    return this.request('/api/battle-log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== Notifications ====================
  
  async getNotifications(unreadOnly = false) {
    return this.request<{
      notifications: Array<{
        id: string;
        type: string;
        title?: string;
        message?: string;
        is_read: boolean;
        created_at: string;
      }>;
    }>(`/api/notifications?unread_only=${unreadOnly}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  // ==================== Unified Logs ====================
  
  async getUnifiedLogs(params?: { source?: string; limit?: number }) {
    const query = params ? new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    
    return this.request<{
      logs: Array<{
        id: string;
        source: 'DO' | 'BE';
        source_id: string;
        device_id?: number;
        activity_type: string;
        description: string;
        status: string;
        timestamp: string;
        metadata?: Record<string, unknown>;
      }>;
    }>(`/api/unified-logs${query ? `?${query}` : ''}`);
  }

  // ==================== Scheduler ====================
  
  async rotateDevices() {
    return this.request('/api/scheduler/rotate', {
      method: 'POST',
    });
  }
}

// 싱글톤 인스턴스
export const api = new APIClient(API_URL);

// API URL 확인용
export const getApiUrl = () => API_URL;
