-- =============================================
-- Phase 2 Manual Migration
-- =============================================
-- 
-- 순서대로 실행하세요
--

-- 1. 먼저 새 컬럼들 추가
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS members jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_members integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parents_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS children_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- 2. 기존 데이터에 기본값 설정
UPDATE families 
SET 
  members = '[]'::jsonb,
  total_members = 0,
  parents_count = 0,
  children_count = 0,
  is_active = true,
  last_activity_at = now()
WHERE members IS NULL;

-- 3. 제약 조건 추가
ALTER TABLE families 
ADD CONSTRAINT IF NOT EXISTS families_members_count_check 
CHECK (total_members = parents_count + children_count);

ALTER TABLE families 
ADD CONSTRAINT IF NOT EXISTS families_valid_counts_check 
CHECK (
  total_members >= 0 AND 
  parents_count >= 0 AND 
  children_count >= 0
);

-- 4. 인덱스 생성 (컬럼 추가 후)
CREATE INDEX IF NOT EXISTS idx_families_family_code ON families(family_code);
CREATE INDEX IF NOT EXISTS idx_families_is_active ON families(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_families_last_activity ON families(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_families_total_members ON families(total_members);

-- 5. JSONB 인덱스 (구성원 검색용)
CREATE INDEX IF NOT EXISTS idx_families_members_gin ON families USING gin(members);