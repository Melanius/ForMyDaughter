-- =============================================
-- profiles와 families 테이블 자동 동기화 시스템
-- =============================================
-- 
-- 목적: profiles 테이블의 변경사항을 families 테이블에 자동으로 반영
-- 기능: INSERT, UPDATE, DELETE 시 자동 동기화
--

-- 1. 동기화 함수 생성
CREATE OR REPLACE FUNCTION sync_profiles_to_families()
RETURNS trigger AS $$
DECLARE
  target_family_code text;
  family_exists boolean;
  members_array jsonb;
  first_parent_name text;
  family_display_name text;
BEGIN
  -- INSERT/UPDATE의 경우 NEW 레코드 사용, DELETE의 경우 OLD 레코드 사용
  target_family_code := COALESCE(NEW.family_code, OLD.family_code);
  
  -- family_code가 없거나 유효하지 않으면 스킵
  IF target_family_code IS NULL 
     OR target_family_code = '' 
     OR target_family_code !~ '^FAM[0-9]{3}[A-Z]{3}$' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- families 테이블에 해당 family_code가 있는지 확인
  SELECT EXISTS(SELECT 1 FROM families WHERE family_code = target_family_code)
  INTO family_exists;

  -- 해당 가족의 현재 구성원 정보를 profiles에서 조회
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
  WHERE p.family_code = target_family_code
    AND p.user_type IN ('father', 'mother', 'son', 'daughter');

  -- 구성원이 없으면 빈 배열로 설정
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

  -- 가족 이름 설정
  family_display_name := COALESCE(first_parent_name || '님의 가족', '가족');

  -- families 테이블 업데이트 또는 삽입
  IF family_exists THEN
    -- 기존 families 레코드 업데이트
    UPDATE families 
    SET 
      family_name = family_display_name,
      members = members_array,
      last_activity_at = now(),
      updated_at = now()
    WHERE family_code = target_family_code;
  ELSE
    -- 새 families 레코드 삽입 (구성원이 있는 경우만)
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
        now(),
        now(),
        now()
      );
    END IF;
  END IF;

  -- 구성원이 없는 가족은 비활성화
  IF jsonb_array_length(members_array) = 0 THEN
    UPDATE families 
    SET 
      is_active = false,
      updated_at = now()
    WHERE family_code = target_family_code;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. profiles 테이블에 동기화 트리거 생성
DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_insert ON profiles;
CREATE TRIGGER trigger_sync_profiles_to_families_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profiles_to_families();

DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_update ON profiles;
CREATE TRIGGER trigger_sync_profiles_to_families_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    OLD.family_code IS DISTINCT FROM NEW.family_code OR
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.user_type IS DISTINCT FROM NEW.user_type
  )
  EXECUTE FUNCTION sync_profiles_to_families();

DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_delete ON profiles;
CREATE TRIGGER trigger_sync_profiles_to_families_delete
  AFTER DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profiles_to_families();

-- 3. families 테이블 활동 추적 함수
CREATE OR REPLACE FUNCTION track_family_activity()
RETURNS trigger AS $$
BEGIN
  -- 가족 활동 시간 업데이트 (families 테이블 직접 조작 시)
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. families 테이블 활동 추적 트리거
DROP TRIGGER IF EXISTS trigger_track_family_activity ON families;
CREATE TRIGGER trigger_track_family_activity
  BEFORE UPDATE ON families
  FOR EACH ROW
  EXECUTE FUNCTION track_family_activity();

-- 5. 동기화 상태 확인 함수
CREATE OR REPLACE FUNCTION check_families_sync_status()
RETURNS TABLE(
  family_code text,
  profiles_count bigint,
  families_count integer,
  sync_status text,
  last_updated timestamptz
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
      f.updated_at
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
    fc.updated_at as last_updated
  FROM profile_counts pc
  FULL OUTER JOIN family_counts fc ON pc.family_code = fc.family_code
  ORDER BY COALESCE(pc.family_code, fc.family_code);
END;
$$ LANGUAGE plpgsql;

-- 6. 수동 동기화 함수 (응급 상황용)
CREATE OR REPLACE FUNCTION manual_sync_all_families()
RETURNS integer AS $$
DECLARE
  sync_count integer := 0;
  family_code_record text;
BEGIN
  -- 모든 고유한 family_code에 대해 동기화 실행
  FOR family_code_record IN
    SELECT DISTINCT family_code
    FROM profiles
    WHERE family_code IS NOT NULL
      AND family_code != ''
      AND family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'
  LOOP
    -- 더미 트리거 실행을 위한 UPDATE
    UPDATE profiles 
    SET updated_at = updated_at 
    WHERE family_code = family_code_record 
    LIMIT 1;
    
    sync_count := sync_count + 1;
  END LOOP;

  RETURN sync_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 함수 및 트리거에 대한 설명 추가
COMMENT ON FUNCTION sync_profiles_to_families() IS 'profiles 테이블 변경 시 families 테이블 자동 동기화';
COMMENT ON FUNCTION track_family_activity() IS 'families 테이블 활동 시간 자동 추적';
COMMENT ON FUNCTION check_families_sync_status() IS 'profiles와 families 테이블 동기화 상태 확인';
COMMENT ON FUNCTION manual_sync_all_families() IS '모든 가족 데이터 수동 동기화 실행';

-- 8. 동기화 시스템 설치 완료 확인
DO $$
BEGIN
  RAISE NOTICE '=== profiles-families 자동 동기화 시스템 설치 완료 ===';
  RAISE NOTICE '✅ 동기화 트리거: profiles INSERT/UPDATE/DELETE 시 자동 실행';
  RAISE NOTICE '✅ 활동 추적: families 테이블 변경 시 last_activity_at 자동 업데이트';
  RAISE NOTICE '✅ 상태 확인: SELECT * FROM check_families_sync_status();';
  RAISE NOTICE '✅ 수동 동기화: SELECT manual_sync_all_families();';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 동기화 상태 확인 방법:';
  RAISE NOTICE '   SELECT * FROM check_families_sync_status();';
END;
$$;

-- 9. 즉시 동기화 상태 확인
SELECT * FROM check_families_sync_status();