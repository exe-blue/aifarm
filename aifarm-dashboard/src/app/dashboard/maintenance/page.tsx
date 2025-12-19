'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Smartphone,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useDeviceIssues, useStats } from '@/hooks/useApi';

type DeviceIssue = {
  id: number;
  device_id: number;
  device_name: string;
  issue_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
};

type DeviceStatus = {
  id: number;
  name: string;
  phoneboard_id: number;
  position: number;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  ip_address?: string;
  last_seen?: string;
};

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: '낮음', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  medium: { label: '보통', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  high: { label: '높음', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  critical: { label: '심각', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

const issueTypeLabels: Record<string, string> = {
  connection_lost: '연결 끊김',
  hardware_fault: '하드웨어 오류',
  software_crash: '소프트웨어 크래시',
  low_battery: '배터리 부족',
  storage_full: '저장소 부족',
  network_error: '네트워크 오류',
  usb_disconnect: 'USB 연결 해제',
  board_offline: '보드 오프라인',
};

// 보드별 디바이스 상태 생성 (1~20번 보드, 각 20대)
function generateBoardDevices(): { [boardId: number]: DeviceStatus[] } {
  const boards: { [boardId: number]: DeviceStatus[] } = {};
  
  for (let boardId = 1; boardId <= 20; boardId++) {
    boards[boardId] = [];
    for (let pos = 1; pos <= 20; pos++) {
      const deviceName = `${boardId}-${pos}`;
      let status: 'online' | 'offline' | 'error' = 'offline';
      
      // Board 20의 1-6번만 온라인
      if (boardId === 20 && pos <= 6) {
        status = 'online';
      } else if (boardId === 20 && pos > 6) {
        status = 'error';
      }
      // Board 1-19는 모두 오프라인
      
      boards[boardId].push({
        id: (boardId - 1) * 20 + pos,
        name: deviceName,
        phoneboard_id: boardId,
        position: pos,
        status,
        last_seen: status === 'online' ? new Date().toISOString() : undefined,
      });
    }
  }
  
  return boards;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function MaintenancePage() {
  const [expandedBoards, setExpandedBoards] = useState<number[]>([20]);

  const { data: issuesData, isLoading: issuesLoading, refetch: refetchIssues, isRefetching } = useDeviceIssues({ resolved: false });
  const { data: statsData } = useStats();

  const issues: DeviceIssue[] = issuesData?.issues || [];
  const stats = statsData?.devices || { total: 600, active: 6, error: 394 };
  
  // 로컬 생성된 보드 데이터 (API가 없을 경우 폴백)
  const boardDevices = useMemo(() => generateBoardDevices(), []);

  const handleRefresh = () => {
    refetchIssues();
  };

  const toggleBoard = (boardId: number) => {
    setExpandedBoards(prev => 
      prev.includes(boardId) 
        ? prev.filter(id => id !== boardId)
        : [...prev, boardId]
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-red-400" />
            장치 점검
          </h1>
          <p className="text-muted-foreground text-sm">600대 디바이스 상태 모니터링</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Summary Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-card border"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-bold text-green-400">{stats.active}</span>
          </div>
          <span className="text-xs text-muted-foreground">정상</span>
        </div>
        <div className="text-center border-x border-border">
          <div className="flex items-center justify-center gap-2 mb-1">
            <WifiOff className="w-4 h-4 text-zinc-500" />
            <span className="text-2xl font-bold text-zinc-500">380</span>
          </div>
          <span className="text-xs text-muted-foreground">미연결 (Board 1~19)</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-2xl font-bold text-red-400">14</span>
          </div>
          <span className="text-xs text-muted-foreground">장애 (Board 20)</span>
        </div>
      </motion.div>

      {/* Critical Issues Alert */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-lg bg-red-500/10 border border-red-500/30"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-400 mb-2">점검 필요 상황</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Board 1~19</strong>: 총 380대 미연결 - USB 허브 또는 보드 연결 확인 필요</li>
              <li>• <strong>Board 20</strong>: 20-7 ~ 20-20 (14대) 장애 발생 - 개별 디바이스 점검 필요</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Connected Devices Info */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-4 rounded-lg bg-green-500/5 border border-green-500/20"
      >
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <span className="font-medium text-green-400">정상 작동 디바이스</span>
            <p className="text-xs text-muted-foreground">
              Board 20: 20-1, 20-2, 20-3, 20-4, 20-5, 20-6 (6대) - WiFi 연결 완료
            </p>
          </div>
        </div>
      </motion.div>

      {/* Board Status List */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h3 className="font-semibold flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          보드별 상태 (20개 보드 × 20대)
        </h3>

        <div className="space-y-2">
          {/* Board 20 - Active */}
          <Collapsible 
            open={expandedBoards.includes(20)} 
            onOpenChange={() => toggleBoard(20)}
          >
            <CollapsibleTrigger asChild>
              <div className="p-3 rounded-lg bg-card border border-yellow-500/30 hover:border-yellow-500/50 cursor-pointer transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedBoards.includes(20) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Wifi className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium">Board 20</span>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                      부분 연결
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-green-400">6 정상</span>
                    <span>|</span>
                    <span className="text-red-400">14 장애</span>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-4 rounded-lg bg-card/50 border">
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {boardDevices[20].map((device) => (
                    <div
                      key={device.id}
                      className={`
                        p-2 rounded text-center text-xs font-medium
                        ${device.status === 'online' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'}
                      `}
                      title={device.status === 'online' ? '정상' : '장애'}
                    >
                      {device.name}
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Boards 1-19 - Offline */}
          <Collapsible 
            open={expandedBoards.includes(1)} 
            onOpenChange={() => toggleBoard(1)}
          >
            <CollapsibleTrigger asChild>
              <div className="p-3 rounded-lg bg-card border border-zinc-700 hover:border-zinc-600 cursor-pointer transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedBoards.includes(1) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <WifiOff className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">Board 1 ~ 19</span>
                    <Badge variant="secondary" className="bg-zinc-700 text-zinc-400">
                      미연결
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>총 380대</span>
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-4 rounded-lg bg-card/50 border space-y-3">
                <p className="text-sm text-muted-foreground">
                  Board 1~19까지 총 380대의 디바이스가 연결되지 않았습니다.
                </p>
                <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
                  {Array.from({ length: 19 }, (_, i) => i + 1).map((boardId) => (
                    <div
                      key={`board-${boardId}`}
                      className="p-2 rounded text-center text-xs bg-zinc-800 text-zinc-500 border border-zinc-700"
                    >
                      Board {boardId}
                      <div className="text-[10px] mt-0.5">20대 미연결</div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </motion.div>

      {/* Recent Issues */}
      {issues.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            최근 장애 로그
          </h3>
          
          {issuesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {issues.slice(0, 10).map((issue) => {
                const severity = severityConfig[issue.severity] || severityConfig.medium;
                return (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg bg-card border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${severity.bgColor} ${severity.color} border-0 text-xs`}>
                          {severity.label}
                        </Badge>
                        <span className="font-medium">{issue.device_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(issue.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {issueTypeLabels[issue.issue_type] || issue.issue_type}: {issue.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Action Recommendations */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-lg bg-card border"
      >
        <h3 className="font-semibold mb-3">권장 조치 사항</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">1.</span>
            <span>Board 1~19 USB 허브 전원 및 케이블 연결 상태 확인</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">2.</span>
            <span>Board 20의 20-7 ~ 20-20 디바이스 개별 전원 및 WiFi 상태 확인</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">3.</span>
            <span>장애 발생 디바이스의 ADB 연결 상태 확인 (adb devices 명령)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-400">4.</span>
            <span>필요시 디바이스 재부팅 또는 공장 초기화 진행</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
}
