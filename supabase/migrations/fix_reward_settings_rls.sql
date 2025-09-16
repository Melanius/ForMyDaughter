-- =============================================
-- reward_settings 테이블 RLS 정책 수정
-- 부모가 가족 전체 설정을 관리할 수 있도록 수정
-- =============================================

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "Users can manage own reward settings" ON reward_settings;

-- 2. 새로운 가족 기반 정책 생성
-- 사용자는 자신의 설정 + 같은 가족의 설정(부모인 경우)을 관리할 수 있음
CREATE POLICY "Family based reward settings access" ON reward_settings
    FOR ALL USING (
        -- 자신의 설정에 접근
        auth.uid() = user_id
        OR
        -- 또는 부모가 같은 가족 구성원의 설정에 접근
        (
            auth.uid() IN (
                SELECT id FROM profiles 
                WHERE user_type IN ('father', 'mother')
                AND family_code = (
                    SELECT family_code FROM profiles WHERE id = user_id
                )
            )
        )
    );

-- 3. 정책 설명 추가
COMMENT ON POLICY "Family based reward settings access" ON reward_settings IS 
'부모는 같은 가족 구성원들의 연속 완료 설정을 관리할 수 있고, 모든 사용자는 자신의 설정을 볼 수 있습니다.';

-- 4. 테스트 쿼리 (참고용)
/*
-- 정책이 제대로 작동하는지 테스트
-- 1. 부모 계정으로 로그인한 상태에서:
SELECT * FROM reward_settings WHERE user_id IN (
    SELECT id FROM profiles WHERE family_code = (
        SELECT family_code FROM profiles WHERE id = auth.uid()
    )
);

-- 2. 자녀 계정으로 로그인한 상태에서:
SELECT * FROM reward_settings WHERE user_id = auth.uid();
*/