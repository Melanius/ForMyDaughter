-- 🧹 레거시 가족 시스템 정리 스크립트
-- 기존 1:1 관계 테이블과 불필요한 필드들을 정리합니다.

-- ⚠️ 주의: 이 스크립트는 신중하게 실행하세요!
-- 프로토타입 환경에서 기존 사용자가 없을 때만 실행하세요.

-- 1. 기존 1:1 연결 요청 테이블 제거 (더 이상 사용하지 않음)
DROP TABLE IF EXISTS family_connection_requests CASCADE;

-- 2. profiles 테이블의 레거시 필드들 제거
-- 이제 families와 family_members 테이블을 사용하므로 불필요

-- parent_id 필드 제거 (새로운 family_members 테이블 사용)
ALTER TABLE profiles DROP COLUMN IF EXISTS parent_id;

-- family_code 필드 제거 (새로운 families 테이블의 family_code 사용)
ALTER TABLE profiles DROP COLUMN IF EXISTS family_code;

-- 3. 사용하지 않는 인덱스 제거
DROP INDEX IF EXISTS idx_profiles_parent_id;
DROP INDEX IF EXISTS idx_profiles_family_code;

-- 4. 현재 상태 확인을 위한 쿼리들
-- 실행 후 결과를 확인하세요

-- 남아있는 profiles 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 새로운 가족 시스템 테이블들 확인
SELECT 
  'families' as table_name,
  COUNT(*) as record_count
FROM families
UNION ALL
SELECT 
  'family_members' as table_name,
  COUNT(*) as record_count
FROM family_members;

-- 외래키 관계 확인
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name IN ('families', 'family_members', 'profiles'))
ORDER BY tc.table_name, kcu.column_name;

-- 5. 정리 완료 메시지
SELECT '✅ 레거시 가족 시스템 정리 완료!' as message;