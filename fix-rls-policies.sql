-- ===============================================
-- 🔧 RLS 정책 수정 - 가족 거래내역 공유 허용
-- ===============================================

-- 문제 분석:
-- 현재 RLS 정책이 auth.uid() = user_id 만 체크하여
-- 사용자가 자신이 생성한 거래만 볼 수 있도록 제한됨
-- family_connection_id를 기반으로 가족 구성원 간 거래를 공유할 수 있도록 수정 필요

-- 1. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can only see their own transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Enable read access for own transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON allowance_transactions;
DROP POLICY IF EXISTS "Enable update for own transactions" ON allowance_transactions;
DROP POLICY IF EXISTS "Enable delete for own transactions" ON allowance_transactions;

-- 2. 새로운 가족 공유 RLS 정책 생성

-- SELECT 정책: 가족 구성원 간 거래 조회 허용
CREATE POLICY "Enable family transaction sharing" ON allowance_transactions
    FOR SELECT
    USING (
        -- 자신의 거래는 볼 수 있음
        auth.uid() = user_id
        OR
        -- 승인된 가족 연결을 통한 거래는 볼 수 있음
        (
            family_connection_id IS NOT NULL
            AND family_connection_id IN (
                SELECT fcr.id 
                FROM family_connection_requests fcr
                WHERE fcr.status = 'approved'
                AND (fcr.parent_id = auth.uid() OR fcr.child_id = auth.uid())
            )
        )
    );

-- INSERT 정책: 거래 추가 시 가족 연결 확인
CREATE POLICY "Enable family transaction insert" ON allowance_transactions
    FOR INSERT
    WITH CHECK (
        -- 자신의 거래만 추가 가능
        auth.uid() = user_id
        AND
        -- 가족 연결 ID가 없거나 유효한 경우만 허용
        (
            family_connection_id IS NULL
            OR
            family_connection_id IN (
                SELECT fcr.id 
                FROM family_connection_requests fcr
                WHERE fcr.status = 'approved'
                AND (fcr.parent_id = auth.uid() OR fcr.child_id = auth.uid())
            )
        )
    );

-- UPDATE 정책: 가족 구성원 간 거래 수정 허용
CREATE POLICY "Enable family transaction update" ON allowance_transactions
    FOR UPDATE
    USING (
        -- 자신의 거래는 수정 가능
        auth.uid() = user_id
        OR
        -- 가족 연결된 거래는 수정 가능 (부모가 자녀 거래 수정 등)
        (
            family_connection_id IS NOT NULL
            AND family_connection_id IN (
                SELECT fcr.id 
                FROM family_connection_requests fcr
                WHERE fcr.status = 'approved'
                AND (fcr.parent_id = auth.uid() OR fcr.child_id = auth.uid())
            )
        )
    )
    WITH CHECK (
        -- 수정된 데이터도 동일한 조건 적용
        auth.uid() = user_id
        AND
        (
            family_connection_id IS NULL
            OR
            family_connection_id IN (
                SELECT fcr.id 
                FROM family_connection_requests fcr
                WHERE fcr.status = 'approved'
                AND (fcr.parent_id = auth.uid() OR fcr.child_id = auth.uid())
            )
        )
    );

-- DELETE 정책: 가족 구성원 간 거래 삭제 허용
CREATE POLICY "Enable family transaction delete" ON allowance_transactions
    FOR DELETE
    USING (
        -- 자신의 거래는 삭제 가능
        auth.uid() = user_id
        OR
        -- 가족 연결된 거래는 삭제 가능 (부모가 자녀 거래 삭제 등)
        (
            family_connection_id IS NOT NULL
            AND family_connection_id IN (
                SELECT fcr.id 
                FROM family_connection_requests fcr
                WHERE fcr.status = 'approved'
                AND (fcr.parent_id = auth.uid() OR fcr.child_id = auth.uid())
            )
        )
    );

-- 3. RLS 활성화 확인
ALTER TABLE allowance_transactions ENABLE ROW LEVEL SECURITY;

-- 4. 정책 적용 확인 쿼리
-- 실행 후 다음 쿼리로 정책이 올바르게 적용되었는지 확인:
/*
-- 정책 목록 확인
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'allowance_transactions';

-- 테스트 데이터 조회 (부모/자녀 각각 로그인하여 실행)
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
*/

-- ===============================================
-- 📋 추가 권장사항
-- ===============================================

-- allowance_balances 테이블도 유사한 정책이 필요할 수 있음
-- family_connection_requests 테이블의 RLS 정책도 확인 필요
-- profiles 테이블의 RLS 정책도 가족 정보 공유를 위해 검토 필요

-- 성능 최적화를 위한 인덱스 (이미 생성되어 있다면 무시됨)
CREATE INDEX IF NOT EXISTS idx_family_connection_requests_parent_child 
ON family_connection_requests(parent_id, child_id, status);

CREATE INDEX IF NOT EXISTS idx_family_connection_requests_status 
ON family_connection_requests(status) WHERE status = 'approved';