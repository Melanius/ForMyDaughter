-- =============================================
-- 수정된 수동 동기화 함수
-- =============================================

-- 수동 동기화 함수 (LIMIT 문제 해결)
CREATE OR REPLACE FUNCTION manual_sync_all_families()
RETURNS integer AS $$
DECLARE
  sync_count integer := 0;
  family_code_record text;
  profile_id_to_update uuid;
BEGIN
  -- 모든 고유한 family_code에 대해 동기화 실행
  FOR family_code_record IN
    SELECT DISTINCT family_code
    FROM profiles
    WHERE family_code IS NOT NULL
      AND family_code != ''
      AND family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'
  LOOP
    -- 해당 family_code의 첫 번째 profile ID 가져오기
    SELECT id INTO profile_id_to_update
    FROM profiles
    WHERE family_code = family_code_record
    ORDER BY created_at
    LIMIT 1;
    
    -- 더미 트리거 실행을 위한 UPDATE (특정 ID로)
    IF profile_id_to_update IS NOT NULL THEN
      UPDATE profiles
      SET updated_at = updated_at
      WHERE id = profile_id_to_update;
    END IF;

    sync_count := sync_count + 1;
  END LOOP;

  RETURN sync_count;
END;
$$ LANGUAGE plpgsql;

-- 또는 더 간단한 버전 (트리거 없이 직접 동기화)
CREATE OR REPLACE FUNCTION manual_sync_all_families_direct()
RETURNS integer AS $$
DECLARE
  sync_count integer := 0;
  family_rec record;
  members_array jsonb;
  first_parent_name text;
  family_display_name text;
BEGIN
  -- 모든 고유한 family_code에 대해 직접 동기화
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

    -- 가족 이름 설정
    family_display_name := COALESCE(first_parent_name || '님의 가족', '가족');

    -- families 테이블 업데이트
    UPDATE families 
    SET 
      family_name = family_display_name,
      members = COALESCE(members_array, '[]'::jsonb),
      last_activity_at = now(),
      updated_at = now()
    WHERE family_code = family_rec.family_code;

    sync_count := sync_count + 1;
  END LOOP;

  RETURN sync_count;
END;
$$ LANGUAGE plpgsql;