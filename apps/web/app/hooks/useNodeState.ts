'use client';

// ============================================
// useNodeState - 노드 상태 관리 훅
// Context에서 분리된 개별 훅
// ============================================

import { useCallback } from 'react';
import { useNodes, GatewayNode, NodeStatus } from '../contexts/NodeContext';

/**
 * 노드 상태 관리를 위한 커스텀 훅
 */
export function useNodeState() {
  const { state, nodes, getNodeById, getOnlineNodes } = useNodes();

  // 통계 계산
  const stats = {
    total: nodes.length,
    online: nodes.filter(n => n.status === 'online').length,
    offline: nodes.filter(n => n.status === 'offline').length,
    reconnecting: nodes.filter(n => n.status === 'reconnecting').length,
  };

  // 상태별 노드 필터링
  const getNodesByStatus = useCallback((status: NodeStatus) => {
    return nodes.filter(n => n.status === status);
  }, [nodes]);

  // 오프라인 노드 조회
  const getOfflineNodes = useCallback(() => {
    return nodes.filter(n => n.status === 'offline');
  }, [nodes]);

  // 재연결 중인 노드 조회
  const getReconnectingNodes = useCallback(() => {
    return nodes.filter(n => n.status === 'reconnecting');
  }, [nodes]);

  return {
    // 데이터
    nodes,
    nodesMap: state.nodes,
    stats,
    connectionStatus: state.connectionStatus,
    lastError: state.lastError,

    // 조회
    getNodeById,
    getOnlineNodes,
    getOfflineNodes,
    getReconnectingNodes,
    getNodesByStatus,
  };
}

