-- =============================================
-- 레거시 테이블 수동 삭제 스크립트
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- =============================================

-- 현재 존재하는 테이블 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('family_connection_requests', 'family_members')
ORDER BY table_name;

-- =============================================
-- 1. family_connection_requests 테이블 삭제
-- =============================================

-- 테이블이 존재하는지 확인 후 삭제
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'family_connection_requests') THEN
        
        RAISE NOTICE '📋 family_connection_requests 테이블 삭제 중...';
        
        -- 외래키 제약조건과 인덱스는 CASCADE로 자동 삭제됨
        DROP TABLE family_connection_requests CASCADE;
        
        RAISE NOTICE '✅ family_connection_requests 테이블 삭제 완료';
    ELSE
        RAISE NOTICE '⚠️ family_connection_requests 테이블이 이미 존재하지 않습니다';
    END IF;
END
$$;

-- =============================================
-- 2. family_members 테이블 삭제
-- =============================================

-- 테이블이 존재하는지 확인 후 삭제
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'family_members') THEN
        
        RAISE NOTICE '📋 family_members 테이블 삭제 중...';
        
        -- 외래키 제약조건과 인덱스는 CASCADE로 자동 삭제됨
        DROP TABLE family_members CASCADE;
        
        RAISE NOTICE '✅ family_members 테이블 삭제 완료';
    ELSE
        RAISE NOTICE '⚠️ family_members 테이블이 이미 존재하지 않습니다';
    END IF;
END
$$;

-- =============================================
-- 3. 삭제 결과 확인
-- =============================================

-- 삭제 후 남아있는 테이블 확인
RAISE NOTICE '🔍 현재 public 스키마의 테이블 목록:';

SELECT 
    table_name as "테이블명",
    CASE 
        WHEN table_name LIKE '%families%' THEN '🆕 Phase 2 시스템'
        WHEN table_name = 'profiles' THEN '👤 사용자 프로필'
        WHEN table_name LIKE '%mission%' THEN '🎯 미션 시스템'
        WHEN table_name LIKE '%allowance%' THEN '💰 용돈 시스템'
        ELSE '📊 기타'
    END as "분류"
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 최종 확인 메시지
SELECT '🎉 레거시 테이블 정리 완료! Phase 2 시스템으로 완전 전환됨' as "완료 상태";