-- 부모 회원가입 시 자동 가족 코드 생성 트리거 강제 비활성화
-- 기존 트리거를 완전히 제거하고 새로운 비활성화된 트리거로 교체

-- 1. 기존 트리거 완전 제거
DROP TRIGGER IF EXISTS on_profile_created ON profiles;

-- 2. 기존 트리거 함수도 제거
DROP FUNCTION IF EXISTS handle_new_user();

-- 3. 새로운 비활성화된 트리거 함수 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- ✅ 부모 계정 자동 가족 코드 생성 완전 비활성화
    -- 이제 어떤 경우에도 자동으로 family_code를 생성하지 않음
    
    -- 📝 향후 필요 시 다른 프로필 관련 로직만 추가 가능
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 새로운 트리거 생성 (비활성화된 함수 사용)
CREATE TRIGGER on_profile_created
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 5. 혹시 기존에 자동 생성된 부모 계정의 family_code 제거
-- (부모인데 자녀가 없는 경우는 family_code를 NULL로 설정)
UPDATE profiles 
SET family_code = NULL 
WHERE user_type = 'parent' 
AND family_code IS NOT NULL 
AND id NOT IN (
    -- 자녀가 있는 부모는 제외
    SELECT DISTINCT parent_id 
    FROM profiles 
    WHERE parent_id IS NOT NULL AND user_type = 'child'
);

-- 6. 확인용 쿼리 실행
DO $$
BEGIN
    RAISE NOTICE '✅ 부모 계정 자동 가족 코드 생성 트리거가 완전히 비활성화되었습니다.';
    RAISE NOTICE '✅ 기존 불필요한 가족 코드가 정리되었습니다.';
    RAISE NOTICE '✅ 이제 부모는 회원가입 후 수동으로만 가족을 생성할 수 있습니다.';
END;
$$;

-- 7. 트리거 상태 확인
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_profile_created';

-- 8. 현재 부모 계정의 family_code 상태 확인
SELECT 
    COUNT(*) as total_parents,
    COUNT(family_code) as parents_with_family_code,
    COUNT(*) - COUNT(family_code) as parents_without_family_code
FROM profiles 
WHERE user_type = 'parent';