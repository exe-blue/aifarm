'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  RefreshCw,
  Settings2,
  ArrowRight,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ACTIVITY_CONFIG } from '@/data/constants';
import type { IdleActivity, ActivityType } from '@/types';

// 모의 데이터
const mockActivities: IdleActivity[] = [
  {
    id: 'shorts_remix',
    name: ACTIVITY_CONFIG.shorts_remix.name,
    icon: ACTIVITY_CONFIG.shorts_remix.icon,
    description: ACTIVITY_CONFIG.shorts_remix.description,
    allocated_devices: 120,
    active_devices: 98,
    is_enabled: true,
    today_tasks: 1234,
    success_rate: 94,
  },
  {
    id: 'playlist_curator',
    name: ACTIVITY_CONFIG.playlist_curator.name,
    icon: ACTIVITY_CONFIG.playlist_curator.icon,
    description: ACTIVITY_CONFIG.playlist_curator.description,
    allocated_devices: 80,
    active_devices: 72,
    is_enabled: true,
    today_tasks: 567,
    success_rate: 91,
  },
  {
    id: 'persona_commenter',
    name: ACTIVITY_CONFIG.persona_commenter.name,
    icon: ACTIVITY_CONFIG.persona_commenter.icon,
    description: ACTIVITY_CONFIG.persona_commenter.description,
    allocated_devices: 100,
    active_devices: 89,
    is_enabled: true,
    today_tasks: 2345,
    success_rate: 88,
  },
  {
    id: 'trend_scout',
    name: ACTIVITY_CONFIG.trend_scout.name,
    icon: ACTIVITY_CONFIG.trend_scout.icon,
    description: ACTIVITY_CONFIG.trend_scout.description,
    allocated_devices: 60,
    active_devices: 58,
    is_enabled: true,
    today_tasks: 890,
    success_rate: 96,
  },
  {
    id: 'challenge_hunter',
    name: ACTIVITY_CONFIG.challenge_hunter.name,
    icon: ACTIVITY_CONFIG.challenge_hunter.icon,
    description: ACTIVITY_CONFIG.challenge_hunter.description,
    allocated_devices: 40,
    active_devices: 35,
    is_enabled: true,
    today_tasks: 234,
    success_rate: 89,
  },
  {
    id: 'thumbnail_lab',
    name: ACTIVITY_CONFIG.thumbnail_lab.name,
    icon: ACTIVITY_CONFIG.thumbnail_lab.icon,
    description: ACTIVITY_CONFIG.thumbnail_lab.description,
    allocated_devices: 23,
    active_devices: 21,
    is_enabled: false,
    today_tasks: 0,
    success_rate: 92,
  },
];

export default function IdleActivitiesPage() {
  const [activities, setActivities] = useState<IdleActivity[]>(mockActivities);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalActiveDevices = activities.reduce((sum, a) => sum + (a.is_enabled ? a.active_devices : 0), 0);
  const totalTasks = activities.reduce((sum, a) => sum + a.today_tasks, 0);
  const avgSuccessRate = activities.filter(a => a.is_enabled).reduce((sum, a) => sum + a.success_rate, 0) / activities.filter(a => a.is_enabled).length || 0;
  const enabledCount = activities.filter(a => a.is_enabled).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const toggleActivity = (id: ActivityType) => {
    setActivities(prev => prev.map(a => 
      a.id === id ? { ...a, is_enabled: !a.is_enabled } : a
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-400" />
            유휴 활동
          </h1>
          <p className="text-zinc-400 text-sm">6대 상시 백그라운드 활동 모니터링</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Link href="/dashboard/idle/settings">
            <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800">
              <Settings2 className="w-4 h-4 mr-2" />
              활동 설정
            </Button>
          </Link>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">활성 활동</p>
                <p className="text-2xl font-bold text-purple-400">{enabledCount}/6</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">활동중 기기</p>
                <p className="text-2xl font-bold text-cyan-400">{totalActiveDevices}대</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">오늘 작업</p>
                <p className="text-2xl font-bold text-green-400">{totalTasks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">평균 성공률</p>
                <p className="text-2xl font-bold text-yellow-400">{avgSuccessRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 활동 목록 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">활동 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activities.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.id];
            const utilizationPercent = activity.allocated_devices > 0 
              ? (activity.active_devices / activity.allocated_devices) * 100 
              : 0;

            return (
              <div 
                key={activity.id}
                className={`p-4 rounded-lg border transition-all ${
                  activity.is_enabled 
                    ? 'bg-zinc-800/50 border-zinc-700' 
                    : 'bg-zinc-900/50 border-zinc-800 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{activity.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${config.color}`}>{activity.name}</h4>
                        <Switch 
                          checked={activity.is_enabled}
                          onCheckedChange={() => toggleActivity(activity.id)}
                        />
                      </div>
                      <p className="text-sm text-zinc-500">{activity.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-zinc-500">활동중</p>
                      <p className="text-lg font-bold text-white">
                        {activity.is_enabled ? activity.active_devices : 0}대
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-500">오늘</p>
                      <p className="text-lg font-bold text-white">
                        {activity.today_tasks.toLocaleString()}건
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-zinc-500">성공률</p>
                      <p className={`text-lg font-bold ${activity.success_rate >= 90 ? 'text-green-400' : activity.success_rate >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {activity.success_rate}%
                      </p>
                    </div>
                  </div>
                </div>
                
                {activity.is_enabled && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>기기 활용률</span>
                      <span>{activity.active_devices}/{activity.allocated_devices}대 ({utilizationPercent.toFixed(0)}%)</span>
                    </div>
                    <Progress value={utilizationPercent} className="h-1.5" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
