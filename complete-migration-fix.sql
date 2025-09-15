-- =============================================
-- 완전한 마이그레이션 함수 (한 번에 실행)
-- =============================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS migrate_profiles_to_families();

-- 수정된 마이그레이션 함수 생성
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
  current_family_code text;
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
    SELECT DISTINCT p.family_code as fc
    FROM profiles p
    WHERE p.family_code IS NOT NULL
      AND p.family_code != ''
      AND p.family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'
  LOOP
    -- 변수에 family_code 저장 (컬럼명과 구분)
    current_family_code := family_record.fc;
    
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
    WHERE p.family_code = current_family_code
      AND p.user_type IN ('father', 'mother', 'son', 'daughter');

    -- 첫 번째 부모의 이름으로 가족 이름 생성
    SELECT p.full_name
    INTO first_parent_name
    FROM profiles p
    WHERE p.family_code = current_family_code
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
      current_family_code,
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
    WHERE f.family_code = current_family_code;

    RAISE NOTICE '가족 마이그레이션 완료: % (구성원: %명)', 
      current_family_code, 
      jsonb_array_length(COALESCE(members_array, '[]'::jsonb));
  END LOOP;

  -- 결과 반환
  RETURN QUERY SELECT * FROM migration_results ORDER BY migration_results.family_code;
END;
$$ LANGUAGE plpgsql;