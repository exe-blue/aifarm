import Link from 'next/link';
import { dashboardStats, issueSummary, deviceIssues, activities, watchRequests } from '@/data/realData';

export default function Home() {
  const stats = dashboardStats;
  const issues = issueSummary;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">AIFarm</h1>
        <p className="text-zinc-500 text-sm">YouTube Traffic System</p>
      </header>

      {/* 경고 배너 */}
      {issues.totalIssueDevices > 0 && (
        <div className="bg-red-950/50 border border-red-900 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <div>
                <p className="text-red-400 font-medium">
                  {issues.totalIssueDevices}대 장애 발생
                </p>
                <p className="text-red-400/70 text-sm">
                  미접속 보드 {issues.disconnectedBoards}개 ({issues.disconnectedBoardDevices}대) · 
                  보드20 오류 {issues.errorDevicesOnBoard20}대
                </p>
              </div>
            </div>
            <Link 
              href="/issues" 
              className="text-red-400 text-sm hover:text-red-300 underline"
            >
              점검 목록 →
            </Link>
          </div>
        </div>
      )}

      {/* 상단 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="정상 디바이스" 
          value={stats.onlineDevices} 
          total={stats.totalDevices}
          color="green"
        />
        <StatCard 
          label="접속 보드" 
          value={stats.connectedBoards} 
          total={stats.totalBoards}
          color="blue"
        />
        <StatCard 
          label="대기 요청" 
          value={stats.pendingRequests}
          color="yellow"
        />
        <StatCard 
          label="오늘 시청" 
          value={stats.todayViews}
          color="purple"
        />
      </div>

      {/* 메인 그리드 */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* 시청 요청 (메인) - 2/3 */}
        <div className="md:col-span-2">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="font-semibold text-white">📺 시청 요청</h2>
              <Link 
                href="/watch/new" 
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                + 새 요청
              </Link>
            </div>
            <div className="p-4">
              {watchRequests.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <p className="text-4xl mb-4">📭</p>
                  <p>등록된 시청 요청이 없습니다</p>
                  <p className="text-sm mt-2">새 요청을 등록하여 시작하세요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {watchRequests.map(req => (
                    <WatchRequestCard key={req.id} request={req} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 사이드바 - 1/3 */}
        <div className="space-y-6">
          
          {/* 디바이스 현황 */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            <h3 className="font-semibold text-white mb-4">📱 디바이스</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">정상</span>
                <span className="text-green-500">{stats.onlineDevices}대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">오류</span>
                <span className="text-red-500">{stats.errorDevices}대</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">미접속</span>
                <span className="text-zinc-500">{stats.offlineDevices}대</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">전체</span>
                  <span className="text-white">{stats.totalDevices}대</span>
                </div>
              </div>
            </div>
            <Link 
              href="/devices" 
              className="block text-center text-zinc-500 text-sm mt-4 hover:text-zinc-400"
            >
              자세히 보기 →
            </Link>
          </div>

          {/* 상시 활동 */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            <h3 className="font-semibold text-white mb-4">🔄 상시 활동</h3>
            <div className="space-y-2">
              {activities.slice(0, 3).map(activity => (
                <div key={activity.id} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    {activity.icon} {activity.name}
                  </span>
                  <span className={activity.activeDevices > 0 ? 'text-green-500' : 'text-zinc-600'}>
                    {activity.activeDevices}대
                  </span>
                </div>
              ))}
            </div>
            <Link 
              href="/activities" 
              className="block text-center text-zinc-500 text-sm mt-4 hover:text-zinc-400"
            >
              전체 활동 →
            </Link>
          </div>

          {/* 빠른 링크 */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
            <h3 className="font-semibold text-white mb-4">⚡ 바로가기</h3>
            <div className="space-y-2">
              <Link 
                href="/issues" 
                className="flex items-center justify-between text-sm text-zinc-400 hover:text-white p-2 rounded hover:bg-zinc-800 transition"
              >
                <span>🔧 점검 요망</span>
                <span className="text-red-500">{deviceIssues.filter(i => !i.resolved).length}</span>
              </Link>
              <Link 
                href="/boards" 
                className="flex items-center justify-between text-sm text-zinc-400 hover:text-white p-2 rounded hover:bg-zinc-800 transition"
              >
                <span>🖥️ 보드 관리</span>
                <span className="text-zinc-500">{stats.totalBoards}</span>
              </Link>
              <Link 
                href="/logs" 
                className="flex items-center justify-between text-sm text-zinc-400 hover:text-white p-2 rounded hover:bg-zinc-800 transition"
              >
                <span>📋 활동 로그</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// 통계 카드
function StatCard({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total?: number;
  color: 'green' | 'blue' | 'yellow' | 'purple' | 'red';
}) {
  const colors = {
    green: 'text-green-500',
    blue: 'text-blue-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
  };

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <p className="text-zinc-500 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${colors[color]}`}>
        {value.toLocaleString()}
        {total && <span className="text-zinc-600 text-lg">/{total}</span>}
      </p>
    </div>
  );
}

// 시청 요청 카드
function WatchRequestCard({ request }: { request: any }) {
  const statusColors = {
    queued: 'bg-yellow-500/20 text-yellow-500',
    in_progress: 'bg-blue-500/20 text-blue-500',
    completed: 'bg-green-500/20 text-green-500',
    failed: 'bg-red-500/20 text-red-500',
  };

  const statusLabels = {
    queued: '대기중',
    in_progress: '진행중',
    completed: '완료',
    failed: '실패',
  };

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-white">{request.videoTitle}</h4>
        <span className={`text-xs px-2 py-1 rounded ${statusColors[request.status as keyof typeof statusColors]}`}>
          {statusLabels[request.status as keyof typeof statusLabels]}
        </span>
      </div>
      <div className="flex gap-4 text-sm text-zinc-500">
        <span>목표: {request.targetViews}회</span>
        <span>완료: {request.completedViews}회</span>
        <span>좋아요: {request.likeRate}%</span>
      </div>
      <div className="mt-2 bg-zinc-700 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-blue-500 h-full transition-all"
          style={{ width: `${(request.completedViews / request.targetViews) * 100}%` }}
        />
      </div>
    </div>
  );
}
