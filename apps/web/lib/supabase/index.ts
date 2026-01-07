// lib/supabase/index.ts
// Supabase 모듈 Barrel Export

// 클라이언트
export { supabase } from './client';

// 타입
export * from './types';

// Realtime Hooks (타입은 types.ts에서 export하므로 훅만 export)
export { useSocietyStatus, useActivityFeed, useActiveEvents } from './realtime';


