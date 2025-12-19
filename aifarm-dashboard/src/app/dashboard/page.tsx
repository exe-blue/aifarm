'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useStats, useActivities, useDORequests, useDeviceIssues, useNotifications } from '@/hooks/useApi';
import { 
  Smartphone, 
  AlertTriangle,
  Play,
  Wrench,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useStats();
  const { data: activitiesData, isLoading: activitiesLoading } = useActivities();
  const { data: doRequestsData, isLoading: doLoading } = useDORequests({ limit: 5 });
  const { data: issuesData, isLoading: issuesLoading } = useDeviceIssues({ resolved: false });
  const { data: notificationsData } = useNotifications(true);

  const stats = statsData?.devices || { total: 600, active: 6, idle: 0, error: 394 };
  const activities = activitiesData?.activities || [];
  const doRequests = doRequestsData?.requests || [];
  const issues = issuesData?.issues || [];
  const unreadCount = notificationsData?.notifications?.length || 0;

  const pendingRequests = doRequests.filter((r: any) => r.status === 'pending').length;
  const inProgressRequests = doRequests.filter((r: any) => r.status === 'in_progress').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-sm text-muted-foreground">AIFarm 시스템 현황</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-muted-foreground">온라인</span>
        </div>
      </div>

      {/* Device Status Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-card border"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-bold text-green-400">{stats.active}</span>
            <span className="text-muted-foreground">/ {stats.total}</span>
          </div>
          <span className="text-xs text-muted-foreground">연결됨</span>
        </div>
        <div className="text-center border-x border-border">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-2xl font-bold text-red-400">{stats.error}</span>
          </div>
          <span className="text-xs text-muted-foreground">장애</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-2xl font-bold text-yellow-400">{stats.idle}</span>
          </div>
          <span className="text-xs text-muted-foreground">대기</span>
        </div>
      </motion.div>

      {/* Main Action - Video Watch Request */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href="/dashboard/watch">
          <div className="p-6 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50 transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-cyan-500/20">
                  <Play className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    영상 시청 요청
                  </h2>
                  <p className="text-sm text-muted-foreground">YouTube 트래픽 생성</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />
                    <span>진행 중: {inProgressRequests}건</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>대기: {pendingRequests}건</span>
                  </div>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                  MAIN
                </Badge>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* 6대 Activities Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-lg bg-card border"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            6대 활동
          </h3>
          <Link href="/dashboard/activities">
            <Button variant="ghost" size="sm" className="text-xs">
              전체보기
            </Button>
          </Link>
        </div>
        
        {activitiesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {(activities.length > 0 ? activities : [
              { id: 'shorts_remix', name: 'Shorts 리믹스', icon: '🎬', active_devices: 0, allocated_devices: 0 },
              { id: 'playlist_curator', name: 'AI DJ', icon: '🎵', active_devices: 0, allocated_devices: 0 },
              { id: 'persona_commenter', name: '코멘터', icon: '💬', active_devices: 0, allocated_devices: 0 },
              { id: 'trend_scout', name: '스카우터', icon: '🕵️', active_devices: 0, allocated_devices: 0 },
              { id: 'challenge_hunter', name: '챌린지', icon: '🏅', active_devices: 0, allocated_devices: 0 },
              { id: 'thumbnail_lab', name: '썸네일', icon: '🔬', active_devices: 0, allocated_devices: 0 },
            ]).slice(0, 6).map((activity: any) => (
              <div 
                key={activity.id}
                className="text-center p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <span className="text-2xl">{activity.icon}</span>
                <div className="text-xs font-medium mt-1 truncate">{activity.name?.split(' ')[0]}</div>
                <div className="text-xs text-muted-foreground">
                  {activity.active_devices || 0}/{activity.allocated_devices || 0}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Maintenance Alert */}
      {stats.error > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/dashboard/maintenance">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="font-medium text-red-400">장치 점검 필요</span>
                    <p className="text-xs text-muted-foreground">
                      Board 1~19 미연결 (380대), Board 20 장애 (14대)
                    </p>
                  </div>
                </div>
                <Badge variant="destructive">{stats.error}대</Badge>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Connected Devices Info */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-lg bg-green-500/5 border border-green-500/20"
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <span className="font-medium text-green-400">정상 작동 디바이스</span>
            <p className="text-xs text-muted-foreground">
              Board 20: 20-1 ~ 20-6 (6대) - WiFi 연결 완료
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xs text-muted-foreground text-center pt-4 border-t"
      >
        가용 에이전트: {stats.active}대 | 최대 동시 실행: {Math.min(stats.active, 50)}대
      </motion.div>
    </div>
  );
}
