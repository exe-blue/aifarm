/**
 * React Query Client Configuration
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 데이터 캐시 유지 시간 (1분)
      staleTime: 1000 * 60,
      
      // 가비지 컬렉션 시간 (5분)
      gcTime: 1000 * 60 * 5,
      
      // 윈도우 포커스 시 자동 refetch 비활성화
      refetchOnWindowFocus: false,
      
      // 마운트 시 자동 refetch
      refetchOnMount: true,
      
      // 재연결 시 refetch
      refetchOnReconnect: true,
      
      // 재시도 횟수
      retry: 1,
      
      // 재시도 지연 시간
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // 뮤테이션 재시도 횟수
      retry: 0,
    },
  },
});

// 캐시 무효화 헬퍼
export const invalidateQueries = (queryKey: string[]) => {
  queryClient.invalidateQueries({ queryKey });
};

// 전체 캐시 초기화
export const clearAllQueries = () => {
  queryClient.clear();
};

