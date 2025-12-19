const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
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

  // ==================== Stats ====================
  
  async getStats() {
    return this.request<{
      devices: { total: number; active: number; idle: number; error: number };
      activities: any[];
      trends_today: number;
      ideas_today: number;
    }>('/api/stats');
  }

  // ==================== Devices ====================
  
  async getDevices(params?: { phoneboard_id?: number; status?: string }) {
    const query = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return this.request<{ devices: any[] }>(`/api/devices${query ? `?${query}` : ''}`);
  }

  async sendDeviceCommand(deviceId: number, command: string, params?: Record<string, any>) {
    return this.request<{ status: string; device_id: number; command: string }>(
      `/api/devices/${deviceId}/command`,
      {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId, command, params }),
      }
    );
  }

  async deviceHeartbeat(deviceIds: number[]) {
    return this.request<{ status: string; updated: number }>('/api/devices/heartbeat', {
      method: 'POST',
      body: JSON.stringify(deviceIds),
    });
  }

  // ==================== Activities ====================
  
  async getActivities() {
    return this.request<{ activities: any[] }>('/api/activities');
  }

  async assignDevicesToActivity(activityId: string, deviceIds: number[]) {
    return this.request<{ status: string; count: number }>(
      `/api/activities/${activityId}/assign`,
      {
        method: 'POST',
        body: JSON.stringify({ activity_id: activityId, device_ids: deviceIds }),
      }
    );
  }

  async startActivity(activityId: string) {
    return this.request<{ status: string; activity_id: string }>(
      `/api/activities/${activityId}/start`,
      { method: 'POST' }
    );
  }

  async stopActivity(activityId: string) {
    return this.request<{ status: string; activity_id: string }>(
      `/api/activities/${activityId}/stop`,
      { method: 'POST' }
    );
  }

  // ==================== Channels ====================
  
  async getChannels() {
    return this.request<{ channels: any[] }>('/api/channels');
  }

  async getChannel(channelId: string) {
    return this.request<any>(`/api/channels/${channelId}`);
  }

  async updateChannel(channelId: string, data: { stats?: Record<string, number>; experience_points?: number }) {
    return this.request<any>(`/api/channels/${channelId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== Trends & Ideas ====================
  
  async getTrending(limit = 20) {
    return this.request<{ trending: any[] }>(`/api/trending?limit=${limit}`);
  }

  async getIdeas(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ ideas: any[] }>(`/api/ideas${query}`);
  }

  async updateIdeaStatus(ideaId: string, status: string) {
    return this.request<any>(`/api/ideas/${ideaId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // ==================== Challenges ====================
  
  async getChallenges(activeOnly = true) {
    return this.request<{ challenges: any[] }>(`/api/challenges?active_only=${activeOnly}`);
  }

  // ==================== Personas ====================
  
  async getPersonas() {
    return this.request<{ personas: any[] }>('/api/personas');
  }

  // ==================== Battle Log ====================
  
  async getBattleLog(limit = 50) {
    return this.request<{ logs: any[] }>(`/api/battle-log?limit=${limit}`);
  }

  async createBattleLog(data: {
    event_type: string;
    description: string;
    our_channel_id?: string;
    impact_score?: number;
  }) {
    return this.request<any>('/api/battle-log', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== Notifications ====================
  
  async getNotifications(unreadOnly = false) {
    return this.request<{ notifications: any[] }>(`/api/notifications?unread_only=${unreadOnly}`);
  }

  async markNotificationRead(notificationId: string) {
    return this.request<{ status: string }>(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ status: string }>('/api/notifications/read-all', {
      method: 'PATCH',
    });
  }

  // ==================== Scheduler ====================
  
  async rotateDevices() {
    return this.request<{ status: string }>('/api/scheduler/rotate', {
      method: 'POST',
    });
  }

  async runScheduler() {
    return this.request<{ status: string }>('/api/scheduler/run', {
      method: 'POST',
    });
  }
}

export const api = new APIClient(API_URL);
export default api;
