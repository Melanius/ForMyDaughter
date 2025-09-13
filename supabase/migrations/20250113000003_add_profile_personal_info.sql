-- 개인정보 필드 추가 마이그레이션
-- 생일, 휴대전화, 닉네임, 하고싶은말 컬럼 추가

-- 1. profiles 테이블에 개인정보 컬럼들 추가
ALTER TABLE profiles 
ADD COLUMN birthday DATE,           -- 생일
ADD COLUMN phone TEXT,              -- 휴대전화번호  
ADD COLUMN nickname TEXT,           -- 닉네임/별명
ADD COLUMN bio TEXT;                -- 하고싶은말/자기소개

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN profiles.birthday IS '생일 (YYYY-MM-DD 형식)';
COMMENT ON COLUMN profiles.phone IS '휴대전화번호 (예: 010-1234-5678)';
COMMENT ON COLUMN profiles.nickname IS '닉네임 또는 별명';
COMMENT ON COLUMN profiles.bio IS '자기소개 또는 가족에게 하고싶은말 (200자 이내)';

-- 3. 인덱스 생성 (검색 최적화)
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname) WHERE nickname IS NOT NULL;

-- 4. RLS 정책은 기존 profiles 테이블 정책을 그대로 사용

-- 마이그레이션 완료 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('birthday', 'phone', 'nickname', 'bio')
ORDER BY column_name;