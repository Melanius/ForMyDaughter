-- 부모 계정 자동 가족 코드 생성 비활성화
-- 
-- 문제: 부모 회원가입 시 자동으로 가족 코드가 생성되어 
--      두 번째 부모가 별도 가족으로 분리되는 현상 발생
-- 
-- 해결: 트리거를 수정하여 수동으로 가족 코드를 생성하도록 변경

-- 기존 트리거 함수를 수정 (자동 가족 코드 생성 비활성화)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 🚫 부모 계정 자동 가족 코드 생성 비활성화
    -- IF NEW.user_type = 'parent' AND NEW.family_code IS NULL THEN
    --     NEW.family_code := generate_family_code();
    -- END IF;
    
    -- 📝 향후 필요 시 다른 프로필 관련 로직 추가 가능
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거는 그대로 유지 (함수만 수정)
-- CREATE TRIGGER on_profile_created는 이미 존재함

-- 새로운 가족 생성 함수 (수동 호출용)
CREATE OR REPLACE FUNCTION create_new_family(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    new_family_code TEXT;
BEGIN
    -- 가족 코드 생성
    new_family_code := generate_family_code();
    
    -- 사용자 프로필에 가족 코드 설정
    UPDATE profiles 
    SET family_code = new_family_code, updated_at = NOW()
    WHERE id = user_id;
    
    RETURN new_family_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 가족 참여 함수 (수동 호출용)
CREATE OR REPLACE FUNCTION join_existing_family(user_id UUID, family_code_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    parent_exists INTEGER;
BEGIN
    -- 해당 가족 코드를 가진 부모가 존재하는지 확인
    SELECT COUNT(*) INTO parent_exists
    FROM profiles 
    WHERE family_code = family_code_input 
    AND user_type = 'parent';
    
    IF parent_exists = 0 THEN
        RAISE EXCEPTION '유효하지 않은 가족 코드입니다.';
    END IF;
    
    -- 사용자 프로필에 가족 코드 설정
    UPDATE profiles 
    SET family_code = family_code_input, updated_at = NOW()
    WHERE id = user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;