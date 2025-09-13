-- generate_family_code 함수 생성
-- 가족 코드를 생성하는 함수가 누락되어 create_new_family 함수가 실패하는 문제 해결

-- 가족 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_family_code()
RETURNS TEXT AS $$
DECLARE
    family_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- FAM + 3자리 숫자 + 3자리 랜덤 대문자 생성
        family_code := 'FAM' || 
                      LPAD((FLOOR(RANDOM() * 900) + 100)::TEXT, 3, '0') ||
                      UPPER(
                          CHR(65 + (RANDOM() * 25)::INT) ||
                          CHR(65 + (RANDOM() * 25)::INT) ||
                          CHR(65 + (RANDOM() * 25)::INT)
                      );
        
        -- 중복 확인
        SELECT EXISTS(
            SELECT 1 FROM profiles WHERE family_code = family_code
        ) INTO code_exists;
        
        -- 중복이 없으면 반환
        IF NOT code_exists THEN
            RETURN family_code;
        END IF;
        
        -- 중복이 있으면 다시 생성 (최대 100번 시도)
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 함수 테스트 및 검증
DO $$
DECLARE
    test_code TEXT;
BEGIN
    -- 함수 테스트
    test_code := generate_family_code();
    
    -- 생성된 코드가 올바른 형식인지 확인
    IF test_code ~ '^FAM[0-9]{3}[A-Z]{3}$' THEN
        RAISE NOTICE '✅ generate_family_code 함수가 정상적으로 생성되었습니다. 테스트 코드: %', test_code;
    ELSE
        RAISE EXCEPTION '❌ generate_family_code 함수가 올바르지 않은 형식의 코드를 생성했습니다: %', test_code;
    END IF;
END;
$$;

-- 마이그레이션 완료 확인
SELECT 
    proname as function_name,
    pronargs as argument_count,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'generate_family_code';