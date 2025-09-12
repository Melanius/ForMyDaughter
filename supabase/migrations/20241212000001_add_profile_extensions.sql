-- 프로필 테이블에 확장 필드 추가
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS message_to_family TEXT,
ADD COLUMN IF NOT EXISTS hobbies TEXT[],
ADD COLUMN IF NOT EXISTS favorite_food TEXT;

-- 가족 이벤트 테이블 생성
CREATE TABLE IF NOT EXISTS family_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'custom' CHECK (event_type IN ('birthday', 'anniversary', 'custom')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_family_events_family_id ON family_events(family_id);
CREATE INDEX IF NOT EXISTS idx_family_events_date ON family_events(event_date);

-- RLS 정책
ALTER TABLE family_events ENABLE ROW LEVEL SECURITY;

-- 가족 구성원만 해당 가족의 이벤트를 볼 수 있음
CREATE POLICY "Family members can view family events" ON family_events
FOR SELECT USING (
  family_id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 가족 구성원은 이벤트를 추가할 수 있음
CREATE POLICY "Family members can insert family events" ON family_events
FOR INSERT WITH CHECK (
  family_id IN (
    SELECT family_id FROM family_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
  AND created_by = auth.uid()
);

-- 이벤트 생성자만 수정/삭제 가능
CREATE POLICY "Event creators can update their events" ON family_events
FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Event creators can delete their events" ON family_events
FOR DELETE USING (created_by = auth.uid());

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_family_events_updated_at 
BEFORE UPDATE ON family_events 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();