-- MoneySeed Database Schema (RLS 비활성화 버전)
-- 회원가입 문제 해결을 위해 일시적으로 RLS 비활성화

-- RLS 비활성화
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE mission_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE mission_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE allowance_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE allowance_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_connection_requests DISABLE ROW LEVEL SECURITY;

-- 모든 정책 제거
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage own templates only" ON mission_templates;
DROP POLICY IF EXISTS "Users can manage own instances only" ON mission_instances;
DROP POLICY IF EXISTS "Users can manage own transactions only" ON allowance_transactions;
DROP POLICY IF EXISTS "Users can manage own balances only" ON allowance_balances;
DROP POLICY IF EXISTS "Users can view own connection requests" ON family_connection_requests;
DROP POLICY IF EXISTS "Children can create connection requests" ON family_connection_requests;
DROP POLICY IF EXISTS "Parents can update connection requests" ON family_connection_requests;

-- 주의: RLS가 비활성화되어 있어 모든 사용자가 모든 데이터에 접근할 수 있습니다.
-- 회원가입 성공 후 애플리케이션 레벨에서 권한 관리를 구현해야 합니다.