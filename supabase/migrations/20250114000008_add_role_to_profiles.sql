-- profiles 테이블에 role 컬럼 추가
-- 역할 수정 기능을 위한 필드 추가

-- 1. role 컬럼 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(10);

-- 2. role 제약조건 추가 (father, mother, child만 허용)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('father', 'mother', 'child') OR role IS NULL);
    END IF;
END $$;

-- 3. 기존 데이터를 user_type 기반으로 role 초기화
UPDATE profiles 
SET role = CASE 
    WHEN user_type = 'parent' THEN 'father'  -- 기본값으로 father 설정
    WHEN user_type = 'child' THEN 'child'
    ELSE 'child'
END 
WHERE role IS NULL;

-- 4. 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ profiles 테이블에 role 컬럼이 추가되었습니다.';
    RAISE NOTICE '   - role: 역할 (father/mother/child)';
    RAISE NOTICE '   - 기존 parent → father, child → child로 초기화됨';
    RAISE NOTICE '✅ 이제 역할 수정 기능이 정상적으로 작동합니다.';
END;
$$;

-- 5. 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('user_type', 'role')
ORDER BY column_name;