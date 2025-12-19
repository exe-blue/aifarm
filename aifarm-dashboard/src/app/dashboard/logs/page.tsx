'use client';

import { useState } from 'react';
import { 
  History, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Upload,
  Activity,
  Settings,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaskLog, TaskLogType } from '@/types';

// 로그 타입 설정
const LOG_TYPE_CONFIG: Record<TaskLogType, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  watch: {
    label: '시청 요청',
    icon: PlayCircle,
    color: 'text-cyan-400',
  },
  upload: {
    label: '업로드',
    icon: Upload,
    color: 'text-purple-400',
  },
  idle_activity: {
    label: '유휴 활동',
    icon: Activity,
    color: 'text-yellow-400',
  },
  system: {
    label: '시스템',
    icon: Settings,
    color: 'text-zinc-400',
  },
};

// 모의 데이터
const mockLogs: TaskLog[] = [
  {
    id: '1',
    type: 'watch',
    title: '시청 요청 완료',
    description: '"2024년 재테크 전략 총정리" 시청 완료',
    status: 'success',
    device_count: 100,
    success_count: 97,
    failed_count: 3,
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    completed_at: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'upload',
    title: '영상 업로드 실패',
    description: '"코딩 튜토리얼 #12" 업로드 실패',
    status: 'failed',
    started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    metadata: { error: '파일 형식이 지원되지 않습니다' },
  },
  {
    id: '3',
    type: 'idle_activity',
    title: '유휴 활동 배치 완료',
    description: 'Shorts 리믹스 활동 배치 (15분)',
    status: 'partial',
    device_count: 120,
    success_count: 112,
    failed_count: 8,
    started_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'watch',
    title: '시청 요청 완료',
    description: '"신작 게임 플레이 리뷰" 시청 완료',
    status: 'success',
    device_count: 80,
    success_count: 78,
    failed_count: 2,
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    type: 'system',
    title: '디바이스 재연결',
    description: '보드 20 디바이스 6대 재연결 완료',
    status: 'success',
    started_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    type: 'idle_activity',
    title: '유휴 활동 배치 완료',
    description: '페르소나 코멘터 활동 배치 (30분)',
    status: 'success',
    device_count: 100,
    success_count: 98,
    failed_count: 2,
    started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
  },
];

export default function LogsPage() {
  const [logs] = useState<TaskLog[]>(mockLogs);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredLogs = logs.filter(log => {
    if (selectedType !== 'all' && log.type !== selectedType) return false;
    if (selectedStatus !== 'all' && log.status !== selectedStatus) return false;
    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  const getDuration = (startedAt: string, completedAt?: string) => {
    if (!completedAt) return '-';
    const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}분`;
    return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-400" />
            작업 로그
          </h1>
          <p className="text-zinc-400 text-sm">완료된 작업 히스토리</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          className="border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 필터 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-40 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                {Object.entries(LOG_TYPE_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-40 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="success">성공</SelectItem>
                <SelectItem value="partial">부분 성공</SelectItem>
                <SelectItem value="failed">실패</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 로그 목록 */}
      <div className="space-y-3">
        {filteredLogs.map((log) => {
          const typeConfig = LOG_TYPE_CONFIG[log.type];
          const Icon = typeConfig.icon;
          
          return (
            <Card key={log.id} className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-zinc-800 ${typeConfig.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white">{log.title}</h4>
                      {log.status === 'success' && (
                        <Badge className="bg-green-500/20 text-green-400 border-0">
                          <CheckCircle className="w-3 h-3 mr-1" /> 성공
                        </Badge>
                      )}
                      {log.status === 'partial' && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                          <AlertTriangle className="w-3 h-3 mr-1" /> 부분 성공
                        </Badge>
                      )}
                      {log.status === 'failed' && (
                        <Badge className="bg-red-500/20 text-red-400 border-0">
                          <XCircle className="w-3 h-3 mr-1" /> 실패
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-zinc-400">{log.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-zinc-500">
                      <span>{getTimeAgo(log.completed_at || log.started_at)}</span>
                      <span>•</span>
                      <span>소요시간: {getDuration(log.started_at, log.completed_at)}</span>
                      {log.device_count !== undefined && (
                        <>
                          <span>•</span>
                          <span>
                            기기: {log.success_count}/{log.device_count}
                            {log.failed_count !== undefined && log.failed_count > 0 && (
                              <span className="text-red-400"> (실패 {log.failed_count})</span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {log.metadata?.error && (
                      <p className="text-xs text-red-400 mt-2">
                        오류: {String(log.metadata.error)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 빈 상태 */}
      {filteredLogs.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <History className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">로그가 없습니다</h3>
            <p className="text-sm text-zinc-500">선택한 필터에 해당하는 로그가 없습니다</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
