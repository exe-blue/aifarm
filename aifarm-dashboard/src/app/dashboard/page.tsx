'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Smartphone, 
  Youtube, 
  PlayCircle, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DEVICE_STATUS_CONFIG, BOARD_CONFIG } from '@/data/constants';
import type { DeviceStatus } from '@/types';

// 모의 데이터 (실제로는 API에서 가져옴)
const mockStats = {
  devices: {
    total: 600,
    online: 423,
    temp_high: 12,
    wrong_mode: 8,
    disconnected: 142,
    unstable: 15,
  },
  boards: {
    total: 30,
    connected: 11,
    disconnected: 19,
  },
  watchRequests: {
    pending: 3,
    inProgress: 2,
    completedToday: 15,
    totalViewsToday: 4523,
  },
  idleActivities: {
    activeCount: 5,
    totalTasksToday: 12456,
    avgSuccessRate: 91.5,
  },
  channels: {
    total: 10,
    totalViewsToday: 34567,
    totalSubscribersChange: 127,
  },
};

// 진행 중인 요청 모의 데이터
const mockActiveRequests = [
  {
    id: '1',
    videoTitle: '2024년 재테크 전략 총정리',
    keywords: ['재테크', '주식투자', '경제뉴스', '부동산', '금융'],
    progress: 67,
    targetViews: 100,
    completedViews: 67,
    likeRate: 30,
    commentRate: 10,
    startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    videoTitle: '신작 게임 플레이 리뷰',
    keywords: ['게임리뷰', '신작게임', '플레이영상', '공략', '팁'],
    progress: 28,
    targetViews: 100,
    completedViews: 28,
    likeRate: 50,
    commentRate: 20,
    startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // 디바이스 상태별 카운트 배열 생성
  const deviceStatusCounts = Object.entries(mockStats.devices)
    .filter(([key]) => key !== 'total')
    .map(([status, count]) => ({
      status: status as DeviceStatus,
      count,
      config: DEVICE_STATUS_CONFIG[status as DeviceStatus],
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">대시보드</h1>
          <p className="text-zinc-400 text-sm">AIFarm 시스템 전체 현황</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="w-fit border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 디바이스 상태 요약 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              디바이스 현황
            </CardTitle>
            <Link href="/dashboard/devices">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                전체보기 <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {deviceStatusCounts.map(({ status, count, config }) => (
              <div 
                key={status}
                className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{config.icon}</span>
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
                <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-sm text-zinc-400">
            <span>총 {mockStats.devices.total}대</span>
            <span>•</span>
            <span>보드 {mockStats.boards.connected}/{mockStats.boards.total}개 연결</span>
          </div>
        </CardContent>
      </Card>

      {/* 주요 지표 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 시청 요청 현황 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-cyan-400" />
                시청 요청
              </CardTitle>
              <Link href="/dashboard/watch">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white">
                  관리 →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">진행중</span>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                  {mockStats.watchRequests.inProgress}건
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">대기중</span>
                <span className="text-white font-medium">{mockStats.watchRequests.pending}건</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">오늘 완료</span>
                <span className="text-green-400 font-medium">{mockStats.watchRequests.completedToday}건</span>
              </div>
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">오늘 총 조회수</span>
                  <span className="text-cyan-400 font-bold text-lg">
                    {mockStats.watchRequests.totalViewsToday.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 유휴 활동 현황 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                유휴 활동
              </CardTitle>
              <Link href="/dashboard/idle">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white">
                  관리 →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">활성 활동</span>
                <Badge className="bg-purple-500/20 text-purple-400 border-0">
                  {mockStats.idleActivities.activeCount}/6
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">오늘 작업</span>
                <span className="text-white font-medium">
                  {mockStats.idleActivities.totalTasksToday.toLocaleString()}건
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">평균 성공률</span>
                <span className="text-green-400 font-medium">
                  {mockStats.idleActivities.avgSuccessRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 채널 현황 */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-400" />
                채널 현황
              </CardTitle>
              <Link href="/dashboard/channels">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white">
                  관리 →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">관리 채널</span>
                <span className="text-white font-medium">{mockStats.channels.total}개</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">오늘 조회수</span>
                <span className="text-white font-medium">
                  {mockStats.channels.totalViewsToday.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">구독자 변화</span>
                <span className="text-green-400 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +{mockStats.channels.totalSubscribersChange}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 진행 중인 시청 요청 */}
      {mockActiveRequests.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              진행중인 시청 요청
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockActiveRequests.map((request) => {
                const minutesAgo = Math.round((Date.now() - new Date(request.startedAt).getTime()) / 60000);
                
                return (
                  <div key={request.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-medium text-white">{request.videoTitle}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {request.keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-zinc-700 text-zinc-300 text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span>좋아요 {request.likeRate}%</span>
                        <span>•</span>
                        <span>댓글 {request.commentRate}%</span>
                        <span>•</span>
                        <span>{minutesAgo}분 전 시작</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">진행률</span>
                        <span className="text-cyan-400 font-medium">
                          {request.completedViews}/{request.targetViews} ({request.progress}%)
                        </span>
                      </div>
                      <Progress value={request.progress} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 시스템 알림 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            시스템 알림
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-orange-400">보드 1~19 연결 끊김</p>
                <p className="text-xs text-zinc-500">19개 보드 (380대 디바이스) 미연결 상태</p>
              </div>
              <Badge className="bg-orange-500/20 text-orange-400 border-0">19개</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-yellow-400">온도 주의 디바이스</p>
                <p className="text-xs text-zinc-500">12대 기기 온도 45°C 초과</p>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-0">12대</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-400">보드 20 정상 작동</p>
                <p className="text-xs text-zinc-500">6대 디바이스 정상 연결</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
