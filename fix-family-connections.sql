-- 🔧 가족 연결 문제 완전 해결 SQL 스크립트
-- 주의: 프로덕션 DB에 적용하기 전에 백업 필수!

-- 1. 누락된 family_connection_requests 레코드 생성
INSERT INTO family_connection_requests (
  parent_id, 
  child_id, 
  status, 
  requested_at, 
  responded_at
)
SELECT 
  p.parent_id,
  p.id as child_id,
  'approved' as status,
  NOW() as requested_at,
  NOW() as responded_at
FROM profiles p
WHERE p.user_type = 'child' 
  AND p.parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM family_connection_requests fcr 
    WHERE fcr.parent_id = p.parent_id 
    AND fcr.child_id = p.id
  );

-- 2. 생성된 family_connection_requests의 ID 확인
SELECT 
  fcr.id as connection_id,
  pp.full_name as parent_name,
  cp.full_name as child_name,
  fcr.status
FROM family_connection_requests fcr
JOIN profiles pp ON fcr.parent_id = pp.id
JOIN profiles cp ON fcr.child_id = cp.id
ORDER BY fcr.created_at DESC;

-- 3. NULL family_connection_id 거래내역 업데이트
UPDATE allowance_transactions 
SET family_connection_id = (
  SELECT fcr.id 
  FROM family_connection_requests fcr
  JOIN profiles cp ON fcr.child_id = cp.id
  WHERE cp.id = allowance_transactions.user_id
    AND fcr.status = 'approved'
  LIMIT 1
)
WHERE family_connection_id IS NULL
  AND user_id IN (
    SELECT id FROM profiles WHERE user_type = 'child' AND parent_id IS NOT NULL
  );

-- 4. 결과 확인
SELECT 
  COUNT(*) as total_transactions,
  COUNT(family_connection_id) as with_family_id,
  COUNT(*) - COUNT(family_connection_id) as null_family_id
FROM allowance_transactions;