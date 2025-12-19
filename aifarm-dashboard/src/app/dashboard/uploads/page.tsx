'use client';

import { useState } from 'react';
import { 
  Upload, 
  RefreshCw,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Video,
  MoreHorizontal,
  Trash2,
  Edit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ScheduledUpload, UploadStatus } from '@/types';

// 업로드 상태 설정
const UPLOAD_STATUS_CONFIG: Record<UploadStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  scheduled: {
    label: '예약됨',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  uploading: {
    label: '업로드중',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  processing: {
    label: '처리중',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  published: {
    label: '게시됨',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  failed: {
    label: '실패',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
};

// 모의 데이터
const mockUploads: ScheduledUpload[] = [
  {
    id: '1',
    video_title: '주간 경제 브리핑 #45',
    channel_id: 'ch1',
    channel_name: '재테크 연구소',
    scheduled_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    video_title: '신작 게임 리뷰 - 완전판',
    channel_id: 'ch2',
    channel_name: '게임 플레이어',
    scheduled_at: new Date().toISOString(),
    status: 'uploading',
    progress: 67,
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    video_title: '홈트레이닝 시리즈 Ep.10',
    channel_id: 'ch3',
    channel_name: '홈트 마스터',
    scheduled_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'processing',
    progress: 100,
    created_at: new Date().toISOString(),
  },
  {
    id: '4',
    video_title: '서울 맛집 투어 브이로그',
    channel_id: 'ch4',
    channel_name: '맛집 탐험대',
    scheduled_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    published_url: 'https://youtube.com/watch?v=abc123',
    created_at: new Date().toISOString(),
  },
  {
    id: '5',
    video_title: '코딩 튜토리얼 #12',
    channel_id: 'ch5',
    channel_name: '개발자 스튜디오',
    scheduled_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'failed',
    error_message: '파일 형식이 지원되지 않습니다',
    created_at: new Date().toISOString(),
  },
];

export default function UploadsPage() {
  const [uploads] = useState<ScheduledUpload[]>(mockUploads);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scheduledUploads = uploads.filter(u => u.status === 'scheduled');
  const processingUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'processing');
  const completedUploads = uploads.filter(u => u.status === 'published' || u.status === 'failed');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const UploadCard = ({ upload }: { upload: ScheduledUpload }) => {
    const statusConfig = UPLOAD_STATUS_CONFIG[upload.status];

    return (
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white truncate">{upload.video_title}</h4>
                <p className="text-sm text-zinc-500">{upload.channel_name}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                    {statusConfig.label}
                  </Badge>
                  {upload.status === 'scheduled' && (
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatScheduledTime(upload.scheduled_at)}
                    </span>
                  )}
                </div>
                
                {(upload.status === 'uploading' || upload.status === 'processing') && upload.progress !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>{upload.status === 'uploading' ? '업로드 진행률' : 'YouTube 처리중'}</span>
                      <span>{upload.progress}%</span>
                    </div>
                    <Progress value={upload.progress} className="h-1.5" />
                  </div>
                )}
                
                {upload.status === 'failed' && upload.error_message && (
                  <p className="text-xs text-red-400 mt-2">{upload.error_message}</p>
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {upload.status === 'scheduled' && (
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" /> 수정
                  </DropdownMenuItem>
                )}
                {upload.status === 'published' && upload.published_url && (
                  <DropdownMenuItem>
                    <Video className="w-4 h-4 mr-2" /> YouTube에서 보기
                  </DropdownMenuItem>
                )}
                {upload.status === 'failed' && (
                  <DropdownMenuItem>
                    <RefreshCw className="w-4 h-4 mr-2" /> 재시도
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-red-400">
                  <Trash2 className="w-4 h-4 mr-2" /> 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <Upload className="w-6 h-6 text-cyan-400" />
            업로드 관리
          </h1>
          <p className="text-zinc-400 text-sm">영상 업로드 스케줄 및 상태</p>
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
            <Plus className="w-4 h-4 mr-2" />
            업로드 예약
          </Button>
        </div>
      </div>

      {/* 진행중 */}
      {processingUploads.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            진행중 ({processingUploads.length})
          </h2>
          <div className="space-y-3">
            {processingUploads.map(upload => (
              <UploadCard key={upload.id} upload={upload} />
            ))}
          </div>
        </div>
      )}

      {/* 예약됨 */}
      {scheduledUploads.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            예약됨 ({scheduledUploads.length})
          </h2>
          <div className="space-y-3">
            {scheduledUploads.map(upload => (
              <UploadCard key={upload.id} upload={upload} />
            ))}
          </div>
        </div>
      )}

      {/* 완료/실패 */}
      {completedUploads.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            완료 ({completedUploads.length})
          </h2>
          <div className="space-y-3">
            {completedUploads.map(upload => (
              <UploadCard key={upload.id} upload={upload} />
            ))}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {uploads.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-12 text-center">
            <Upload className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">예약된 업로드가 없습니다</h3>
            <p className="text-sm text-zinc-500 mb-4">새 업로드를 예약해 보세요</p>
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              업로드 예약하기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
