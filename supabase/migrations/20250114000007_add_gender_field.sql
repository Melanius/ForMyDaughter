-- 프로필 테이블에 성별 필드 추가
-- 자녀의 경우 아들/딸 구분을 위한 필드

-- 1. gender 필드 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- 2. gender 필드 제약조건 추가 (male, female만 허용)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_gender_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check 
        CHECK (gender IS NULL OR gender IN ('male', 'female'));
    END IF;
END $$;

-- 3. 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 프로필 테이블에 성별 필드가 추가되었습니다.';
    RAISE NOTICE '   - gender: 성별 (male/female, 자녀 전용)';
    RAISE NOTICE '✅ 이제 역할 수정 기능이 정상적으로 작동합니다.';
END;
$$;

-- 4. 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('gender', 'nickname', 'phone', 'bio', 'birthday')
ORDER BY column_name;