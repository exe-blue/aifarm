"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle, Play, AlertCircle, Loader2 } from 'lucide-react';

interface Task {
  id: string;
  video_id: string;
  video_url: string;
  status: string;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: 'var(--color-warning)', label: '대기' },
  running: { icon: Play, color: 'var(--color-info)', label: '실행 중' },
  completed: { icon: CheckCircle, color: 'var(--color-success)', label: '완료' },
  failed: { icon: AlertCircle, color: 'var(--color-error)', label: '실패' },
};

export const RecentTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('youtube_video_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) setTasks(data);
      setLoading(false);
    };

    fetchTasks();
  }, []);

  if (loading) {
    return (
      <div className="theme-surface border theme-border rounded-lg p-6">
        <h2 className="text-lg theme-text font-medium mb-4">최근 태스크</h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin theme-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="theme-surface border theme-border rounded-lg p-6">
      <h2 className="text-lg theme-text font-medium mb-4">최근 태스크</h2>

      {tasks.length === 0 ? (
        <p className="text-sm theme-text-muted text-center py-8">
          등록된 태스크가 없습니다
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const config = statusConfig[task.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-elevated)]"
              >
                <StatusIcon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: config.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm theme-text truncate">
                    {task.video_id}
                  </p>
                  <p className="text-xs theme-text-muted">
                    {new Date(task.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${config.color}20`,
                    color: config.color,
                  }}
                >
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
