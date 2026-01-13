// apps/web/app/work/components/WorkHistoryPanel.tsx
// Work History 패널 - 완료된 영상 이력

'use client';

import { useState, useEffect } from 'react';
import { History, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  status: 'completed' | 'partial' | 'failed';
  totalDevices: number;
  successCount: number;
  failCount: number;
  completedAt: string;
}

export function WorkHistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage]);

  const fetchHistory = async (page: number) => {
    setIsLoading(true);
    try {
      // TODO: Gateway API 연동
      // const response = await fetch(`/api/v1/video/history?page=${page}&limit=10`);
      // const data = await response.json();

      // 임시 Mock 데이터
      await new Promise((r) => setTimeout(r, 500));
      setHistory([
        {
          id: '1',
          videoId: 'dQw4w9WgXcQ',
          title: 'Completed Video 1 - Full Watch Success',
          thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
          status: 'completed',
          totalDevices: 150,
          successCount: 148,
          failCount: 2,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        },
        {
          id: '2',
          videoId: 'jNQXAC9IVRw',
          title: 'Completed Video 2 - Partial Success',
          thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
          status: 'partial',
          totalDevices: 150,
          successCount: 120,
          failCount: 30,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        },
        {
          id: '3',
          videoId: '9bZkp7q19f0',
          title: 'Completed Video 3 - Failed Majority',
          thumbnail: 'https://img.youtube.com/vi/9bZkp7q19f0/mqdefault.jpg',
          status: 'failed',
          totalDevices: 150,
          successCount: 15,
          failCount: 135,
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        },
      ]);
      setTotalPages(3);
    } catch {
      console.error('Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: HistoryItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400">
            <CheckCircle className="w-3 h-3" />
            Partial
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center">
        <History className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
        <p className="text-neutral-500">No history yet</p>
        <p className="text-sm text-neutral-600 mt-1">
          Completed videos will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-[#FFCC00]" />
          Work History
        </h2>
        <span className="text-sm text-neutral-500">
          {history.length} videos completed
        </span>
      </div>

      {/* History Table */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-sm font-medium text-neutral-400">
                Video
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">
                Status
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">
                Success Rate
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400 hidden md:table-cell">
                Devices
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-neutral-400 hidden lg:table-cell">
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => {
              const successRate = item.totalDevices > 0
                ? (item.successCount / item.totalDevices) * 100
                : 0;

              return (
                <tr
                  key={item.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-16 h-10 object-cover rounded"
                      />
                      <span className="text-sm text-white truncate max-w-[200px] md:max-w-[300px]">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "font-mono text-sm",
                          successRate >= 90
                            ? "text-green-400"
                            : successRate >= 70
                            ? "text-yellow-400"
                            : "text-red-400"
                        )}
                      >
                        {successRate.toFixed(1)}%
                      </span>
                      <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div
                          className={cn(
                            "h-full",
                            successRate >= 90
                              ? "bg-green-500"
                              : successRate >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${successRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center hidden md:table-cell">
                    <div className="text-sm">
                      <span className="text-green-400">{item.successCount}</span>
                      <span className="text-neutral-600 mx-1">/</span>
                      <span className="text-red-400">{item.failCount}</span>
                      <span className="text-neutral-600 mx-1">/</span>
                      <span className="text-neutral-400">{item.totalDevices}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-neutral-500 hidden lg:table-cell">
                    {formatDate(item.completedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={cn(
              "p-2 rounded-lg border border-white/10 transition-colors",
              currentPage === 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white/10"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-neutral-400 px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={cn(
              "p-2 rounded-lg border border-white/10 transition-colors",
              currentPage === totalPages
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-white/10"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
