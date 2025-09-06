-- 정산 추적을 위한 컬럼 추가
-- mission_instances 테이블에 정산 관련 필드 추가

DO $$ 
BEGIN
  -- transferred_at 컬럼 추가 (정산 완료 시점)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mission_instances' AND column_name = 'transferred_at'
  ) THEN
    ALTER TABLE mission_instances 
    ADD COLUMN transferred_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- transferred_by 컬럼 추가 (정산 처리한 부모 ID)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mission_instances' AND column_name = 'transferred_by'
  ) THEN
    ALTER TABLE mission_instances 
    ADD COLUMN transferred_by UUID REFERENCES profiles(id);
  END IF;

  -- parent_note 컬럼 추가 (부모가 정산 시 남기는 메모)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mission_instances' AND column_name = 'parent_note'
  ) THEN
    ALTER TABLE mission_instances 
    ADD COLUMN parent_note TEXT;
  END IF;
END $$;

-- 정산 대기 미션 조회를 위한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_mission_instances_pending_reward 
ON mission_instances(is_completed, is_transferred, completed_at) 
WHERE is_completed = true AND is_transferred = false;

-- 사용자별 정산 대기 미션 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_mission_instances_user_pending 
ON mission_instances(user_id, is_completed, is_transferred, date) 
WHERE is_completed = true AND is_transferred = false;

-- 정산 대기 미션 조회를 위한 함수 생성
CREATE OR REPLACE FUNCTION get_pending_reward_missions(parent_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  child_name TEXT,
  title TEXT,
  description TEXT,
  reward INTEGER,
  category TEXT,
  mission_type TEXT,
  date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  days_since_completion INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.user_id,
    p.full_name as child_name,
    mi.title,
    mi.description,
    mi.reward,
    mi.category,
    mi.mission_type,
    mi.date,
    mi.completed_at,
    (EXTRACT(EPOCH FROM (NOW() - mi.completed_at)) / 86400)::INTEGER as days_since_completion
  FROM mission_instances mi
  JOIN profiles p ON mi.user_id = p.id
  WHERE mi.is_completed = true 
    AND mi.is_transferred = false
    AND p.parent_id = parent_user_id
  ORDER BY mi.completed_at ASC;
END;
$$;

-- 일괄 정산 처리를 위한 함수 생성
CREATE OR REPLACE FUNCTION process_batch_reward(
  mission_ids UUID[],
  parent_user_id UUID,
  parent_note_text TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  mission_record RECORD;
  total_amount INTEGER := 0;
  processed_count INTEGER := 0;
  result JSON;
BEGIN
  -- 트랜잭션 시작
  BEGIN
    -- 각 미션을 순회하며 정산 처리
    FOR mission_record IN 
      SELECT mi.*, p.full_name as child_name
      FROM mission_instances mi
      JOIN profiles p ON mi.user_id = p.id
      WHERE mi.id = ANY(mission_ids)
        AND mi.is_completed = true 
        AND mi.is_transferred = false
        AND p.parent_id = parent_user_id
    LOOP
      -- 미션을 정산 완료로 업데이트
      UPDATE mission_instances 
      SET 
        is_transferred = true,
        transferred_at = NOW(),
        transferred_by = parent_user_id,
        parent_note = parent_note_text
      WHERE id = mission_record.id;

      -- 용돈 거래 내역 추가
      INSERT INTO allowance_transactions (
        user_id,
        date,
        amount,
        type,
        category,
        description,
        created_at
      ) VALUES (
        mission_record.user_id,
        mission_record.date,
        mission_record.reward,
        'income',
        '미션완료',
        mission_record.title || ' 미션 완료 보상',
        NOW()
      );

      total_amount := total_amount + mission_record.reward;
      processed_count := processed_count + 1;
    END LOOP;

    -- 결과 반환
    result := json_build_object(
      'success', true,
      'processed_count', processed_count,
      'total_amount', total_amount,
      'message', processed_count || '개 미션 정산 완료: ' || total_amount || '원 전달'
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    -- 오류 발생시 롤백
    RAISE EXCEPTION '정산 처리 중 오류 발생: %', SQLERRM;
  END;
END;
$$;

-- RLS 정책 업데이트 (정산 관련 필드 접근 권한)
-- mission_instances 테이블의 기존 정책이 새 컬럼들도 커버하도록 확인
-- (기존 RLS 정책들이 이미 적절히 설정되어 있다고 가정)

-- 정산 통계를 위한 뷰 생성
CREATE OR REPLACE VIEW pending_reward_summary AS
SELECT 
  p.parent_id,
  COUNT(*) as pending_count,
  SUM(mi.reward) as total_pending_amount,
  MAX(mi.completed_at) as latest_completion,
  MIN(mi.completed_at) as oldest_completion
FROM mission_instances mi
JOIN profiles p ON mi.user_id = p.id
WHERE mi.is_completed = true 
  AND mi.is_transferred = false
  AND p.parent_id IS NOT NULL
GROUP BY p.parent_id;

COMMENT ON TABLE mission_instances IS '미션 인스턴스 - 정산 추적 필드 포함';
COMMENT ON COLUMN mission_instances.transferred_at IS '정산 완료 시점';
COMMENT ON COLUMN mission_instances.transferred_by IS '정산 처리한 부모 사용자 ID';
COMMENT ON COLUMN mission_instances.parent_note IS '부모가 정산 시 남기는 메모';