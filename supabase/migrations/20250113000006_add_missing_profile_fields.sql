-- 프로필 테이블에 누락된 필드 추가
-- 개인정보 수정 기능에 필요한 필드들

-- 1. 누락된 필드들 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname VARCHAR(30),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. bio 필드 길이 제한 (200자) - 기존 제약조건 확인 후 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_bio_length_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_bio_length_check 
        CHECK (length(bio) <= 200);
    END IF;
END $$;

-- 3. 휴대전화 번호 형식 검증 (선택사항, 애플리케이션에서 처리하므로 생략)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM information_schema.table_constraints 
--         WHERE constraint_name = 'profiles_phone_format_check'
--     ) THEN
--         ALTER TABLE profiles ADD CONSTRAINT profiles_phone_format_check 
--         CHECK (phone IS NULL OR phone ~ '^01[0-9]-?\\d{4}-?\\d{4}$');
--     END IF;
-- END $$;

-- 4. nickname 길이 제한 (30자)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_nickname_length_check'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_nickname_length_check 
        CHECK (length(nickname) <= 30);
    END IF;
END $$;

-- 5. 확인 메시지
DO $$
BEGIN
    RAISE NOTICE '✅ 프로필 테이블에 누락된 필드들이 추가되었습니다.';
    RAISE NOTICE '   - nickname: 닉네임 (30자 제한)';
    RAISE NOTICE '   - phone: 휴대전화 번호';  
    RAISE NOTICE '   - bio: 가족에게 하고싶은말 (200자 제한)';
    RAISE NOTICE '✅ 이제 개인정보 수정 기능이 정상적으로 작동합니다.';
END;
$$;

-- 6. 테이블 구조 확인
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('nickname', 'phone', 'bio', 'birthday')
ORDER BY column_name;