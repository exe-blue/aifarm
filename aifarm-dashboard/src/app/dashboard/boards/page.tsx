'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutGrid, 
  RefreshCw,
  Wifi,
  WifiOff,
  Thermometer,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DEVICE_STATUS_CONFIG, BOARD_CONFIG } from '@/data/constants';
import type { PhoneBoard, DeviceStatus } from '@/types';

// 모의 데이터 생성
const generateMockBoards = (): PhoneBoard[] => {
  const boards: PhoneBoard[] = [];
  
  for (let i = 1; i <= 30; i++) {
    // 보드 1-19는 미연결, 20 이상은 연결됨
    const isConnected = i >= 20;
    
    boards.push({
      id: i,
      name: `보드 ${String(i).padStart(2, '0')}`,
      is_connected: isConnected,
      total_slots: 20,
      online_devices: isConnected ? Math.floor(Math.random() * 15) + 5 : 0,
      offline_devices: isConnected ? Math.floor(Math.random() * 5) : 20,
      error_devices: isConnected ? Math.floor(Math.random() * 3) : 0,
      last_seen: isConnected ? new Date().toISOString() : undefined,
    });
  }
  
  return boards;
};

const mockBoards = generateMockBoards();

export default function BoardsPage() {
  const [boards] = useState<PhoneBoard[]>(mockBoards);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const connectedBoards = boards.filter(b => b.is_connected);
  const disconnectedBoards = boards.filter(b => !b.is_connected);
  
  const totalOnline = boards.reduce((sum, b) => sum + b.online_devices, 0);
  const totalOffline = boards.reduce((sum, b) => sum + b.offline_devices, 0);
  const totalError = boards.reduce((sum, b) => sum + b.error_devices, 0);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-cyan-400" />
            보드 현황
          </h1>
          <p className="text-zinc-400 text-sm">30개 보드 연결 상태</p>
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

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Wifi className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">연결됨</p>
                <p className="text-2xl font-bold text-green-400">{connectedBoards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <WifiOff className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">미연결</p>
                <p className="text-2xl font-bold text-red-400">{disconnectedBoards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <LayoutGrid className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">정상 기기</p>
                <p className="text-2xl font-bold text-cyan-400">{totalOnline}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">오류 기기</p>
                <p className="text-2xl font-bold text-orange-400">{totalError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 보드 그리드 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">전체 보드 ({boards.length}개)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {boards.map((board) => {
              const onlinePercent = (board.online_devices / board.total_slots) * 100;
              
              return (
                <Link 
                  key={board.id} 
                  href={`/dashboard/devices?board=${board.id}`}
                  className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                    board.is_connected 
                      ? 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600' 
                      : 'bg-zinc-900/50 border-zinc-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">{board.name}</span>
                    {board.is_connected ? (
                      <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                        연결
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">
                        미연결
                      </Badge>
                    )}
                  </div>
                  
                  {board.is_connected ? (
                    <>
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">정상</span>
                          <span className="text-green-400">{board.online_devices}</span>
                        </div>
                        <Progress value={onlinePercent} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>오프라인: {board.offline_devices}</span>
                        {board.error_devices > 0 && (
                          <span className="text-orange-400">오류: {board.error_devices}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <WifiOff className="w-6 h-6 mx-auto text-zinc-600 mb-1" />
                      <span className="text-xs text-zinc-500">연결 없음</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 미연결 보드 알림 */}
      {disconnectedBoards.length > 0 && (
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-400 mb-1">
                  {disconnectedBoards.length}개 보드 미연결
                </h4>
                <p className="text-sm text-zinc-400">
                  보드 {disconnectedBoards.map(b => b.id).join(', ')}번이 연결되지 않았습니다.
                  총 {disconnectedBoards.length * 20}대 디바이스에 접근할 수 없습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
