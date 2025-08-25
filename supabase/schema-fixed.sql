-- MoneySeed Database Schema (Fixed RLS Policies)
-- 사용자 프로필 테이블 (Supabase Auth 확장)

-- 기존 정책들 제거
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Parents can view children profiles" ON profiles;

-- RLS 정책 재생성 (수정된 버전)

-- 1. Profiles 정책
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 부모는 자녀 프로필 조회 가능 (수정된 정책 - 무한재귀 방지)
CREATE POLICY "Parents can view children profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles parent_profile
            WHERE parent_profile.id = auth.uid()
            AND parent_profile.user_type = 'parent'
            AND profiles.parent_id = auth.uid()
        )
    );

-- 2. Mission Templates 정책 (수정된 버전)
DROP POLICY IF EXISTS "Users can manage own templates" ON mission_templates;
DROP POLICY IF EXISTS "Parents can view children templates" ON mission_templates;

CREATE POLICY "Users can manage own templates" ON mission_templates
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 템플릿 조회 가능 (수정된 정책)
CREATE POLICY "Parents can view children templates" ON mission_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles child_profile
            WHERE child_profile.id = mission_templates.user_id
            AND child_profile.parent_id = auth.uid()
        )
    );

-- 3. Mission Instances 정책 (수정된 버전)
DROP POLICY IF EXISTS "Users can manage own instances" ON mission_instances;
DROP POLICY IF EXISTS "Parents can manage children instances" ON mission_instances;

CREATE POLICY "Users can manage own instances" ON mission_instances
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 미션 조회 및 관리 가능 (수정된 정책)
CREATE POLICY "Parents can manage children instances" ON mission_instances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles child_profile
            WHERE child_profile.id = mission_instances.user_id
            AND child_profile.parent_id = auth.uid()
        )
    );

-- 4. Allowance Transactions 정책 (수정된 버전)
DROP POLICY IF EXISTS "Users can manage own transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Parents can view children transactions" ON allowance_transactions;

CREATE POLICY "Users can manage own transactions" ON allowance_transactions
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 거래 내역 조회 가능 (수정된 정책)
CREATE POLICY "Parents can view children transactions" ON allowance_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles child_profile
            WHERE child_profile.id = allowance_transactions.user_id
            AND child_profile.parent_id = auth.uid()
        )
    );

-- 5. Allowance Balances 정책 (수정된 버전)
DROP POLICY IF EXISTS "Users can manage own balances" ON allowance_balances;
DROP POLICY IF EXISTS "Parents can view children balances" ON allowance_balances;

CREATE POLICY "Users can manage own balances" ON allowance_balances
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 잔액 조회 가능 (수정된 정책)
CREATE POLICY "Parents can view children balances" ON allowance_balances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles child_profile
            WHERE child_profile.id = allowance_balances.user_id
            AND child_profile.parent_id = auth.uid()
        )
    );