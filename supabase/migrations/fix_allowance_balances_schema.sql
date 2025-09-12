-- allowance_balances 테이블 스키마 수정
-- 날짜별 잔액 → 현재 잔액 구조로 변경

-- 기존 테이블 백업 (데이터가 있을 경우)
CREATE TABLE IF NOT EXISTS allowance_balances_backup AS 
SELECT * FROM allowance_balances;

-- 기존 테이블 삭제
DROP TABLE IF EXISTS allowance_balances CASCADE;

-- 새로운 allowance_balances 테이블 생성 (current_balance 구조)
CREATE TABLE allowance_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  current_balance INTEGER DEFAULT 0 NOT NULL,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_allowance_balances_user ON allowance_balances(user_id);

-- RLS 활성화
ALTER TABLE allowance_balances ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
-- 사용자는 자신의 잔액 관리 가능
CREATE POLICY "Users can manage own balances" ON allowance_balances
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 잔액 조회 가능
CREATE POLICY "Parents can view children balances" ON allowance_balances
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles WHERE parent_id = auth.uid()
        )
    );

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_allowance_balances_updated_at ON allowance_balances;
CREATE TRIGGER update_allowance_balances_updated_at 
    BEFORE UPDATE ON allowance_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 테이블 코멘트
COMMENT ON TABLE allowance_balances IS '사용자별 현재 잔액 관리 테이블';
COMMENT ON COLUMN allowance_balances.current_balance IS '현재 잔액 (원)';
COMMENT ON COLUMN allowance_balances.last_transaction_at IS '마지막 거래 시점';