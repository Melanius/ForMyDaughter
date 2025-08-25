-- MoneySeed Database Schema (완전 단순화 버전 - 무한재귀 방지)
-- 복잡한 부모-자녀 관계 정책을 모두 제거하고 기본 정책만 유지

-- ===== 모든 복잡한 정책들 완전 제거 =====
DROP POLICY IF EXISTS "Parents can view children profiles" ON profiles;
DROP POLICY IF EXISTS "Parents can view children templates" ON mission_templates;
DROP POLICY IF EXISTS "Parents can manage children instances" ON mission_instances;
DROP POLICY IF EXISTS "Parents can view children transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Parents can view children balances" ON allowance_balances;

-- ===== 기본 정책만 유지 (무한재귀 없음) =====

-- 1. Profiles 테이블 - 기본 정책만 유지
-- (이미 존재하는 정책들이므로 재생성하지 않음)
-- CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
-- CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Mission Templates - 기본 정책만
CREATE POLICY "Users can manage own templates only" ON mission_templates
    FOR ALL USING (auth.uid() = user_id);

-- 3. Mission Instances - 기본 정책만  
CREATE POLICY "Users can manage own instances only" ON mission_instances
    FOR ALL USING (auth.uid() = user_id);

-- 4. Allowance Transactions - 기본 정책만
CREATE POLICY "Users can manage own transactions only" ON allowance_transactions
    FOR ALL USING (auth.uid() = user_id);

-- 5. Allowance Balances - 기본 정책만
CREATE POLICY "Users can manage own balances only" ON allowance_balances
    FOR ALL USING (auth.uid() = user_id);

-- 주의: 부모-자녀 관계 기능은 일단 제거됨
-- 회원가입 성공 후 애플리케이션 레벨에서 별도 구현 예정