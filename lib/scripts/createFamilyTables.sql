-- 🏠 가족 시스템 테이블 생성 스크립트
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

-- 1. families 테이블 생성
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code TEXT UNIQUE NOT NULL,
  family_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. family_members 테이블 생성  
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('father', 'mother', 'child')),
  nickname TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(family_id, user_id)
);

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_families_family_code ON families(family_code);
CREATE INDEX IF NOT EXISTS idx_families_created_by ON families(created_by);

CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family_user ON family_members(family_id, user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(family_id, role) WHERE is_active = true;

-- 4. RLS 활성화
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 5. 기본 RLS 정책 (테스트용 - 나중에 더 강화된 정책으로 교체)
CREATE POLICY "families_all_access" ON families FOR ALL USING (true);
CREATE POLICY "family_members_all_access" ON family_members FOR ALL USING (true);

-- 6. 테이블 설명 추가
COMMENT ON TABLE families IS '가족 정보 테이블 - 새로운 가족 시스템의 핵심';
COMMENT ON COLUMN families.family_code IS '고유 가족 코드 (예: FAM123ABC)';
COMMENT ON COLUMN families.family_name IS '가족명 (예: 김씨네 가족)';

COMMENT ON TABLE family_members IS '가족 구성원 관계 테이블 - M:N 관계 지원';
COMMENT ON COLUMN family_members.role IS '가족 내 역할: father, mother, child';
COMMENT ON COLUMN family_members.nickname IS '가족 내 별명';
COMMENT ON COLUMN family_members.is_active IS '활성 상태: false시 가족에서 제외된 상태';

-- 7. 테이블 생성 확인 쿼리
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('families', 'family_members')
ORDER BY table_name, ordinal_position;