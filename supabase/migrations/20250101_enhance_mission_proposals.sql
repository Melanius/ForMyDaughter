-- ✨ 미션 제안 시스템 개선 마이그레이션
-- 
-- 변경 사항:
-- 1. start_date 컬럼 추가 (미션 시작 날짜)
-- 2. category 컬럼 추가 (사용자 정의 카테고리)
-- 3. difficulty 기본값 설정
-- 4. 인덱스 최적화

-- 1. mission_proposals 테이블에 새 컬럼 추가
ALTER TABLE mission_proposals 
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT '제안 미션',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- 2. difficulty 컬럼 기본값 설정 (기존 NULL 값들도 업데이트)
ALTER TABLE mission_proposals 
ALTER COLUMN difficulty SET DEFAULT 1;

-- 기존 NULL 값들을 기본값으로 업데이트
UPDATE mission_proposals 
SET difficulty = 1 
WHERE difficulty IS NULL;

-- 3. 성능 최적화를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_mission_proposals_start_date 
ON mission_proposals(start_date);

CREATE INDEX IF NOT EXISTS idx_mission_proposals_category 
ON mission_proposals(category);

-- 4. 기존 데이터 정리: category가 NULL인 경우 기본값으로 설정
UPDATE mission_proposals 
SET category = '제안 미션' 
WHERE category IS NULL;

-- 5. 컬럼에 NOT NULL 제약조건 추가
ALTER TABLE mission_proposals 
ALTER COLUMN start_date SET NOT NULL,
ALTER COLUMN category SET NOT NULL;

-- 6. 주석 추가
COMMENT ON COLUMN mission_proposals.start_date IS '미션 시작 날짜 (자녀가 선택 가능)';
COMMENT ON COLUMN mission_proposals.category IS '미션 카테고리 (자녀가 선택)';
COMMENT ON COLUMN mission_proposals.difficulty IS '미션 난이도 (1-5, 기본값 1)';
COMMENT ON COLUMN mission_proposals.rejection_reason IS '미션 제안 거절 사유 (부모가 작성)';