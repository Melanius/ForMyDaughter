-- ===============================================
-- 🔗 family_connection_id 기반 거래 시스템 마이그레이션
-- ===============================================

-- 1. allowance_transactions 테이블에 family_connection_id 컬럼 추가
ALTER TABLE allowance_transactions 
ADD COLUMN family_connection_id uuid;

-- 2. family_connection_requests 테이블에 대한 외래 키 제약 조건 추가
ALTER TABLE allowance_transactions 
ADD CONSTRAINT fk_allowance_transactions_family_connection 
FOREIGN KEY (family_connection_id) REFERENCES family_connection_requests(id);

-- 3. 기존 데이터 마이그레이션 (승인된 가족 관계만)
-- 부모가 추가한 거래 업데이트
UPDATE allowance_transactions 
SET family_connection_id = (
    SELECT fcr.id 
    FROM family_connection_requests fcr
    JOIN profiles p ON p.id = allowance_transactions.user_id
    WHERE fcr.parent_id = allowance_transactions.user_id
    AND fcr.status = 'approved'
    AND p.user_type = 'parent'
    LIMIT 1
)
WHERE family_connection_id IS NULL
AND user_id IN (
    SELECT parent_id FROM family_connection_requests WHERE status = 'approved'
);

-- 자녀가 추가한 거래 업데이트
UPDATE allowance_transactions 
SET family_connection_id = (
    SELECT fcr.id 
    FROM family_connection_requests fcr
    JOIN profiles p ON p.id = allowance_transactions.user_id
    WHERE fcr.child_id = allowance_transactions.user_id
    AND fcr.status = 'approved'
    AND p.user_type = 'child'
    LIMIT 1
)
WHERE family_connection_id IS NULL
AND user_id IN (
    SELECT child_id FROM family_connection_requests WHERE status = 'approved'
);

-- 4. 성능 최적화를 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_allowance_transactions_family_connection_id 
ON allowance_transactions(family_connection_id);

-- 5. 마이그레이션 확인 쿼리
-- 실행 후 다음 쿼리로 결과 확인:
/*
-- 마이그레이션 결과 확인
SELECT 
    'Total transactions' as description,
    COUNT(*) as count
FROM allowance_transactions
UNION ALL
SELECT 
    'Transactions with family_connection_id' as description,
    COUNT(*) as count
FROM allowance_transactions 
WHERE family_connection_id IS NOT NULL
UNION ALL
SELECT 
    'Approved family connections' as description,
    COUNT(*) as count
FROM family_connection_requests 
WHERE status = 'approved';

-- 가족별 거래 분포 확인
SELECT 
    fcr.id as family_connection_id,
    fcr.parent_id,
    fcr.child_id,
    COUNT(at.id) as transaction_count
FROM family_connection_requests fcr
LEFT JOIN allowance_transactions at ON at.family_connection_id = fcr.id
WHERE fcr.status = 'approved'
GROUP BY fcr.id, fcr.parent_id, fcr.child_id
ORDER BY transaction_count DESC;
*/