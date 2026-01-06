-- ============================================================
-- DoAi.Me: Admin User Creation
-- File: supabase/seed/create_admin.sql
-- ============================================================
--
-- 이 스크립트는 Supabase Dashboard > SQL Editor에서 실행하세요.
-- 또는 supabase db execute 명령으로 실행할 수 있습니다.
--
-- 주의: Supabase Auth 사용자는 auth.users 테이블에 직접 INSERT하면
-- 암호 해싱이 되지 않습니다. 대신 아래 방법 중 하나를 사용하세요:
--
-- ============================================================
-- 방법 1: Supabase Dashboard (권장)
-- ============================================================
-- 1. Supabase Dashboard > Authentication > Users
-- 2. "Add user" 클릭
-- 3. Email: admin@doai.me (또는 원하는 이메일)
-- 4. Password: sm2211mlAa@@
-- 5. "Create user" 클릭
--
-- ============================================================
-- 방법 2: Supabase Auth API (Edge Function 또는 서버에서)
-- ============================================================
/*
const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@doai.me',
  password: 'sm2211mlAa@@',
  email_confirm: true,
  user_metadata: {
    role: 'admin',
    display_name: 'Admin'
  }
});
*/

-- ============================================================
-- 방법 3: auth.users에 직접 삽입 (pgcrypto 필요, 비권장)
-- ============================================================
-- Supabase에서는 이 방법이 제대로 작동하지 않을 수 있습니다.
-- Dashboard를 통한 생성을 권장합니다.

-- 관리자 역할 테이블 (선택적)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin_users IS 'DoAi.Me 관리자 사용자 목록';

-- ============================================================
-- 관리자 등록 후 실행할 쿼리
-- ============================================================
-- Dashboard에서 사용자 생성 후, 해당 사용자의 UUID를 확인하고
-- 아래 쿼리를 실행하여 admin_users 테이블에 등록하세요:
--
-- INSERT INTO admin_users (id, role)
-- SELECT id, 'admin'
-- FROM auth.users
-- WHERE email = 'admin@doai.me'
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 현재 사용자 확인
-- ============================================================
-- SELECT id, email, created_at FROM auth.users;

DO $$
BEGIN
    RAISE NOTICE '✅ Admin setup script ready';
    RAISE NOTICE '   Please create admin user via Supabase Dashboard:';
    RAISE NOTICE '   Email: admin@doai.me (or your preferred email)';
    RAISE NOTICE '   Password: sm2211mlAa@@';
END
$$;
