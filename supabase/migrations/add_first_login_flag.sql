-- ===================================================
-- 첫 로그인 플래그 추가 마이그레이션
-- 자녀 회원가입 시 환영 안내를 위한 필드
-- ===================================================

-- 1. profiles 테이블에 is_first_login 필드 추가
ALTER TABLE profiles 
ADD COLUMN is_first_login BOOLEAN DEFAULT true;

-- 2. 기존 사용자들은 이미 로그인한 것으로 처리
UPDATE profiles 
SET is_first_login = false 
WHERE created_at < NOW();

-- 3. 새로운 사용자만 true로 유지하도록 기본값 설정
ALTER TABLE profiles 
ALTER COLUMN is_first_login SET DEFAULT true;

-- 4. 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_first_login 
ON profiles(is_first_login) 
WHERE is_first_login = true;

-- 5. 코멘트 추가
COMMENT ON COLUMN profiles.is_first_login IS '첫 로그인 여부 - 자녀 계정의 환영 안내 표시용';

-- 6. 마이그레이션 완료 로그
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '첫 로그인 플래그 마이그레이션 완료!';
    RAISE NOTICE '- is_first_login 컬럼 추가됨';
    RAISE NOTICE '- 기존 사용자는 false로 설정됨';
    RAISE NOTICE '- 새 사용자는 true로 기본 설정됨';
    RAISE NOTICE '- 성능 최적화 인덱스 추가됨';
    RAISE NOTICE '========================================';
END;
$$;