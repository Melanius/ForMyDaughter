-- 자녀별 템플릿 분리를 위한 마이그레이션
-- mission_templates 테이블에 target_child_id 컬럼 추가

-- 1. target_child_id 컬럼 추가 (NULL 허용, 기본값은 NULL)
ALTER TABLE mission_templates 
ADD COLUMN target_child_id UUID REFERENCES profiles(id);

-- 2. target_child_id에 대한 인덱스 생성 (성능 최적화)
CREATE INDEX idx_mission_templates_target_child_id ON mission_templates(target_child_id);

-- 3. 복합 인덱스 생성 (user_id + target_child_id 조합으로 빠른 조회)
CREATE INDEX idx_mission_templates_user_target ON mission_templates(user_id, target_child_id);

-- 4. 기존 템플릿 데이터 처리를 위한 함수 생성
CREATE OR REPLACE FUNCTION migrate_existing_templates()
RETURNS void AS $$
BEGIN
    -- 기존 템플릿들은 target_child_id를 NULL로 두어 "공용 템플릿"으로 처리
    -- 이렇게 하면 모든 자녀가 공유할 수 있는 템플릿이 됨
    
    -- 로그 출력
    RAISE NOTICE '기존 템플릿들을 공용 템플릿으로 설정합니다.';
    
    -- 별도 작업 없음 - target_child_id가 NULL이면 공용 템플릿으로 처리
    -- 이는 애플리케이션 로직에서 처리됨
    
    RAISE NOTICE '마이그레이션 완료: % 개의 기존 템플릿이 공용 템플릿으로 설정됨', 
                 (SELECT COUNT(*) FROM mission_templates WHERE target_child_id IS NULL);
END;
$$ LANGUAGE plpgsql;

-- 5. 마이그레이션 함수 실행
SELECT migrate_existing_templates();

-- 6. 마이그레이션 함수 제거 (일회성 함수)
DROP FUNCTION migrate_existing_templates();

-- 7. 새로운 RLS 정책 추가 (target_child_id를 고려한 정책)

-- 기존 정책 제거
DROP POLICY IF EXISTS "Parents can view children templates" ON mission_templates;

-- 새로운 정책 생성
CREATE POLICY "Parents can view children templates" ON mission_templates
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles WHERE parent_id = auth.uid()
        ) OR 
        target_child_id IN (
            SELECT id FROM profiles WHERE parent_id = auth.uid()  
        ) OR
        target_child_id IS NULL -- 공용 템플릿
    );

-- 자녀는 자신에게 할당된 템플릿만 볼 수 있음
CREATE POLICY "Children can view assigned templates" ON mission_templates
    FOR SELECT USING (
        target_child_id = auth.uid() OR 
        (target_child_id IS NULL AND user_id IN (
            SELECT parent_id FROM profiles WHERE id = auth.uid()
        ))
    );

-- 8. 코멘트 추가
COMMENT ON COLUMN mission_templates.target_child_id IS '특정 자녀를 대상으로 하는 템플릿인 경우 해당 자녀의 ID. NULL이면 모든 자녀가 공유하는 공용 템플릿';

-- 9. 마이그레이션 완료 로그
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '자녀별 템플릿 분리 마이그레이션 완료!';
    RAISE NOTICE '- target_child_id 컬럼 추가됨';
    RAISE NOTICE '- 인덱스 생성됨';  
    RAISE NOTICE '- RLS 정책 업데이트됨';
    RAISE NOTICE '- 기존 템플릿은 공용 템플릿으로 유지됨';
    RAISE NOTICE '========================================';
END;
$$;