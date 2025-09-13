-- 가족 메시지 필드 추가 마이그레이션
-- 가족이 함께 볼 수 있는 메시지/상태 메시지 기능

-- 1. families 테이블에 family_message 컬럼 추가
ALTER TABLE families 
ADD COLUMN family_message TEXT;

-- 2. 컬럼 설명 추가
COMMENT ON COLUMN families.family_message IS '가족 메시지 또는 상태 메시지 (예: 우리 가족 화이팅!, 이번 주 목표: 용돈 10만원 모으기)';

-- 3. 기본값 설정 (기존 가족들에게)
UPDATE families 
SET family_message = '우리 가족 화이팅! 💕'
WHERE family_message IS NULL;

-- 마이그레이션 완료 확인
SELECT 
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'families'
  AND column_name = 'family_message';