-- =============================================
-- profiles 데이터를 families 테이블로 마이그레이션
-- =============================================
-- 
-- 목적: 기존 profiles 테이블의 family_code 기반 가족 정보를
--       새로운 families 테이블로 마이그레이션
--

-- 1. 마이그레이션 함수 생성
CREATE OR REPLACE FUNCTION migrate_profiles_to_families()
RETURNS TABLE(
  family_code text,
  family_name text,
  members_count integer,
  parents_count integer,
  children_count integer
) AS $$
DECLARE
  family_record record;
  members_array jsonb;
  first_parent_name text;
  family_display_name text;
BEGIN
  -- 임시 결과 테이블 생성
  CREATE TEMP TABLE migration_results (
    family_code text,
    family_name text,
    members_count integer,
    parents_count integer,
    children_count integer
  ) ON COMMIT DROP;

  -- family_code별로 가족 정보 처리
  FOR family_record IN
    SELECT DISTINCT p.family_code
    FROM profiles p
    WHERE p.family_code IS NOT NULL
      AND p.family_code != ''
      AND p.family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'
  LOOP
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
    WHERE p.family_code = family_record.family_code
      AND p.user_type IN ('father', 'mother', 'son', 'daughter');

    -- 첫 번째 부모의 이름으로 가족 이름 생성
    SELECT p.full_name
    INTO first_parent_name
    FROM profiles p
    WHERE p.family_code = family_record.family_code
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
      family_record.family_code,
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

    -- 결과 저장
    INSERT INTO migration_results
    SELECT 
      f.family_code,
      f.family_name,
      f.total_members,
      f.parents_count,
      f.children_count
    FROM families f
    WHERE f.family_code = family_record.family_code;

    RAISE NOTICE '가족 마이그레이션 완료: % (구성원: %명)', 
      family_record.family_code, 
      jsonb_array_length(COALESCE(members_array, '[]'::jsonb));
  END LOOP;

  -- 결과 반환
  RETURN QUERY SELECT * FROM migration_results ORDER BY mr.family_code;
END;
$$ LANGUAGE plpgsql;

-- 2. 마이그레이션 실행
SELECT * FROM migrate_profiles_to_families();

-- 3. 마이그레이션 결과 확인
DO $$
DECLARE
  total_families integer;
  total_members integer;
  total_parents integer;
  total_children integer;
BEGIN
  SELECT 
    count(*),
    sum(total_members),
    sum(parents_count),
    sum(children_count)
  INTO total_families, total_members, total_parents, total_children
  FROM families
  WHERE is_active = true;

  RAISE NOTICE '=== 마이그레이션 완료 ===';
  RAISE NOTICE '총 가족 수: %', total_families;
  RAISE NOTICE '총 구성원 수: %', total_members;
  RAISE NOTICE '총 부모 수: %', total_parents;
  RAISE NOTICE '총 자녀 수: %', total_children;
END;
$$;

-- 4. 마이그레이션 검증 쿼리
-- 각 가족별 상세 정보 확인
SELECT 
  f.family_code,
  f.family_name,
  f.total_members,
  f.parents_count,
  f.children_count,
  f.is_active,
  f.created_at,
  -- 구성원 이름 목록
  (
    SELECT string_agg(member->>'name' || '(' || member->>'role' || ')', ', ' ORDER BY 
      CASE member->>'role' 
        WHEN 'father' THEN 1 
        WHEN 'mother' THEN 2 
        WHEN 'son' THEN 3 
        WHEN 'daughter' THEN 4 
      END
    )
    FROM jsonb_array_elements(f.members) AS member
  ) as members_list
FROM families f
WHERE f.is_active = true
ORDER BY f.created_at DESC;

-- 5. profiles와 families 데이터 일치성 검증
WITH profile_stats AS (
  SELECT 
    family_code,
    count(*) as profile_count,
    count(*) FILTER (WHERE user_type IN ('father', 'mother')) as profile_parents,
    count(*) FILTER (WHERE user_type IN ('son', 'daughter')) as profile_children
  FROM profiles
  WHERE family_code IS NOT NULL
    AND family_code != ''
    AND family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'
  GROUP BY family_code
),
family_stats AS (
  SELECT 
    family_code,
    total_members as family_count,
    parents_count as family_parents,
    children_count as family_children
  FROM families
  WHERE is_active = true
)
SELECT 
  ps.family_code,
  ps.profile_count,
  fs.family_count,
  ps.profile_count = fs.family_count as members_match,
  ps.profile_parents = fs.family_parents as parents_match,
  ps.profile_children = fs.family_children as children_match,
  CASE 
    WHEN ps.profile_count = fs.family_count 
     AND ps.profile_parents = fs.family_parents 
     AND ps.profile_children = fs.family_children 
    THEN '✅ 일치'
    ELSE '❌ 불일치'
  END as verification_status
FROM profile_stats ps
FULL OUTER JOIN family_stats fs ON ps.family_code = fs.family_code
ORDER BY ps.family_code;

-- 6. 마이그레이션 함수 정리
DROP FUNCTION IF EXISTS migrate_profiles_to_families();

-- 7. 마이그레이션 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '=== profiles → families 마이그레이션 완료 ===';
  RAISE NOTICE '- families 테이블에 기존 가족 데이터가 동기화되었습니다';
  RAISE NOTICE '- 구성원 정보는 JSONB 형태로 저장되었습니다';
  RAISE NOTICE '- 통계 정보가 자동으로 계산되었습니다';
  RAISE NOTICE '- 검증 쿼리를 통해 데이터 일치성을 확인하세요';
END;
$$;