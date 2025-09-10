-- 미션 제안 시스템을 위한 테이블 생성
-- mission_proposals 테이블 추가

-- 1. mission_proposals 테이블 생성
CREATE TABLE mission_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    mission_type VARCHAR(20) NOT NULL DEFAULT 'daily' 
        CHECK (mission_type IN ('daily', 'event')),
    difficulty INTEGER NOT NULL DEFAULT 1 
        CHECK (difficulty BETWEEN 1 AND 5),
    reward_amount INTEGER NOT NULL DEFAULT 0 
        CHECK (reward_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected')),
    proposed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_mission_proposals_child_id ON mission_proposals(child_id);
CREATE INDEX idx_mission_proposals_parent_id ON mission_proposals(parent_id);
CREATE INDEX idx_mission_proposals_status ON mission_proposals(status);
CREATE INDEX idx_mission_proposals_proposed_at ON mission_proposals(proposed_at);

-- 복합 인덱스 (부모가 자녀별 제안을 조회할 때)
CREATE INDEX idx_mission_proposals_parent_status ON mission_proposals(parent_id, status);

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE mission_proposals ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 생성

-- 자녀는 자신의 제안만 생성 가능
CREATE POLICY "Children can create own proposals" ON mission_proposals
    FOR INSERT WITH CHECK (
        auth.uid() = child_id AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND user_type = 'child'
        )
    );

-- 자녀는 자신의 제안만 조회 가능
CREATE POLICY "Children can view own proposals" ON mission_proposals
    FOR SELECT USING (
        auth.uid() = child_id AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND user_type = 'child'
        )
    );

-- 부모는 자신의 자녀들의 제안만 조회 가능
CREATE POLICY "Parents can view children proposals" ON mission_proposals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND user_type = 'parent'
        ) AND (
            -- 새로운 가족 시스템: family_members 테이블 확인
            child_id IN (
                SELECT fm.user_id 
                FROM family_members fm
                JOIN families f ON f.id = fm.family_id
                WHERE f.created_by = auth.uid() 
                AND fm.role = 'child'
                AND fm.is_active = true
            ) OR
            -- 레거시 시스템: profiles 테이블의 parent_id 확인
            child_id IN (
                SELECT id FROM profiles 
                WHERE parent_id = auth.uid() 
                AND user_type = 'child'
            )
        )
    );

-- 부모는 자신의 자녀들의 제안만 승인/거부 가능
CREATE POLICY "Parents can update children proposals" ON mission_proposals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND user_type = 'parent'
        ) AND (
            -- 새로운 가족 시스템 확인
            child_id IN (
                SELECT fm.user_id 
                FROM family_members fm
                JOIN families f ON f.id = fm.family_id
                WHERE f.created_by = auth.uid() 
                AND fm.role = 'child'
                AND fm.is_active = true
            ) OR
            -- 레거시 시스템 확인
            child_id IN (
                SELECT id FROM profiles 
                WHERE parent_id = auth.uid() 
                AND user_type = 'child'
            )
        )
    );

-- 5. updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_mission_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. updated_at 트리거 생성
CREATE TRIGGER trigger_mission_proposals_updated_at
    BEFORE UPDATE ON mission_proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_mission_proposals_updated_at();

-- 7. 테이블 코멘트 추가
COMMENT ON TABLE mission_proposals IS '자녀가 부모에게 제안하는 미션들을 관리하는 테이블';
COMMENT ON COLUMN mission_proposals.child_id IS '제안한 자녀의 ID';
COMMENT ON COLUMN mission_proposals.parent_id IS '승인할 부모의 ID';
COMMENT ON COLUMN mission_proposals.mission_type IS '미션 타입: daily(데일리 템플릿), event(이벤트 미션)';
COMMENT ON COLUMN mission_proposals.status IS '제안 상태: pending(대기), approved(승인), rejected(거부)';
COMMENT ON COLUMN mission_proposals.processed_by IS '제안을 처리한 부모의 ID';

-- 8. 마이그레이션 완료 로그
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '미션 제안 시스템 마이그레이션 완료!';
    RAISE NOTICE '- mission_proposals 테이블 생성됨';
    RAISE NOTICE '- 성능 최적화 인덱스 생성됨';
    RAISE NOTICE '- RLS 정책으로 보안 강화됨';
    RAISE NOTICE '- 자동 업데이트 트리거 설정됨';
    RAISE NOTICE '========================================';
END;
$$;