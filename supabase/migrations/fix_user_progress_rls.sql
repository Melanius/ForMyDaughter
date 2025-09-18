-- user_progress 테이블 RLS 정책 수정
-- 가족 단위 접근 허용 및 시스템 업데이트 허용
-- 생성일: 2025-09-17

-- 기존 정책 제거
DROP POLICY IF EXISTS "Users can manage own progress" ON user_progress;

-- 새로운 정책 생성: 가족 구성원 및 본인 접근 허용
CREATE POLICY "Family members can manage progress" ON user_progress
    FOR ALL USING (
        -- 본인의 진행상황
        auth.uid() = user_id
        OR 
        -- 같은 가족 구성원의 진행상황 (가족 코드 기준)
        (
            SELECT family_code FROM profiles WHERE id = auth.uid()
        ) = (
            SELECT family_code FROM profiles WHERE id = user_progress.user_id
        )
        OR
        -- 부모가 자녀의 진행상황 관리
        user_id IN (
            SELECT id FROM profiles 
            WHERE parent_id = auth.uid()
        )
    );

-- reward_history 테이블도 같은 방식으로 수정
DROP POLICY IF EXISTS "Users can view own reward history" ON reward_history;

CREATE POLICY "Family members can view reward history" ON reward_history
    FOR ALL USING (
        -- 본인의 보상 내역
        auth.uid() = user_id
        OR 
        -- 같은 가족 구성원의 보상 내역
        (
            SELECT family_code FROM profiles WHERE id = auth.uid()
        ) = (
            SELECT family_code FROM profiles WHERE id = reward_history.user_id
        )
        OR
        -- 부모가 자녀의 보상 내역 확인
        user_id IN (
            SELECT id FROM profiles 
            WHERE parent_id = auth.uid()
        )
    );

-- reward_settings 테이블도 가족 단위 접근 허용
DROP POLICY IF EXISTS "Users can manage own reward settings" ON reward_settings;

CREATE POLICY "Family members can manage reward settings" ON reward_settings
    FOR ALL USING (
        -- 본인의 설정
        auth.uid() = user_id
        OR 
        -- 같은 가족 구성원의 설정 (부모만 수정 가능하도록 제한)
        (
            (SELECT family_code FROM profiles WHERE id = auth.uid()) = 
            (SELECT family_code FROM profiles WHERE id = reward_settings.user_id)
            AND 
            (SELECT user_type FROM profiles WHERE id = auth.uid()) IN ('father', 'mother')
        )
        OR
        -- 부모가 자녀의 설정 관리
        user_id IN (
            SELECT id FROM profiles 
            WHERE parent_id = auth.uid()
        )
    );

-- 정책 검증을 위한 코멘트 추가
COMMENT ON POLICY "Family members can manage progress" ON user_progress IS 
'가족 구성원들이 서로의 진행상황을 확인하고 관리할 수 있도록 허용. 연속 완료 시스템의 정상 작동을 위해 필요.';

COMMENT ON POLICY "Family members can view reward history" ON reward_history IS 
'가족 구성원들이 서로의 보상 내역을 확인할 수 있도록 허용. 투명한 가족 용돈 관리를 위해 필요.';

COMMENT ON POLICY "Family members can manage reward settings" ON reward_settings IS 
'가족 내에서 부모가 자녀의 보상 설정을 관리할 수 있도록 허용. 부모의 자녀 교육 권한 반영.';