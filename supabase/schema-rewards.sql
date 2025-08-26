-- MoneySeed 보상 시스템 확장 스키마
-- 연속 완료 보너스 및 레벨업 시스템

-- 1. 보상 설정 테이블
CREATE TABLE reward_settings (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  
  -- 연속 완료 보너스 설정
  streak_target INTEGER DEFAULT 7, -- 목표 연속일
  streak_bonus INTEGER DEFAULT 1000, -- 보너스 금액
  streak_repeat BOOLEAN DEFAULT true, -- 반복 보상 여부
  streak_enabled BOOLEAN DEFAULT true, -- 활성화 여부
  
  -- 레벨업 시스템 (향후 확장용)
  level_bonus INTEGER DEFAULT 100, -- 레벨당 기본 보너스
  level_enabled BOOLEAN DEFAULT false, -- 레벨업 시스템 활성화
  exp_multiplier DECIMAL DEFAULT 1.0, -- 경험치 배율
  
  -- 캐릭터 설정 (향후 확장용)
  character_theme TEXT DEFAULT 'plant',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 사용자 진행 상황 테이블
CREATE TABLE user_progress (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  
  -- 레벨 시스템 (향후 확장용)
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  
  -- 연속 완료 카운터
  streak_count INTEGER DEFAULT 0, -- 현재 연속일
  last_completion_date DATE, -- 마지막 완료일
  best_streak INTEGER DEFAULT 0, -- 최고 연속 기록
  
  -- 통계
  total_missions_completed INTEGER DEFAULT 0,
  total_streak_bonus_earned INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 보상 내역 테이블
CREATE TABLE reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  
  reward_type TEXT CHECK (reward_type IN ('streak_bonus', 'level_bonus', 'special_bonus')) NOT NULL,
  amount INTEGER NOT NULL,
  trigger_value INTEGER, -- 연속일수 또는 레벨
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_reward_settings_user ON reward_settings(user_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_reward_history_user_date ON reward_history(user_id, created_at);

-- RLS 정책
ALTER TABLE reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;

-- 사용자 자신의 설정만 접근 가능
CREATE POLICY "Users can manage own reward settings" ON reward_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON user_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reward history" ON reward_history
    FOR SELECT USING (auth.uid() = user_id);

-- 부모는 자녀의 설정 및 진행상황 접근 가능 (향후 구현)
-- CREATE POLICY "Parents can manage children settings" ON reward_settings
--     FOR ALL USING (
--         user_id IN (
--             SELECT id FROM profiles WHERE parent_id = auth.uid()
--         )
--     );

-- 트리거: updated_at 자동 업데이트
CREATE TRIGGER update_reward_settings_updated_at 
    BEFORE UPDATE ON reward_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at 
    BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();