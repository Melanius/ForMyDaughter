-- =============================================
-- Phase 2 문제점 해결 SQL
-- =============================================

-- 문제 1: 누락된 가족 데이터 (FAMILY_56A5B2) 해결
-- 해결방법: 수동 동기화를 통해 누락된 가족 추가

-- 1-1. 누락된 가족 수동 추가
DO $$
DECLARE
    missing_family_code text := 'FAMILY_56A5B2';
    members_array jsonb;
    first_parent_name text;
    family_display_name text;
BEGIN
    -- 해당 가족의 구성원 정보를 JSONB 배열로 구성
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', p.id,
            'name', p.full_name,
            'role', p.user_type,
            'joined_at', COALESCE(p.created_at, now()),
            'is_active', true
        ) ORDER BY 
            CASE p.user_type 
                WHEN 'father' THEN 1 
                WHEN 'mother' THEN 2 
                WHEN 'son' THEN 3 
                WHEN 'daughter' THEN 4 
                ELSE 5 
            END,
            p.created_at
    )
    INTO members_array
    FROM profiles p
    WHERE p.family_code = missing_family_code
      AND p.user_type IN ('father', 'mother', 'son', 'daughter');

    -- 첫 번째 부모의 이름으로 가족 이름 생성
    SELECT p.full_name
    INTO first_parent_name
    FROM profiles p
    WHERE p.family_code = missing_family_code
      AND p.user_type IN ('father', 'mother')
    ORDER BY 
        CASE p.user_type WHEN 'father' THEN 1 WHEN 'mother' THEN 2 END,
        p.created_at
    LIMIT 1;

    -- 가족 이름 설정
    family_display_name := COALESCE(first_parent_name || '님의 가족', '가족');

    -- families 테이블에 삽입 또는 업데이트
    INSERT INTO families (
        family_code,
        family_name,
        members,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        missing_family_code,
        family_display_name,
        COALESCE(members_array, '[]'::jsonb),
        true,
        now(),
        now()
    )
    ON CONFLICT (family_code) DO UPDATE SET
        family_name = EXCLUDED.family_name,
        members = EXCLUDED.members,
        updated_at = now();

    RAISE NOTICE '누락된 가족 추가 완료: %', missing_family_code;
END;
$$;

-- 문제 2: check_families_sync_status 함수의 timestamp 타입 불일치 해결
-- 해결방법: 함수 정의에서 timestamp 타입을 timestamptz로 수정

-- 2-1. 기존 함수 삭제
DROP FUNCTION IF EXISTS check_families_sync_status();

-- 2-2. 수정된 함수 생성 (타입 불일치 해결)
CREATE OR REPLACE FUNCTION check_families_sync_status()
RETURNS TABLE(
  family_code text,
  profiles_count bigint,
  families_count integer,
  sync_status text,
  last_updated text  -- timestamptz 대신 text 사용으로 타입 불일치 해결
) AS $$
BEGIN
  RETURN QUERY
  WITH profile_counts AS (
    SELECT 
      p.family_code,
      count(*) as profile_count
    FROM profiles p
    WHERE p.family_code IS NOT NULL
      AND p.family_code != ''
      AND p.family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'
    GROUP BY p.family_code
  ),
  family_counts AS (
    SELECT 
      f.family_code,
      f.total_members,
      f.updated_at::text as updated_text  -- timestamptz를 text로 변환
    FROM families f
  )
  SELECT 
    COALESCE(pc.family_code, fc.family_code) as family_code,
    COALESCE(pc.profile_count, 0) as profiles_count,
    COALESCE(fc.total_members, 0) as families_count,
    CASE 
      WHEN pc.profile_count = fc.total_members THEN '✅ 동기화됨'
      WHEN pc.profile_count IS NULL THEN '⚠️ profiles 없음'
      WHEN fc.total_members IS NULL THEN '⚠️ families 없음'
      ELSE '❌ 동기화 필요'
    END as sync_status,
    COALESCE(fc.updated_text, '') as last_updated
  FROM profile_counts pc
  FULL OUTER JOIN family_counts fc ON pc.family_code = fc.family_code
  ORDER BY COALESCE(pc.family_code, fc.family_code);
END;
$$ LANGUAGE plpgsql;

-- 검증 쿼리들
-- 3-1. 누락된 가족이 추가되었는지 확인
SELECT 
  family_code,
  family_name,
  total_members,
  parents_count,
  children_count,
  is_active
FROM families 
WHERE family_code = 'FAMILY_56A5B2';

-- 3-2. 수정된 동기화 상태 확인 함수 테스트
SELECT * FROM check_families_sync_status();

-- 3-3. 전체 동기화 상태 요약
SELECT 
  count(*) as 총_가족수,
  sum(total_members) as 총_구성원수,
  sum(parents_count) as 총_부모수,
  sum(children_count) as 총_자녀수
FROM families 
WHERE is_active = true;