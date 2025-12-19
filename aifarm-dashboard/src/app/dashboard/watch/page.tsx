'use client';

import { useState } from 'react';
import { 
  PlayCircle, 
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Trash2,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WATCH_REQUEST_STATUS_CONFIG, PRIORITY_CONFIG } from '@/data/constants';
import type { WatchRequest, WatchRequestStatus } from '@/types';

// 모의 데이터
const mockRequests: WatchRequest[] = [
  {
    id: '1',
    video_title: '2024년 재테크 전략 총정리 - 주식, 부동산, 코인까지',
    keywords: ['재테크', '주식투자', '경제뉴스', '부동산', '금융'],
    target_views: 100,
    completed_views: 67,
    failed_views: 3,
    like_rate: 30,
    comment_rate: 10,
    status: 'in_progress',
    priority: 1,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    video_title: '신작 게임 플레이 리뷰 - 최신 오픈월드 RPG',
    keywords: ['게임리뷰', '신작게임', '플레이영상', '공략', '팁'],
    target_views: 100,
    completed_views: 28,
    failed_views: 2,
    like_rate: 50,
    comment_rate: 20,
    status: 'in_progress',
    priority: 2,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    video_title: '홈트레이닝 30분 전신 운동 루틴',
    keywords: ['홈트', '운동', '다이어트', '피트니스', '헬스'],
    target_views: 50,
    completed_views: 0,
    failed_views: 0,
    like_rate: 40,
    comment_rate: 15,
    status: 'pending',
    priority: 3,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    video_title: '맛집 브이로그 - 서울 핫플레이스 투어',
    keywords: ['맛집', '브이로그', '서울', '카페', '데이트'],
    target_views: 80,
    completed_views: 80,
    failed_views: 5,
    like_rate: 35,
    comment_rate: 10,
    status: 'completed',
    priority: 2,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

export default function WatchRequestsPage() {
  const [requests, setRequests] = useState<WatchRequest[]>(mockRequests);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const inProgressRequests = requests.filter(r => r.status === 'in_progress');
  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'scheduled');
  const completedRequests = requests.filter(r => r.status === 'completed' || r.status === 'failed');

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

  const RequestCard = ({ request }: { request: WatchRequest }) => {
    const statusConfig = WATCH_REQUEST_STATUS_CONFIG[request.status];
    const priorityConfig = PRIORITY_CONFIG[request.priority];
    const progress = request.target_views > 0 
      ? Math.round((request.completed_views / request.target_views) * 100) 
      : 0;

    return (
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`${priorityConfig.bgColor} ${priorityConfig.color} border-0 text-xs`}>
                  {priorityConfig.label}
                </Badge>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0 text-xs`}>
                  {statusConfig.label}
                </Badge>
              </div>
              <h4 className="font-medium text-white line-clamp-1">{request.video_title}</h4>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {request.keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-zinc-700 text-zinc-300 text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {request.status === 'in_progress' && (
                  <DropdownMenuItem>
                    <Pause className="w-4 h-4 mr-2" /> 일시정지
                  </DropdownMenuItem>
                )}
                {(request.status === 'pending' || request.status === 'scheduled') && (
                  <DropdownMenuItem>
                    <Play className="w-4 h-4 mr-2" /> 지금 시작
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" /> 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {request.status === 'in_progress' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">진행률</span>
                <span className="text-cyan-400 font-medium">
                  {request.completed_views}/{request.target_views} ({progress}%)
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
            <span>좋아요 {request.like_rate}%</span>
            <span>•</span>
            <span>댓글 {request.comment_rate}%</span>
            <span>•</span>
            <span>
              {request.status === 'in_progress' && request.started_at && `시작: ${getTimeAgo(request.started_at)}`}
              {request.status === 'pending' && `생성: ${getTimeAgo(request.created_at)}`}
              {request.status === 'scheduled' && request.scheduled_at && `예약: ${new Date(request.scheduled_at).toLocaleString('ko-KR')}`}
              {request.status === 'completed' && request.completed_at && `완료: ${getTimeAgo(request.completed_at)}`}
            </span>
            {request.failed_views > 0 && (
              <>
                <span>•</span>
                <span className="text-red-400">실패 {request.failed_views}건</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-cyan-400" />
            시청 요청
          </h1>
          <p className="text-zinc-400 text-sm">영상 시청 요청 등록 및 관리</p>
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                새 요청
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>새 시청 요청</DialogTitle>
                <DialogDescription>
                  시청할 영상 정보와 키워드를 입력하세요
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>영상 제목 *</Label>
                  <Input placeholder="영상 제목을 입력하세요" />
                </div>
                <div className="space-y-2">
                  <Label>키워드 (쉼표로 구분, 최대 5개)</Label>
                  <Input placeholder="예: 재테크, 주식투자, 경제뉴스" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>목표 조회수</Label>
                    <Input type="number" defaultValue={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>우선순위</Label>
                    <select className="w-full h-10 px-3 rounded-md border border-zinc-700 bg-zinc-800 text-white">
                      <option value="1">P1 긴급</option>
                      <option value="2" selected>P2 일반</option>
                      <option value="3">P3 낮음</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>좋아요 확률 (%)</Label>
                    <Input type="number" defaultValue={30} min={0} max={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>댓글 확률 (%)</Label>
                    <Input type="number" defaultValue={10} min={0} max={100} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>메모 (선택)</Label>
                  <Textarea placeholder="추가 메모" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  취소
                </Button>
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  요청 생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 진행중 요청 */}
      {inProgressRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            진행중 ({inProgressRequests.length})
          </h2>
          <div className="space-y-3">
            {inProgressRequests.map(request => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* 대기중 요청 */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-400" />
            대기중 ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map(request => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* 완료된 요청 */}
      {completedRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            완료됨 ({completedRequests.length})
          </h2>
          <div className="space-y-3">
            {completedRequests.map(request => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {requests.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <PlayCircle className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">시청 요청이 없습니다</h3>
            <p className="text-sm text-zinc-500 mb-4">새 요청을 등록해 보세요</p>
            <Button 
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              새 요청 만들기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
