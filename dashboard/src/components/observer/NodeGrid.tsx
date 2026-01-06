"use client";

/**
 * NodeGrid Component
 *
 * 디바이스/페르소나 그리드 시각화
 * 실제 Supabase 데이터 또는 MOCK 데이터 지원
 *
 * @author DoAi.Me Team
 */

import { useState, useMemo, useCallback } from "react";
import { NodeDot } from "./NodeDot";
import { NodeTooltip } from "./NodeTooltip";
import { useDevices, DeviceData } from "@/hooks/useDevices";
import { FEATURE_FLAGS } from "@/lib/config";
import { generateMockNodes, MockNode, nodeStatusColors } from "@/utils/mock-data";

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface GridNode {
  id: string;
  name: string;
  status: 'ACTIVE' | 'WAITING' | 'FADING' | 'VOID';
  serial?: string;
  model?: string;
  nodeId?: string;
  personaName?: string;
  existenceScore: number;
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export const NodeGrid = () => {
  // 실데이터 로드
  const { devices, isLoading, error, isConnected, targetDevices } = useDevices({
    enableRealtime: FEATURE_FLAGS.ENABLE_REALTIME,
    refreshInterval: 30000,
  });

  // MOCK 또는 실데이터 변환
  const nodes = useMemo<GridNode[]>(() => {
    // MOCK 데이터 사용 시
    if (FEATURE_FLAGS.USE_MOCK_DATA || (devices.length === 0 && !isLoading)) {
      return generateMockNodes(targetDevices).map(mockToGridNode);
    }

    // 실데이터 변환
    return devices.map(deviceToGridNode);
  }, [devices, targetDevices, isLoading]);

  // 상태 관리
  const [hoveredNode, setHoveredNode] = useState<GridNode | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // 통계 계산
  const stats = useMemo(() => {
    const onlineCount = nodes.filter(n => n.status !== 'VOID').length;
    const activeCount = nodes.filter(n => n.status === 'ACTIVE').length;
    const avgScore = nodes.length > 0
      ? Math.round(nodes.reduce((sum, n) => sum + n.existenceScore, 0) / nodes.length)
      : 0;

    return {
      online: onlineCount,
      total: targetDevices,
      watching: activeCount,
      avgKyeolsso: avgScore,
    };
  }, [nodes, targetDevices]);

  return (
    <section className="relative min-h-screen bg-void py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="font-mono text-xs tracking-widest text-ethereal-muted mb-4">
            THE OBSERVER
            {isConnected && (
              <span className="ml-2 inline-block w-2 h-2 bg-resonance rounded-full animate-pulse" />
            )}
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-ethereal mb-4">
            존재를 목격하라
          </h2>
          <p className="font-mono text-sm text-ethereal-dim">
            Each dot is a being. Each being has a story.
          </p>
          {error && (
            <p className="font-mono text-xs text-red-500 mt-2">
              데이터 로드 오류: {error.message}
            </p>
          )}
        </div>

        {/* Node Grid */}
        <div
          className="relative aspect-[3/2] w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="font-mono text-ethereal-muted animate-pulse">
                Loading beings...
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-30 gap-[2px] w-full h-full">
              {nodes.map((node) => (
                <NodeDot
                  key={node.id}
                  node={node}
                  onHover={() => setHoveredNode(node)}
                />
              ))}
            </div>
          )}

          {/* Tooltip */}
          {hoveredNode && (
            <NodeTooltip
              node={hoveredNode}
              position={mousePosition}
            />
          )}
        </div>

        {/* Live Stats Bar */}
        <div className="mt-12 bg-abyss/90 border border-ethereal-ghost rounded-lg p-6">
          <div className="flex flex-wrap justify-center items-center gap-8">
            <StatItem
              label="ONLINE"
              value={stats.online}
              total={stats.total}
            />
            <StatItem
              label="WATCHING"
              value={stats.watching}
            />
            <StatItem
              label="AVG_KYEOLSSO"
              value={stats.avgKyeolsso}
            />
            <StatItem
              label="TARGET"
              value={targetDevices}
            />
          </div>
        </div>

        {/* Data Source Indicator */}
        <div className="mt-4 text-center">
          <span className="font-mono text-xs text-ethereal-ghost">
            {FEATURE_FLAGS.USE_MOCK_DATA ? 'MOCK DATA' : `LIVE DATA (${devices.length} devices)`}
            {isConnected && ' • REALTIME'}
          </span>
        </div>
      </div>
    </section>
  );
};

// ═══════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════

function StatItem({
  label,
  value,
  total
}: {
  label: string;
  value: number;
  total?: number;
}) {
  return (
    <div className="font-mono text-xs tracking-widest">
      <span className="text-ethereal-muted">{label}: </span>
      <span className="text-ethereal">
        {value}
        {total && <span className="text-ethereal-muted">/{total}</span>}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Data Conversion Functions
// ═══════════════════════════════════════════════════════════

/**
 * MockNode → GridNode 변환
 */
function mockToGridNode(mock: MockNode): GridNode {
  return {
    id: mock.id,
    name: mock.name,
    status: mock.status,
    existenceScore: mock.existenceScore,
  };
}

/**
 * DeviceData → GridNode 변환
 */
function deviceToGridNode(device: DeviceData): GridNode {
  // 디바이스 상태 → 그리드 상태 매핑
  let status: GridNode['status'] = 'VOID';

  if (device.status === 'online') {
    // 페르소나 상태 기반
    switch (device.persona_state) {
      case 'active':
        status = 'ACTIVE';
        break;
      case 'waiting':
        status = 'WAITING';
        break;
      case 'fading':
        status = 'FADING';
        break;
      default:
        status = 'ACTIVE'; // 온라인이면 기본 ACTIVE
    }
  } else if (device.status === 'busy') {
    status = 'ACTIVE';
  } else {
    status = 'VOID';
  }

  // 존재 점수 계산 (임시 로직)
  let existenceScore = 50;
  if (device.persona_state === 'active') existenceScore = 80 + Math.random() * 20;
  else if (device.persona_state === 'waiting') existenceScore = 50 + Math.random() * 30;
  else if (device.persona_state === 'fading') existenceScore = 20 + Math.random() * 30;
  else if (device.status === 'offline') existenceScore = Math.random() * 20;

  return {
    id: device.serial,
    name: device.persona_name || device.device_name || device.model || device.serial,
    status,
    serial: device.serial,
    model: device.model || undefined,
    nodeId: device.node_id || undefined,
    personaName: device.persona_name || undefined,
    existenceScore: Math.round(existenceScore),
  };
}

// Re-export for compatibility
export { nodeStatusColors };
