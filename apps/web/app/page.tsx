'use client';

import { useState } from 'react';

interface ActionResult {
  success: boolean;
  data?: {
    action: string;
    videoId?: string;
    channelId?: string;
    message: string;
    error?: string;
    duration?: number;
  };
  totalDuration?: number;
  error?: string;
}

export default function Home() {
  const [videoId, setVideoId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [comment, setComment] = useState('');
  const [action, setAction] = useState<'like' | 'comment' | 'subscribe' | 'watch'>('like');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('');

  // API 상태 확인
  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api/kernel/youtube');
      const data = await response.json();
      setApiStatus(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiStatus(`Error: ${error}`);
    }
  };

  // 액션 실행
  const executeAction = async () => {
    setLoading(true);
    setResult(null);

    try {
      const body: Record<string, unknown> = { action };
      
      if (action === 'like' || action === 'comment' || action === 'watch') {
        body.videoId = videoId;
      }
      
      if (action === 'subscribe') {
        body.channelId = channelId;
      }
      
      if (action === 'comment') {
        body.comment = comment;
      }

      const response = await fetch('/api/kernel/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🤖 Kernel YouTube Automation PoC
        </h1>

        {/* API 상태 확인 */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">API Status</h2>
          <button
            onClick={checkApiStatus}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded mb-4"
          >
            Check API Status
          </button>
          {apiStatus && (
            <pre className="mt-4 p-4 bg-gray-900 rounded text-sm overflow-x-auto">
              {apiStatus}
            </pre>
          )}
        </div>

        {/* 액션 선택 */}
        <div className="mb-8 p-4 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">YouTube Action</h2>
          
          <div className="mb-4">
            <label className="block mb-2">Action Type</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
              className="w-full p-2 bg-gray-700 rounded"
            >
              <option value="like">👍 Like</option>
              <option value="comment">💬 Comment</option>
              <option value="subscribe">🔔 Subscribe</option>
              <option value="watch">👀 Watch</option>
            </select>
          </div>

          {/* Video ID (for like, comment, watch) */}
          {(action === 'like' || action === 'comment' || action === 'watch') && (
            <div className="mb-4">
              <label className="block mb-2">Video ID</label>
              <input
                type="text"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="dQw4w9WgXcQ"
                className="w-full p-2 bg-gray-700 rounded"
              />
              <p className="text-gray-400 text-sm mt-1">
                YouTube URL에서 v= 뒤의 값 (예: youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
              </p>
            </div>
          )}

          {/* Channel ID (for subscribe) */}
          {action === 'subscribe' && (
            <div className="mb-4">
              <label className="block mb-2">Channel ID</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="UCxxxxxx"
                className="w-full p-2 bg-gray-700 rounded"
              />
            </div>
          )}

          {/* Comment (for comment action) */}
          {action === 'comment' && (
            <div className="mb-4">
              <label className="block mb-2">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="좋은 영상이네요!"
                className="w-full p-2 bg-gray-700 rounded"
                rows={3}
              />
            </div>
          )}

          <button
            onClick={executeAction}
            disabled={loading}
            className={`w-full px-4 py-3 rounded font-semibold ${
              loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? '⏳ 실행 중...' : '🚀 Execute Action'}
          </button>
        </div>

        {/* 결과 표시 */}
        {result && (
          <div
            className={`p-4 rounded-lg ${
              result.success ? 'bg-green-800' : 'bg-red-800'
            }`}
          >
            <h2 className="text-xl font-semibold mb-2">
              {result.success ? '✅ Success' : '❌ Failed'}
            </h2>
            <pre className="p-4 bg-black bg-opacity-30 rounded text-sm overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {/* 사용 설명 */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg text-gray-300 text-sm">
          <h3 className="font-semibold mb-2">💡 사용 방법</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>먼저 &quot;Check API Status&quot;로 Kernel 연결 상태를 확인하세요.</li>
            <li>kernelConfigured: true 인지 확인하세요.</li>
            <li>Action Type을 선택하고 필요한 정보를 입력하세요.</li>
            <li>&quot;Execute Action&quot;을 클릭하여 실행하세요.</li>
          </ol>
          <p className="mt-4 text-yellow-400">
            ⚠️ 주의: 좋아요, 댓글, 구독은 실제 YouTube 계정에 영향을 미칩니다.
            테스트 시 신중히 사용하세요.
          </p>
        </div>
      </div>
    </main>
  );
}
