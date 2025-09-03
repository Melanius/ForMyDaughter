-- ===============================================
-- 🔍 RLS 정책 조사 쿼리
-- ===============================================

-- 1. allowance_transactions 테이블의 모든 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'allowance_transactions';

-- 2. profiles 테이블의 RLS 정책도 확인 (연관 테이블)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. family_connection_requests 테이블의 RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'family_connection_requests';

-- 4. 현재 사용자의 역할 확인
SELECT current_user, current_setting('role');

-- ===============================================
-- 🧪 테스트 쿼리 (RLS 정책 동작 확인)
-- ===============================================

-- 부모 계정에서 실행할 테스트 쿼리
/*
-- 부모 계정으로 로그인 후:
SELECT 
    id,
    user_id,
    family_connection_id,
    amount,
    type,
    category,
    description,
    created_at
FROM allowance_transactions
ORDER BY created_at DESC
LIMIT 10;

-- family_connection_requests 확인
SELECT 
    id,
    parent_id,
    child_id,
    status
FROM family_connection_requests
WHERE status = 'approved';
*/

-- 자녀 계정에서 실행할 테스트 쿼리
/*
-- 자녀 계정으로 로그인 후:
SELECT 
    id,
    user_id,
    family_connection_id,
    amount,
    type,
    category,
    description,
    created_at
FROM allowance_transactions
ORDER BY created_at DESC
LIMIT 10;

-- family_connection_requests 확인
SELECT 
    id,
    parent_id,
    child_id,
    status
FROM family_connection_requests
WHERE status = 'approved';
*/

-- ===============================================
-- 🔧 예상되는 RLS 정책 수정
-- ===============================================

-- 기존 RLS 정책이 문제가 있을 경우, 다음과 같은 정책으로 수정 필요:

/*
-- 기존 정책 삭제 (필요시)
DROP POLICY IF EXISTS "Users can only see their own transactions" ON allowance_transactions;

-- 새로운 가족 공유 정책 생성
CREATE POLICY "Users can see family transactions" ON allowance_transactions
    FOR SELECT
    USING (
        -- 자신의 거래는 볼 수 있음
        auth.uid() = user_id
        OR
        -- 가족 연결된 거래는 볼 수 있음
        family_connection_id IN (
            SELECT id 
            FROM family_connection_requests 
            WHERE status = 'approved'
            AND (parent_id = auth.uid() OR child_id = auth.uid())
        )
    );

-- INSERT 정책
CREATE POLICY "Users can insert family transactions" ON allowance_transactions
    FOR INSERT
    WITH CHECK (
        -- 자신의 거래만 추가 가능
        auth.uid() = user_id
        AND
        -- 가족 연결 ID가 유효해야 함
        (
            family_connection_id IS NULL
            OR
            family_connection_id IN (
                SELECT id 
                FROM family_connection_requests 
                WHERE status = 'approved'
                AND (parent_id = auth.uid() OR child_id = auth.uid())
            )
        )
    );

-- UPDATE 정책
CREATE POLICY "Users can update family transactions" ON allowance_transactions
    FOR UPDATE
    USING (
        auth.uid() = user_id
        OR
        family_connection_id IN (
            SELECT id 
            FROM family_connection_requests 
            WHERE status = 'approved'
            AND (parent_id = auth.uid() OR child_id = auth.uid())
        )
    );

-- DELETE 정책
CREATE POLICY "Users can delete family transactions" ON allowance_transactions
    FOR DELETE
    USING (
        auth.uid() = user_id
        OR
        family_connection_id IN (
            SELECT id 
            FROM family_connection_requests 
            WHERE status = 'approved'
            AND (parent_id = auth.uid() OR child_id = auth.uid())
        )
    );
*/