// apps/web/app/work/components/WorkHistoryPanel.tsx
// Work History 패널 - 완료된 영상 이력

'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkHistory, retryVideo } from '../actions';

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
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const result = await getWorkHistory({ page, limit: 10 });

      if (result.success && result.data) {
        setHistory(result.data.items);
        setTotalPages(result.data.totalPages);
        setCurrentPage(result.data.currentPage);
      } else {
        console.error('Failed to fetch history:', result.error);
        setHistory([]);
      }
    } catch {
      console.error('Failed to fetch history');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, fetchHistory]);

  const handleRetry = async (itemId: string) => {
    setRetryingId(itemId);
    try {
      const result = await retryVideo(itemId);
      if (result.success) {
        // 히스토리에서 해당 항목 제거 (대기열로 이동됨)
        setHistory((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        console.error('Failed to retry:', result.error);
      }
    } catch {
      console.error('Failed to retry video');
    } finally {
      setRetryingId(null);
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
              <th className="text-center px-4 py-3 text-sm font-medium text-neutral-400">
                Action
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
                  <td className="px-4 py-4 text-center">
                    {item.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(item.id)}
                        disabled={retryingId === item.id}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 rounded text-xs",
                          "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
                          "hover:bg-yellow-500/20 transition-colors",
                          "disabled:opacity-50"
                        )}
                      >
                        {retryingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Retry
                      </button>
                    )}
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
