'use client';

import { useState } from 'react';
import { 
  Youtube, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  Users,
  Video,
  ExternalLink,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { YouTubeChannel, RecentVideo } from '@/types';

// 모의 데이터
const mockChannels: YouTubeChannel[] = [
  {
    id: '1',
    channel_id: 'UC1234567890',
    channel_name: '재테크 연구소',
    thumbnail_url: 'https://via.placeholder.com/100',
    today_views: 12345,
    today_watch_time: 2340,
    today_subscribers: 127,
    today_uploads: 2,
    total_subscribers: 125000,
    total_views: 15678000,
    total_videos: 456,
    recent_videos: [
      {
        video_id: 'v1',
        title: '2024년 재테크 전략 총정리',
        published_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        views: 1234,
        likes: 89,
        comments: 23,
      },
      {
        video_id: 'v2',
        title: '주식 vs 부동산, 어디에 투자해야 할까?',
        published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        views: 5678,
        likes: 234,
        comments: 67,
      },
    ],
  },
  {
    id: '2',
    channel_id: 'UC0987654321',
    channel_name: '게임 플레이어',
    thumbnail_url: 'https://via.placeholder.com/100',
    today_views: 8765,
    today_watch_time: 1890,
    today_subscribers: 89,
    today_uploads: 1,
    total_subscribers: 87000,
    total_views: 9876000,
    total_videos: 234,
    recent_videos: [
      {
        video_id: 'v3',
        title: '신작 오픈월드 RPG 첫 플레이',
        published_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        views: 2345,
        likes: 156,
        comments: 45,
      },
    ],
  },
  {
    id: '3',
    channel_id: 'UC1122334455',
    channel_name: '홈트 마스터',
    thumbnail_url: 'https://via.placeholder.com/100',
    today_views: 5432,
    today_watch_time: 980,
    today_subscribers: 45,
    today_uploads: 0,
    total_subscribers: 45000,
    total_views: 4567000,
    total_videos: 189,
    recent_videos: [
      {
        video_id: 'v4',
        title: '30분 전신 운동 루틴',
        published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        views: 8901,
        likes: 567,
        comments: 123,
      },
    ],
  },
  {
    id: '4',
    channel_id: 'UC5566778899',
    channel_name: '맛집 탐험대',
    thumbnail_url: 'https://via.placeholder.com/100',
    today_views: 3456,
    today_watch_time: 560,
    today_subscribers: -12,
    today_uploads: 1,
    total_subscribers: 32000,
    total_views: 2345000,
    total_videos: 156,
    recent_videos: [
      {
        video_id: 'v5',
        title: '서울 핫플 맛집 투어',
        published_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        views: 1567,
        likes: 98,
        comments: 34,
      },
    ],
  },
];

// 오늘 통계 합계 계산
const getTodayStats = (channels: YouTubeChannel[]) => ({
  totalViews: channels.reduce((sum, c) => sum + c.today_views, 0),
  totalWatchTime: channels.reduce((sum, c) => sum + c.today_watch_time, 0),
  totalSubscribers: channels.reduce((sum, c) => sum + c.today_subscribers, 0),
  totalUploads: channels.reduce((sum, c) => sum + c.today_uploads, 0),
});

export default function ChannelsPage() {
  const [channels] = useState<YouTubeChannel[]>(mockChannels);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayStats = getTodayStats(channels);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours < 1) return '방금 전';
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Youtube className="w-6 h-6 text-red-500" />
            채널 관리
          </h1>
          <p className="text-zinc-400 text-sm">YouTube 채널 통계 (YouTube API 연동)</p>
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

      {/* 오늘 요약 */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">오늘 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-zinc-400">총 조회수</span>
              </div>
              <p className="text-2xl font-bold text-white">{todayStats.totalViews.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-zinc-400">시청 시간</span>
              </div>
              <p className="text-2xl font-bold text-white">{todayStats.totalWatchTime.toLocaleString()}분</p>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-sm text-zinc-400">구독자 변화</span>
              </div>
              <p className={`text-2xl font-bold flex items-center gap-1 ${todayStats.totalSubscribers >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {todayStats.totalSubscribers >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                {todayStats.totalSubscribers >= 0 ? '+' : ''}{todayStats.totalSubscribers}
              </p>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Video className="w-4 h-4 text-red-400" />
                <span className="text-sm text-zinc-400">업로드</span>
              </div>
              <p className="text-2xl font-bold text-white">{todayStats.totalUploads}개</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 채널 목록 */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-white">채널 목록 ({channels.length}개)</h2>
        
        {channels.map((channel) => (
          <Card key={channel.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-col lg:flex-row">
                {/* 채널 정보 */}
                <div className="flex-1 p-4 lg:p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16 border-2 border-zinc-700">
                      <AvatarImage src={channel.thumbnail_url} />
                      <AvatarFallback className="bg-zinc-800 text-xl">
                        {channel.channel_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">{channel.channel_name}</h3>
                        <a 
                          href={`https://youtube.com/channel/${channel.channel_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-500 hover:text-white"
                          aria-label={`${channel.channel_name} 채널 열기 (새 탭)`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <span>구독자 {formatNumber(channel.total_subscribers)}</span>
                        <span>•</span>
                        <span>영상 {channel.total_videos}개</span>
                        <span>•</span>
                        <span>총 조회수 {formatNumber(channel.total_views)}</span>
                      </div>
                      
                      {/* 오늘 통계 */}
                      <div className="flex flex-wrap gap-4 mt-3">
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                          오늘 +{channel.today_views.toLocaleString()}뷰
                        </Badge>
                        <Badge className={`border-0 ${channel.today_subscribers >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          구독자 {channel.today_subscribers >= 0 ? '+' : ''}{channel.today_subscribers}
                        </Badge>
                        {channel.today_uploads > 0 && (
                          <Badge className="bg-red-500/20 text-red-400 border-0">
                            업로드 {channel.today_uploads}개
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 최근 영상 */}
                {channel.recent_videos && channel.recent_videos.length > 0 && (
                  <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800 p-4 bg-zinc-800/30">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">최근 영상</h4>
                    <div className="space-y-3">
                      {channel.recent_videos.slice(0, 2).map((video) => (
                        <div key={video.video_id} className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-zinc-700 rounded flex items-center justify-center shrink-0">
                            <Play className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{video.title}</p>
                            <p className="text-xs text-zinc-500">
                              {video.views.toLocaleString()}회 • {getTimeAgo(video.published_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
