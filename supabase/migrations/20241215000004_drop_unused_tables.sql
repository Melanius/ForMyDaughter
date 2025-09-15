-- =============================================
-- 사용하지 않는 테이블 삭제
-- family_connection_requests, family_members 테이블 제거
-- =============================================

-- family_connection_requests 테이블 삭제
-- 이 테이블은 현재 사용되지 않는 레거시 가족 연결 요청 시스템임
-- 현재는 profiles.family_code 직접 설정과 Phase 2 families 테이블 자동 동기화 사용
DROP TABLE IF EXISTS family_connection_requests CASCADE;

-- family_members 테이블 삭제
-- 이 테이블은 Phase 1에서 사용되던 개별 구성원 저장 시스템임
-- Phase 2에서는 families 테이블의 members JSONB 컬럼으로 통합 저장
DROP TABLE IF EXISTS family_members CASCADE;

-- 관련 인덱스들도 자동으로 삭제됨:
-- family_connection_requests 관련:
-- - idx_family_requests_parent
-- - idx_family_requests_child
-- family_members 관련:
-- - family_members_pkey
-- - family_members_family_id_fkey
-- - family_members_user_id_fkey

-- 삭제 확인
SELECT 'family_connection_requests 테이블 삭제 완료' as status_1;
SELECT 'family_members 테이블 삭제 완료' as status_2;