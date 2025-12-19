'use client';

import { useState, useMemo } from 'react';
import { 
  Smartphone, 
  Search, 
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEVICE_STATUS_CONFIG, BOARD_CONFIG } from '@/data/constants';
import type { Device, DeviceStatus } from '@/types';

// 모의 데이터 생성
const generateMockDevices = (): Device[] => {
  const devices: Device[] = [];
  const statuses: DeviceStatus[] = ['online', 'temp_high', 'wrong_mode', 'disconnected', 'unstable'];
  
  for (let board = 1; board <= 30; board++) {
    for (let slot = 1; slot <= 20; slot++) {
      const deviceName = `${String(board).padStart(2, '0')}-${String(slot).padStart(2, '0')}`;
      
      // 보드 1-19는 대부분 disconnected
      let status: DeviceStatus;
      if (board < 20) {
        status = Math.random() > 0.1 ? 'disconnected' : 'online';
      } else {
        // 보드 20 이상
        const rand = Math.random();
        if (rand < 0.7) status = 'online';
        else if (rand < 0.75) status = 'temp_high';
        else if (rand < 0.80) status = 'wrong_mode';
        else if (rand < 0.90) status = 'disconnected';
        else status = 'unstable';
      }
      
      devices.push({
        id: (board - 1) * 20 + slot,
        device_name: deviceName,
        board_id: board,
        slot_number: slot,
        serial_number: status !== 'disconnected' ? `R3CN90${String(devices.length).padStart(5, '0')}` : undefined,
        ip_address: status !== 'disconnected' ? `10.0.${Math.ceil(board / 6)}.${(board - 1) * 20 + slot}` : undefined,
        ap_group: Math.ceil(board / 6),
        google_account: status !== 'disconnected' ? `farm${String(devices.length).padStart(3, '0')}@gmail.com` : undefined,
        status,
        temperature: status !== 'disconnected' ? 35 + Math.random() * 15 : undefined,
        connection_mode: status !== 'disconnected' ? 'wifi' : undefined,
        last_heartbeat: status !== 'disconnected' ? new Date().toISOString() : undefined,
      });
    }
  }
  
  return devices;
};

const mockDevices = generateMockDevices();

// 상태별 통계 계산
const getStatusCounts = (devices: Device[]) => {
  const counts: Record<DeviceStatus, number> = {
    online: 0,
    temp_high: 0,
    wrong_mode: 0,
    disconnected: 0,
    unstable: 0,
  };
  
  devices.forEach(device => {
    counts[device.status]++;
  });
  
  return counts;
};

const ITEMS_PER_PAGE = 20;

export default function DevicesPage() {
  const [devices] = useState<Device[]>(mockDevices);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 필터링된 디바이스
  const filteredDevices = useMemo(() => {
    return devices.filter(device => {
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = device.device_name.toLowerCase().includes(query);
        const matchesSerial = device.serial_number?.toLowerCase().includes(query);
        const matchesIP = device.ip_address?.toLowerCase().includes(query);
        const matchesAccount = device.google_account?.toLowerCase().includes(query);
        if (!matchesName && !matchesSerial && !matchesIP && !matchesAccount) return false;
      }
      
      // 보드 필터
      if (selectedBoard !== 'all' && device.board_id !== parseInt(selectedBoard)) return false;
      
      // 상태 필터
      if (selectedStatus !== 'all' && device.status !== selectedStatus) return false;
      
      return true;
    });
  }, [devices, searchQuery, selectedBoard, selectedStatus]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredDevices.length / ITEMS_PER_PAGE);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 상태 통계
  const statusCounts = getStatusCounts(devices);

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
            <Smartphone className="w-6 h-6 text-cyan-400" />
            기기 관리
          </h1>
          <p className="text-zinc-400 text-sm">600대 디바이스 상태 모니터링</p>
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
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
            <Upload className="w-4 h-4 mr-2" />
            일괄 등록
          </Button>
        </div>
      </div>

      {/* 상태 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => {
          const config = DEVICE_STATUS_CONFIG[status as DeviceStatus];
          const isSelected = selectedStatus === status;
          
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(isSelected ? 'all' : status)}
              className={`p-4 rounded-lg border transition-all ${config.bgColor} ${config.borderColor} 
                ${isSelected ? 'ring-2 ring-offset-2 ring-offset-zinc-950' : 'hover:opacity-80'}
                ${isSelected ? `ring-${config.color.replace('text-', '')}` : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{config.icon}</span>
                <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              </div>
              <div className={`text-3xl font-bold ${config.color}`}>{count}</div>
            </button>
          );
        })}
      </div>

      {/* 필터 및 검색 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="기기명, 시리얼, IP, 계정 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>
            <Select 
              value={selectedBoard} 
              onValueChange={(v) => {
                setSelectedBoard(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="보드 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 보드</SelectItem>
                {Array.from({ length: 30 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    보드 {String(i + 1).padStart(2, '0')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={selectedStatus} 
              onValueChange={(v) => {
                setSelectedStatus(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40 bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {Object.entries(DEVICE_STATUS_CONFIG).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.icon} {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 디바이스 테이블 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">기기명</TableHead>
                  <TableHead className="text-zinc-400">IP</TableHead>
                  <TableHead className="text-zinc-400">시리얼</TableHead>
                  <TableHead className="text-zinc-400">계정</TableHead>
                  <TableHead className="text-zinc-400">온도</TableHead>
                  <TableHead className="text-zinc-400">상태</TableHead>
                  <TableHead className="text-zinc-400 text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDevices.map((device) => {
                  const config = DEVICE_STATUS_CONFIG[device.status];
                  
                  return (
                    <TableRow key={device.id} className="border-zinc-800">
                      <TableCell className="font-mono font-medium text-white">
                        {device.device_name}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-400">
                        {device.ip_address || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-zinc-400 text-sm">
                        {device.serial_number || '-'}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm max-w-[150px] truncate">
                        {device.google_account || '-'}
                      </TableCell>
                      <TableCell>
                        {device.temperature ? (
                          <span className={device.temperature > 45 ? 'text-orange-400' : 'text-zinc-400'}>
                            {device.temperature.toFixed(1)}°C
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.bgColor} ${config.color} border-0`}>
                          {config.icon} {config.labelShort}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>상세 보기</DropdownMenuItem>
                            <DropdownMenuItem>재연결</DropdownMenuItem>
                            <DropdownMenuItem>화면 보기</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400">연결 해제</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <div className="text-sm text-zinc-400">
              {filteredDevices.length}개 중 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredDevices.length)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-zinc-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-zinc-400">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-zinc-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
