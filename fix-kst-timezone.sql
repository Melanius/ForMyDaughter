-- =============================================
-- KST 시간대 수정 SQL
-- =============================================
-- 
-- 문제: Phase 2 스크립트에서 now() 사용 (UTC)
-- 해결: KST 기준 시간 함수로 변경
--

-- 1. KST 시간 함수 생성
CREATE OR REPLACE FUNCTION now_kst()
RETURNS timestamptz AS $$
BEGIN
  RETURN (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql;

-- 2. 기존 families 테이블의 UTC 시간을 KST로 수정
UPDATE families 
SET 
  created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
  updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
  last_activity_at = CASE 
    WHEN last_activity_at IS NOT NULL 
    THEN (last_activity_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul'
    ELSE NULL 
  END
WHERE created_at IS NOT NULL;

-- 3. 수정된 마이그레이션 함수 (KST 적용)
CREATE OR REPLACE FUNCTION migrate_profiles_to_families_kst()
RETURNS TABLE(
  result_family_code text,
  result_family_name text,
  result_members_count integer,
  result_parents_count integer,
  result_children_count integer
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
    current_family_code := family_record.fc;
    
    -- 해당 가족의 구성원 정보를 JSONB 배열로 구성 (KST 시간 사용)
    SELECT jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'name', p.full_name,
        'role', p.user_type,
        'joined_at', COALESCE(
          (p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul', 
          now_kst()
        ),
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

    family_display_name := COALESCE(first_parent_name || '님의 가족', '가족');

    -- families 테이블에 삽입 또는 업데이트 (KST 시간 사용)
    INSERT INTO public.families (
      family_code,
      family_name,
      members,
      is_active,
      created_at,
      updated_at,
      last_activity_at
    )
    VALUES (
      current_family_code,
      family_display_name,
      COALESCE(members_array, '[]'::jsonb),
      true,
      now_kst(),
      now_kst(),
      now_kst()
    )
    ON CONFLICT (family_code) DO UPDATE SET
      family_name = EXCLUDED.family_name,
      members = EXCLUDED.members,
      updated_at = now_kst(),
      last_activity_at = now_kst();

    -- 결과 저장
    INSERT INTO migration_results
    SELECT 
      f.family_code,
      f.family_name,
      f.total_members,
      f.parents_count,
      f.children_count
    FROM public.families f
    WHERE f.family_code = current_family_code;

    RAISE NOTICE '가족 마이그레이션 완료 (KST): % (구성원: %명)', 
      current_family_code, 
      jsonb_array_length(COALESCE(members_array, '[]'::jsonb));
  END LOOP;

  -- 결과 반환
  RETURN QUERY 
  SELECT 
    mr.family_code,
    mr.family_name,
    mr.members_count,
    mr.parents_count,
    mr.children_count
  FROM migration_results mr 
  ORDER BY mr.family_code;
END;
$$ LANGUAGE plpgsql;

-- 4. 수정된 수동 동기화 함수 (KST 적용)
CREATE OR REPLACE FUNCTION manual_sync_all_families_kst()
RETURNS integer AS $$
DECLARE
  sync_count integer := 0;
  family_rec record;
  members_array jsonb;
  first_parent_name text;
  family_display_name text;
BEGIN
  -- 모든 고유한 family_code에 대해 직접 동기화 (KST 시간 사용)
  FOR family_rec IN
    SELECT DISTINCT family_code
    FROM profiles
    WHERE family_code IS NOT NULL
      AND family_code != ''
      AND family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'
  LOOP
    -- 해당 가족의 구성원 정보를 JSONB 배열로 구성
    SELECT jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'name', p.full_name,
        'role', p.user_type,
        'joined_at', COALESCE(
          (p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul', 
          now_kst()
        ),
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
    WHERE p.family_code = family_rec.family_code
      AND p.user_type IN ('father', 'mother', 'son', 'daughter');

    -- 첫 번째 부모의 이름으로 가족 이름 생성
    SELECT p.full_name
    INTO first_parent_name
    FROM profiles p
    WHERE p.family_code = family_rec.family_code
      AND p.user_type IN ('father', 'mother')
    ORDER BY 
      CASE p.user_type WHEN 'father' THEN 1 WHEN 'mother' THEN 2 END,
      p.created_at
    LIMIT 1;

    family_display_name := COALESCE(first_parent_name || '님의 가족', '가족');

    -- families 테이블 업데이트 (KST 시간 사용)
    UPDATE families 
    SET 
      family_name = family_display_name,
      members = COALESCE(members_array, '[]'::jsonb),
      last_activity_at = now_kst(),
      updated_at = now_kst()
    WHERE family_code = family_rec.family_code;

    sync_count := sync_count + 1;
  END LOOP;

  RETURN sync_count;
END;
$$ LANGUAGE plpgsql;

-- 5. 자동 동기화 트리거 함수 수정 (KST 적용)
CREATE OR REPLACE FUNCTION sync_profiles_to_families_kst()
RETURNS trigger AS $$
DECLARE
  target_family_code text;
  family_exists boolean;
  members_array jsonb;
  first_parent_name text;
  family_display_name text;
BEGIN
  target_family_code := COALESCE(NEW.family_code, OLD.family_code);
  
  IF target_family_code IS NULL 
     OR target_family_code = '' 
     OR target_family_code !~ '^FAM[0-9]{3}[A-Z]{3}$' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT EXISTS(SELECT 1 FROM families WHERE family_code = target_family_code)
  INTO family_exists;

  -- 해당 가족의 현재 구성원 정보를 profiles에서 조회 (KST 시간 사용)
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'name', p.full_name,
      'role', p.user_type,
      'joined_at', COALESCE(
        (p.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul', 
        now_kst()
      ),
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
  WHERE p.family_code = target_family_code
    AND p.user_type IN ('father', 'mother', 'son', 'daughter');

  members_array := COALESCE(members_array, '[]'::jsonb);

  -- 첫 번째 부모의 이름으로 가족 이름 생성
  SELECT p.full_name
  INTO first_parent_name
  FROM profiles p
  WHERE p.family_code = target_family_code
    AND p.user_type IN ('father', 'mother')
  ORDER BY 
    CASE p.user_type WHEN 'father' THEN 1 WHEN 'mother' THEN 2 END,
    p.created_at
  LIMIT 1;

  family_display_name := COALESCE(first_parent_name || '님의 가족', '가족');

  -- families 테이블 업데이트 또는 삽입 (KST 시간 사용)
  IF family_exists THEN
    UPDATE families 
    SET 
      family_name = family_display_name,
      members = members_array,
      last_activity_at = now_kst(),
      updated_at = now_kst()
    WHERE family_code = target_family_code;
  ELSE
    IF jsonb_array_length(members_array) > 0 THEN
      INSERT INTO families (
        family_code,
        family_name,
        members,
        is_active,
        last_activity_at,
        created_at,
        updated_at
      )
      VALUES (
        target_family_code,
        family_display_name,
        members_array,
        true,
        now_kst(),
        now_kst(),
        now_kst()
      );
    END IF;
  END IF;

  -- 구성원이 없는 가족은 비활성화
  IF jsonb_array_length(members_array) = 0 THEN
    UPDATE families 
    SET 
      is_active = false,
      updated_at = now_kst()
    WHERE family_code = target_family_code;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 6. 기존 트리거 재생성 (KST 함수 사용)
DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_insert ON profiles;
CREATE TRIGGER trigger_sync_profiles_to_families_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profiles_to_families_kst();

DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_update ON profiles;
CREATE TRIGGER trigger_sync_profiles_to_families_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.family_code IS DISTINCT FROM NEW.family_code OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.user_type IS DISTINCT FROM NEW.user_type
  )
  EXECUTE FUNCTION sync_profiles_to_families_kst();

DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_delete ON profiles;
CREATE TRIGGER trigger_sync_profiles_to_families_delete
  AFTER DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profiles_to_families_kst();

-- 7. 검증: 현재 시간 확인
SELECT 
  now() as utc_time,
  now_kst() as kst_time,
  '현재 UTC와 KST 시간 비교' as description;

-- 8. families 테이블의 시간 검증
SELECT 
  family_code,
  family_name,
  created_at,
  updated_at,
  last_activity_at,
  '수정된 KST 시간 확인' as description
FROM families
ORDER BY updated_at DESC;