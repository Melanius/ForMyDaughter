-- 🔐 가족 시스템을 위한 RLS 정책 업데이트
-- 새로운 가족 테이블들과 기존 테이블들의 보안 정책을 설정합니다.

-- 1. families 테이블 RLS 정책
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- 가족 조회: 해당 가족의 구성원만 조회 가능
CREATE POLICY "family_select_policy" ON families
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
      AND family_members.is_active = true
    )
  );

-- 가족 생성: 인증된 사용자만 가능
CREATE POLICY "family_insert_policy" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 가족 수정: 해당 가족의 부모(father/mother)만 가능
CREATE POLICY "family_update_policy" ON families
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('father', 'mother')
      AND family_members.is_active = true
    )
  );

-- 가족 삭제: 가족 생성자만 가능
CREATE POLICY "family_delete_policy" ON families
  FOR DELETE USING (auth.uid() = created_by);

-- 2. family_members 테이블 RLS 정책
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 구성원 조회: 같은 가족 구성원만 조회 가능
CREATE POLICY "family_members_select_policy" ON family_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
      AND fm.is_active = true
    )
  );

-- 구성원 추가: 해당 가족의 부모 또는 본인만 가능
CREATE POLICY "family_members_insert_policy" ON family_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
      AND fm.role IN ('father', 'mother')
      AND fm.is_active = true
    )
  );

-- 구성원 수정: 본인 또는 해당 가족의 부모만 가능
CREATE POLICY "family_members_update_policy" ON family_members
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
      AND fm.role IN ('father', 'mother')
      AND fm.is_active = true
    )
  );

-- 구성원 삭제: 해당 가족의 부모만 가능 (본인 제외)
CREATE POLICY "family_members_delete_policy" ON family_members
  FOR DELETE USING (
    user_id != auth.uid() AND
    EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
      AND fm.role IN ('father', 'mother')
      AND fm.is_active = true
    )
  );

-- 3. mission_templates 테이블 RLS 정책 업데이트
-- 기존 정책 제거 후 새로운 가족 기반 정책 적용

DROP POLICY IF EXISTS "mission_templates_select_policy" ON mission_templates;
DROP POLICY IF EXISTS "mission_templates_insert_policy" ON mission_templates;
DROP POLICY IF EXISTS "mission_templates_update_policy" ON mission_templates;
DROP POLICY IF EXISTS "mission_templates_delete_policy" ON mission_templates;

-- 템플릿 조회: 같은 가족 구성원만 조회 가능
CREATE POLICY "mission_templates_family_select_policy" ON mission_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2
      WHERE fm1.user_id = mission_templates.user_id
      AND fm2.user_id = auth.uid()
      AND fm1.family_id = fm2.family_id
      AND fm1.is_active = true
      AND fm2.is_active = true
    )
  );

-- 템플릿 생성: 부모(father/mother)만 가능
CREATE POLICY "mission_templates_family_insert_policy" ON mission_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.user_id = auth.uid()
      AND family_members.role IN ('father', 'mother')
      AND family_members.is_active = true
    )
  );

-- 템플릿 수정: 템플릿 생성자 또는 같은 가족의 부모만 가능
CREATE POLICY "mission_templates_family_update_policy" ON mission_templates
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2
      WHERE fm1.user_id = mission_templates.user_id
      AND fm2.user_id = auth.uid()
      AND fm1.family_id = fm2.family_id
      AND fm2.role IN ('father', 'mother')
      AND fm1.is_active = true
      AND fm2.is_active = true
    )
  );

-- 템플릿 삭제: 템플릿 생성자 또는 같은 가족의 부모만 가능
CREATE POLICY "mission_templates_family_delete_policy" ON mission_templates
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2
      WHERE fm1.user_id = mission_templates.user_id
      AND fm2.user_id = auth.uid()
      AND fm1.family_id = fm2.family_id
      AND fm2.role IN ('father', 'mother')
      AND fm1.is_active = true
      AND fm2.is_active = true
    )
  );

-- 4. mission_instances 테이블 RLS 정책 업데이트
DROP POLICY IF EXISTS "mission_instances_select_policy" ON mission_instances;
DROP POLICY IF EXISTS "mission_instances_insert_policy" ON mission_instances;
DROP POLICY IF EXISTS "mission_instances_update_policy" ON mission_instances;
DROP POLICY IF EXISTS "mission_instances_delete_policy" ON mission_instances;

-- 미션 인스턴스 조회: 같은 가족 구성원만 조회 가능
CREATE POLICY "mission_instances_family_select_policy" ON mission_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2
      WHERE fm1.user_id = mission_instances.user_id
      AND fm2.user_id = auth.uid()
      AND fm1.family_id = fm2.family_id
      AND fm1.is_active = true
      AND fm2.is_active = true
    )
  );

-- 미션 인스턴스 생성: 부모(father/mother) 또는 해당 미션의 대상 자녀만 가능
CREATE POLICY "mission_instances_family_insert_policy" ON mission_instances
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2
      WHERE fm1.user_id = mission_instances.user_id
      AND fm2.user_id = auth.uid()
      AND fm1.family_id = fm2.family_id
      AND fm2.role IN ('father', 'mother')
      AND fm1.is_active = true
      AND fm2.is_active = true
    )
  );

-- 미션 인스턴스 수정: 해당 미션의 주인 또는 같은 가족의 부모만 가능
CREATE POLICY "mission_instances_family_update_policy" ON mission_instances
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2
      WHERE fm1.user_id = mission_instances.user_id
      AND fm2.user_id = auth.uid()
      AND fm1.family_id = fm2.family_id
      AND fm2.role IN ('father', 'mother')
      AND fm1.is_active = true
      AND fm2.is_active = true
    )
  );

-- 미션 인스턴스 삭제: 부모만 가능
CREATE POLICY "mission_instances_family_delete_policy" ON mission_instances
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2
      WHERE fm1.user_id = mission_instances.user_id
      AND fm2.user_id = auth.uid()
      AND fm1.family_id = fm2.family_id
      AND fm2.role IN ('father', 'mother')
      AND fm1.is_active = true
      AND fm2.is_active = true
    )
  );

-- 5. 가족 기반 권한 확인 함수 (저장 프로시저)
CREATE OR REPLACE FUNCTION is_family_parent(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members fm1, family_members fm2
    WHERE fm1.user_id = target_user_id
    AND fm2.user_id = auth.uid()
    AND fm1.family_id = fm2.family_id
    AND fm2.role IN ('father', 'mother')
    AND fm1.is_active = true
    AND fm2.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_same_family(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members fm1, family_members fm2
    WHERE fm1.user_id = target_user_id
    AND fm2.user_id = auth.uid()
    AND fm1.family_id = fm2.family_id
    AND fm1.is_active = true
    AND fm2.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_family_members_family_user 
  ON family_members(family_id, user_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_family_members_user_active 
  ON family_members(user_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_family_members_role 
  ON family_members(family_id, role) 
  WHERE is_active = true;

-- 7. 기존 테이블의 가족 코드 기반 정책 비활성화 (점진적 전환용)
-- 추후 완전히 마이그레이션 완료 후 제거 예정

COMMENT ON TABLE families IS '가족 정보 테이블 - 새로운 가족 시스템의 핵심';
COMMENT ON TABLE family_members IS '가족 구성원 관계 테이블 - M:N 관계 지원';
COMMENT ON COLUMN family_members.role IS '가족 내 역할: father, mother, child';
COMMENT ON COLUMN family_members.is_active IS '활성 상태: false시 가족에서 제외된 상태';