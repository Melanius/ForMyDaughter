-- =============================================
-- 관리자용 families 테이블 생성
-- =============================================
-- 
-- 목적: 관리자가 가족 단위로 통계와 모니터링을 할 수 있는 테이블
-- 구조: family_code별로 하나의 레코드, 구성원 정보는 JSONB로 저장
--

-- 1. 관리자용 families 테이블 생성
CREATE TABLE IF NOT EXISTS families (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  family_code text NOT NULL UNIQUE,
  family_name text NOT NULL,
  
  -- 구성원 정보 (JSONB 형태로 저장)
  members jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- 통계 정보
  total_members integer NOT NULL DEFAULT 0,
  parents_count integer NOT NULL DEFAULT 0,
  children_count integer NOT NULL DEFAULT 0,
  
  -- 가족 상태
  is_active boolean NOT NULL DEFAULT true,
  last_activity_at timestamptz,
  
  -- 메타데이터
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- 제약 조건
  CONSTRAINT families_family_code_check CHECK (family_code ~ '^FAM[0-9]{3}[A-Z]{3}$'),
  CONSTRAINT families_members_count_check CHECK (total_members = parents_count + children_count),
  CONSTRAINT families_valid_counts_check CHECK (
    total_members >= 0 AND 
    parents_count >= 0 AND 
    children_count >= 0
  )
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_families_family_code ON families(family_code);
CREATE INDEX IF NOT EXISTS idx_families_is_active ON families(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_families_last_activity ON families(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_families_total_members ON families(total_members);

-- 3. JSONB 인덱스 (구성원 검색용)
CREATE INDEX IF NOT EXISTS idx_families_members_gin ON families USING gin(members);

-- 4. RLS 활성화 (관리자만 접근 가능)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- 관리자 전용 정책 (추후 관리자 역할 구현 시 수정)
CREATE POLICY "families_admin_only" ON families FOR ALL USING (false);

-- 5. updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_families_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. updated_at 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_families_updated_at ON families;
CREATE TRIGGER trigger_update_families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW
  EXECUTE FUNCTION update_families_updated_at();

-- 7. 구성원 수 자동 계산 트리거 함수
CREATE OR REPLACE FUNCTION calculate_families_member_counts()
RETURNS trigger AS $$
DECLARE
  member_count integer;
  parent_count integer;
  child_count integer;
BEGIN
  -- members JSONB에서 카운트 계산
  SELECT 
    jsonb_array_length(NEW.members),
    (SELECT count(*) FROM jsonb_array_elements(NEW.members) AS member 
     WHERE member->>'role' IN ('father', 'mother')),
    (SELECT count(*) FROM jsonb_array_elements(NEW.members) AS member 
     WHERE member->>'role' IN ('son', 'daughter'))
  INTO member_count, parent_count, child_count;
  
  -- 계산된 값 설정
  NEW.total_members = COALESCE(member_count, 0);
  NEW.parents_count = COALESCE(parent_count, 0);
  NEW.children_count = COALESCE(child_count, 0);
  
  -- 활동 시간 업데이트
  NEW.last_activity_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 구성원 수 계산 트리거 생성
DROP TRIGGER IF EXISTS trigger_calculate_families_member_counts ON families;
CREATE TRIGGER trigger_calculate_families_member_counts
  BEFORE INSERT OR UPDATE ON families
  FOR EACH ROW
  EXECUTE FUNCTION calculate_families_member_counts();

-- 9. 테이블 및 컬럼 설명 추가
COMMENT ON TABLE families IS '관리자용 가족 통계 및 모니터링 테이블';
COMMENT ON COLUMN families.family_code IS '가족 코드 (FAM123ABC 형태)';
COMMENT ON COLUMN families.family_name IS '가족 이름 (예: 김철수님의 가족)';
COMMENT ON COLUMN families.members IS '구성원 정보 JSONB 배열 [{user_id, name, role, joined_at}, ...]';
COMMENT ON COLUMN families.total_members IS '총 구성원 수 (자동 계산)';
COMMENT ON COLUMN families.parents_count IS '부모 수 (자동 계산)';
COMMENT ON COLUMN families.children_count IS '자녀 수 (자동 계산)';
COMMENT ON COLUMN families.is_active IS '가족 활성 상태';
COMMENT ON COLUMN families.last_activity_at IS '마지막 활동 시간 (자동 업데이트)';

-- 10. 초기 데이터 확인 쿼리 (참고용)
/*
-- families 테이블 데이터 조회 예시
SELECT 
  family_code,
  family_name,
  total_members,
  parents_count,
  children_count,
  jsonb_pretty(members) as members_info,
  is_active,
  last_activity_at,
  created_at
FROM families
ORDER BY created_at DESC;

-- 구성원별 상세 정보 조회 예시
SELECT 
  f.family_code,
  f.family_name,
  member->>'name' as member_name,
  member->>'role' as member_role,
  member->>'user_id' as user_id,
  (member->>'joined_at')::timestamptz as joined_at
FROM families f,
     jsonb_array_elements(f.members) as member
WHERE f.is_active = true
ORDER BY f.family_code, 
         CASE member->>'role' 
           WHEN 'father' THEN 1 
           WHEN 'mother' THEN 2 
           WHEN 'son' THEN 3 
           WHEN 'daughter' THEN 4 
         END;
*/