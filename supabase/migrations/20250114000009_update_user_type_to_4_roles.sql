-- user_type을 4가지 역할로 변경
-- 기존 parent/child → father/mother/son/daughter

-- 1. 먼저 새로운 제약조건을 위해 기존 제약조건 제거
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- 2. 기존 데이터 백업을 위한 임시 컬럼 생성
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type_backup VARCHAR(10);
UPDATE profiles SET user_type_backup = user_type WHERE user_type_backup IS NULL;

-- 3. 기존 데이터를 새로운 형식으로 변환
UPDATE profiles 
SET user_type = CASE 
    WHEN user_type = 'parent' THEN 'father'  -- 기본값으로 father 설정
    WHEN user_type = 'child' THEN 'son'      -- 기본값으로 son 설정
    ELSE user_type  -- 이미 새로운 형식인 경우 유지
END 
WHERE user_type IN ('parent', 'child');

-- 4. 새로운 제약조건 추가
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('father', 'mother', 'son', 'daughter'));

-- 5. role 컬럼 제거 (더 이상 필요 없음)
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- 6. 확인 메시지
DO $$
DECLARE
    father_count INTEGER;
    mother_count INTEGER;
    son_count INTEGER;
    daughter_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO father_count FROM profiles WHERE user_type = 'father';
    SELECT COUNT(*) INTO mother_count FROM profiles WHERE user_type = 'mother';
    SELECT COUNT(*) INTO son_count FROM profiles WHERE user_type = 'son';
    SELECT COUNT(*) INTO daughter_count FROM profiles WHERE user_type = 'daughter';
    
    RAISE NOTICE '✅ user_type이 4가지 역할로 업데이트되었습니다.';
    RAISE NOTICE '   - father: % 명', father_count;
    RAISE NOTICE '   - mother: % 명', mother_count;
    RAISE NOTICE '   - son: % 명', son_count;
    RAISE NOTICE '   - daughter: % 명', daughter_count;
    RAISE NOTICE '📝 기존 데이터는 user_type_backup 컬럼에 보관되었습니다.';
    RAISE NOTICE '✅ 시스템이 단순화되어 역할 수정 기능이 불필요해졌습니다.';
END;
$$;

-- 7. 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('user_type', 'user_type_backup')
ORDER BY column_name;