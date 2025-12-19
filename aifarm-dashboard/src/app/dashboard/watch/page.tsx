'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Play,
  Plus,
  Clock,
  CheckCircle,
  Pause,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
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
import { useDORequests, useCreateDORequest, useUpdateDORequest, useCancelDORequest, useStats } from '@/hooks/useApi';

type DORequest = {
  id: string;
  title: string;
  keyword: string;
  video_title?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  priority: number;
  agent_start?: number;
  agent_end?: number;
  like_probability?: number;
  comment_probability?: number;
  subscribe_probability?: number;
  watch_time_min?: number;
  watch_time_max?: number;
  ai_comment_enabled?: boolean;
  memo?: string;
  progress?: number;
  completed_count?: number;
  failed_count?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기', color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' },
  in_progress: { label: '진행중', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  completed: { label: '완료', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  cancelled: { label: '취소', color: 'text-zinc-500', bgColor: 'bg-zinc-500/20' },
  failed: { label: '실패', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

const priorityConfig: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: 'P1 긴급', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  2: { label: 'P2 일반', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  3: { label: 'P3 낮음', color: 'text-zinc-400', bgColor: 'bg-zinc-500/20' },
};

function getTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

interface RequestCardProps {
  readonly request: DORequest;
  readonly onPause: (id: string) => void;
  readonly onStart: (id: string) => void;
  readonly onCancel: (id: string) => void;
}

function RequestCard({ request, onPause, onStart, onCancel }: RequestCardProps) {
  const status = statusConfig[request.status] || statusConfig.pending;
  const priority = priorityConfig[request.priority] || priorityConfig[2];
  const progress = request.progress || 0;
  const keywords = request.keyword.split(',');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-card border hover:border-primary/30 transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${priority.bgColor} ${priority.color} border-0 text-xs`}>
              {priority.label}
            </Badge>
            <Badge className={`${status.bgColor} ${status.color} border-0 text-xs`}>
              {status.label}
            </Badge>
          </div>
          <h4 className="font-medium truncate">{request.title}</h4>
          {request.video_title && (
            <p className="text-sm text-muted-foreground truncate mt-1">
              {request.video_title}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {keywords.map((kw) => (
              <Badge key={`${request.id}-${kw.trim()}`} variant="secondary" className="text-xs">
                {kw.trim()}
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
              <DropdownMenuItem onClick={() => onPause(request.id)}>
                <Pause className="w-4 h-4 mr-2" /> 일시정지
              </DropdownMenuItem>
            )}
            {request.status === 'pending' && (
              <DropdownMenuItem onClick={() => onStart(request.id)}>
                <Play className="w-4 h-4 mr-2" /> 지금 시작
              </DropdownMenuItem>
            )}
            {(request.status === 'pending' || request.status === 'in_progress') && (
              <DropdownMenuItem 
                className="text-red-400"
                onClick={() => onCancel(request.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> 취소
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {request.status === 'in_progress' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">진행률</span>
            <span className="text-cyan-400 font-medium">
              {request.completed_count || 0} 완료 ({progress}%)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span>좋아요 {request.like_probability || 0}%</span>
        <span>•</span>
        <span>댓글 {request.comment_probability || 0}%</span>
        <span>•</span>
        <span>
          {request.status === 'in_progress' && request.started_at && `시작: ${getTimeAgo(request.started_at)}`}
          {request.status === 'pending' && `생성: ${getTimeAgo(request.created_at)}`}
          {request.status === 'completed' && request.completed_at && `완료: ${getTimeAgo(request.completed_at)}`}
          {request.status === 'cancelled' && '취소됨'}
          {request.status === 'failed' && '실패'}
        </span>
        {(request.failed_count || 0) > 0 && (
          <>
            <span>•</span>
            <span className="text-red-400">실패 {request.failed_count}건</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function WatchRequestsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    keyword: '',
    video_title: '',
    priority: 2,
    like_probability: 30,
    comment_probability: 10,
    subscribe_probability: 5,
    watch_time_min: 60,
    watch_time_max: 300,
    ai_comment_enabled: true,
    memo: '',
  });

  const { data: requestsData, isLoading, isError, refetch, isRefetching } = useDORequests();
  const { data: statsData } = useStats();
  const createMutation = useCreateDORequest();
  const updateMutation = useUpdateDORequest();
  const cancelMutation = useCancelDORequest();

  const requests: DORequest[] = requestsData?.requests || [];
  const stats = statsData?.devices || { active: 6 };

  const inProgressRequests = requests.filter(r => r.status === 'in_progress');
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const completedRequests = requests.filter(r => r.status === 'completed' || r.status === 'failed' || r.status === 'cancelled');

  const handleRefresh = () => {
    refetch();
  };

  const handleCreateRequest = async () => {
    if (!formData.title || !formData.keyword) return;
    
    try {
      await createMutation.mutateAsync({
        ...formData,
        agent_start: 1,
        agent_end: stats.active,
        execute_immediately: true,
      });
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        keyword: '',
        video_title: '',
        priority: 2,
        like_probability: 30,
        comment_probability: 10,
        subscribe_probability: 5,
        watch_time_min: 60,
        watch_time_max: 300,
        ai_comment_enabled: true,
        memo: '',
      });
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelMutation.mutateAsync(requestId);
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleStartRequest = async (requestId: string) => {
    try {
      await updateMutation.mutateAsync({ requestId, status: 'in_progress' });
    } catch (error) {
      console.error('Failed to start request:', error);
    }
  };

  const handlePauseRequest = async (requestId: string) => {
    try {
      await updateMutation.mutateAsync({ requestId, status: 'pending' });
    } catch (error) {
      console.error('Failed to pause request:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Play className="w-6 h-6 text-cyan-400" />
            영상 시청 요청
          </h1>
          <p className="text-muted-foreground text-sm">YouTube 영상 시청 요청 등록 및 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
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
                  <Label>요청 제목 *</Label>
                  <Input 
                    placeholder="예: 신규 뮤직비디오 홍보" 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>검색 키워드 * (쉼표로 구분)</Label>
                  <Input 
                    placeholder="예: 케이팝, 신곡, 2024" 
                    value={formData.keyword}
                    onChange={(e) => setFormData(prev => ({ ...prev, keyword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>영상 제목 (선택)</Label>
                  <Input 
                    placeholder="특정 영상 제목" 
                    value={formData.video_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority-select">우선순위</Label>
                    <select 
                      id="priority-select"
                      aria-label="우선순위 선택"
                      className="w-full h-10 px-3 rounded-md border bg-background"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: Number(e.target.value) }))}
                    >
                      <option value={1}>P1 긴급</option>
                      <option value={2}>P2 일반</option>
                      <option value={3}>P3 낮음</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>가용 디바이스</Label>
                    <div className="h-10 px-3 rounded-md border bg-muted flex items-center text-muted-foreground">
                      {stats.active}대
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>좋아요 (%)</Label>
                    <Input 
                      type="number" 
                      value={formData.like_probability}
                      onChange={(e) => setFormData(prev => ({ ...prev, like_probability: Number(e.target.value) }))}
                      min={0} 
                      max={100} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>댓글 (%)</Label>
                    <Input 
                      type="number" 
                      value={formData.comment_probability}
                      onChange={(e) => setFormData(prev => ({ ...prev, comment_probability: Number(e.target.value) }))}
                      min={0} 
                      max={100} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>구독 (%)</Label>
                    <Input 
                      type="number" 
                      value={formData.subscribe_probability}
                      onChange={(e) => setFormData(prev => ({ ...prev, subscribe_probability: Number(e.target.value) }))}
                      min={0} 
                      max={100} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>최소 시청 (초)</Label>
                    <Input 
                      type="number" 
                      value={formData.watch_time_min}
                      onChange={(e) => setFormData(prev => ({ ...prev, watch_time_min: Number(e.target.value) }))}
                      min={10} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>최대 시청 (초)</Label>
                    <Input 
                      type="number" 
                      value={formData.watch_time_max}
                      onChange={(e) => setFormData(prev => ({ ...prev, watch_time_max: Number(e.target.value) }))}
                      min={10} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>메모 (선택)</Label>
                  <Textarea 
                    placeholder="추가 메모" 
                    value={formData.memo}
                    onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  취소
                </Button>
                <Button 
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={handleCreateRequest}
                  disabled={createMutation.isPending || !formData.title || !formData.keyword}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  요청 생성
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-card border"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            <span className="text-2xl font-bold text-yellow-400">{inProgressRequests.length}</span>
          </div>
          <span className="text-xs text-muted-foreground">진행중</span>
        </div>
        <div className="text-center border-x border-border">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-2xl font-bold">{pendingRequests.length}</span>
          </div>
          <span className="text-xs text-muted-foreground">대기중</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-2xl font-bold text-green-400">{completedRequests.length}</span>
          </div>
          <span className="text-xs text-muted-foreground">완료</span>
        </div>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />
          <p className="text-red-400">데이터를 불러오는 데 실패했습니다</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
            다시 시도
          </Button>
        </div>
      )}

      {/* 진행중 요청 */}
      {!isLoading && !isError && inProgressRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            진행중 ({inProgressRequests.length})
          </h2>
          <div className="space-y-3">
            {inProgressRequests.map(request => (
              <RequestCard 
                key={request.id} 
                request={request} 
                onPause={handlePauseRequest}
                onStart={handleStartRequest}
                onCancel={handleCancelRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* 대기중 요청 */}
      {!isLoading && !isError && pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            대기중 ({pendingRequests.length})
          </h2>
          <div className="space-y-3">
            {pendingRequests.map(request => (
              <RequestCard 
                key={request.id} 
                request={request}
                onPause={handlePauseRequest}
                onStart={handleStartRequest}
                onCancel={handleCancelRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* 완료된 요청 */}
      {!isLoading && !isError && completedRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            완료됨 ({completedRequests.length})
          </h2>
          <div className="space-y-3">
            {completedRequests.slice(0, 5).map(request => (
              <RequestCard 
                key={request.id} 
                request={request}
                onPause={handlePauseRequest}
                onStart={handleStartRequest}
                onCancel={handleCancelRequest}
              />
            ))}
            {completedRequests.length > 5 && (
              <Button variant="ghost" className="w-full text-muted-foreground">
                더 보기 <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!isLoading && !isError && requests.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-12 rounded-lg bg-card border text-center"
        >
          <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">시청 요청이 없습니다</h3>
          <p className="text-sm text-muted-foreground mb-4">새 요청을 등록해 보세요</p>
          <Button 
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            새 요청 만들기
          </Button>
        </motion.div>
      )}
    </div>
  );
}
