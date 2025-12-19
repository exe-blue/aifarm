import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ==================== Stats ====================

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    refetchInterval: 30000, // 30초마다 갱신
  });
}

// ==================== Devices ====================

export function useDevices(params?: { phoneboard_id?: number; status?: string }) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => api.getDevices(params),
    refetchInterval: 10000, // 10초마다 갱신
  });
}

export function useSendDeviceCommand() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ deviceId, command, params }: { deviceId: number; command: string; params?: any }) =>
      api.sendDeviceCommand(deviceId, command, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

// ==================== Activities ====================

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => api.getActivities(),
    refetchInterval: 30000,
  });
}

export function useStartActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (activityId: string) => api.startActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

export function useAssignDevices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ activityId, deviceIds }: { activityId: string; deviceIds: number[] }) =>
      api.assignDevicesToActivity(activityId, deviceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}

// ==================== Channels ====================

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () => api.getChannels(),
    refetchInterval: 60000, // 1분마다 갱신
  });
}

export function useChannel(channelId: string) {
  return useQuery({
    queryKey: ['channels', channelId],
    queryFn: () => api.getChannel(channelId),
    enabled: !!channelId,
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ channelId, data }: { channelId: string; data: any }) =>
      api.updateChannel(channelId, data),
    onSuccess: (_, { channelId }) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      queryClient.invalidateQueries({ queryKey: ['channels', channelId] });
    },
  });
}

// ==================== Trends & Ideas ====================

export function useTrending(limit = 20) {
  return useQuery({
    queryKey: ['trending', limit],
    queryFn: () => api.getTrending(limit),
    refetchInterval: 60000,
  });
}

export function useIdeas(status?: string) {
  return useQuery({
    queryKey: ['ideas', status],
    queryFn: () => api.getIdeas(status),
    refetchInterval: 30000,
  });
}

export function useUpdateIdeaStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ideaId, status }: { ideaId: string; status: string }) =>
      api.updateIdeaStatus(ideaId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });
}

// ==================== Challenges ====================

export function useChallenges(activeOnly = true) {
  return useQuery({
    queryKey: ['challenges', activeOnly],
    queryFn: () => api.getChallenges(activeOnly),
    refetchInterval: 60000,
  });
}

// ==================== Personas ====================

export function usePersonas() {
  return useQuery({
    queryKey: ['personas'],
    queryFn: () => api.getPersonas(),
    refetchInterval: 60000,
  });
}

// ==================== Battle Log ====================

export function useBattleLog(limit = 50) {
  return useQuery({
    queryKey: ['battle-log', limit],
    queryFn: () => api.getBattleLog(limit),
    refetchInterval: 15000, // 15초마다 갱신
  });
}

export function useCreateBattleLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      event_type: string;
      description: string;
      our_channel_id?: string;
      impact_score?: number;
    }) => api.createBattleLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battle-log'] });
    },
  });
}

// ==================== Notifications ====================

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', unreadOnly],
    queryFn: () => api.getNotifications(unreadOnly),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) => api.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ==================== Scheduler ====================

export function useRotateDevices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.rotateDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// ==================== Health Check ====================

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.healthCheck(),
    refetchInterval: 60000,
    retry: 3,
  });
}
