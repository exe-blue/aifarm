// apps/web/app/work/components/VideoQueueList.tsx
// 영상 대기열 목록

'use client';

import { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueueItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  status: 'ready' | 'processing' | 'completed' | 'failed';
  targetDevices: number;
  completedDevices: number;
  createdAt: string;
}

const STATUS_CONFIG = {
  ready: {
    icon: Clock,
    label: 'Waiting',
    color: 'text-neutral-400',
    bg: 'bg-neutral-500/10',
  },
  processing: {
    icon: Play,
    label: 'In Progress',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
};

export function VideoQueueList() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      // TODO: Gateway API 연동
      // const response = await fetch('/api/v1/video/queue');
      // const data = await response.json();

      // 임시 Mock 데이터
      await new Promise((r) => setTimeout(r, 500));
      setQueue([
        {
          id: '1',
          videoId: 'dQw4w9WgXcQ',
          title: 'Sample Video 1 - Human Like Watching Test',
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
          status: 'processing',
          targetDevices: 150,
          completedDevices: 47,
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: '2',
          videoId: 'jNQXAC9IVRw',
          title: 'Sample Video 2 - Search By Title Test',
          thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
          status: 'ready',
          targetDevices: 150,
          completedDevices: 0,
          createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        },
      ]);
    } catch {
      console.error('Failed to fetch queue');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
        <p className="text-neutral-500">No videos in queue</p>
        <p className="text-sm text-neutral-600 mt-1">
          Register a video to start watching
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {queue.map((item) => {
          const config = STATUS_CONFIG[item.status];
          const StatusIcon = config.icon;
          const progress =
            item.targetDevices > 0
              ? (item.completedDevices / item.targetDevices) * 100
              : 0;

          return (
            <div
              key={item.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-24 h-14 object-cover rounded"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate text-sm">
                    {item.title}
                  </h3>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs",
                        config.bg,
                        config.color
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-500">
                        {item.completedDevices} / {item.targetDevices} devices
                      </span>
                      <span className="text-neutral-400">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          item.status === 'completed'
                            ? "bg-green-500"
                            : item.status === 'failed'
                            ? "bg-red-500"
                            : "bg-[#FFCC00]"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
