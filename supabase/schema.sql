-- MoneySeed Database Schema
-- 사용자 프로필 테이블 (Supabase Auth 확장)

-- 1. 사용자 프로필 테이블
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  user_type TEXT CHECK (user_type IN ('parent', 'child')) NOT NULL,
  family_code TEXT, -- 가족 연결 코드 (부모가 생성)
  parent_id UUID REFERENCES profiles(id), -- 자녀의 부모 참조
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 미션 템플릿 테이블
CREATE TABLE mission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward INTEGER NOT NULL,
  category TEXT NOT NULL,
  mission_type TEXT CHECK (mission_type IN ('daily', 'event')) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 미션 인스턴스 테이블
CREATE TABLE mission_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  template_id UUID REFERENCES mission_templates(id),
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward INTEGER NOT NULL,
  category TEXT NOT NULL,
  mission_type TEXT CHECK (mission_type IN ('daily', 'event')) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  is_transferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 용돈 거래 내역 테이블
CREATE TABLE allowance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 용돈 잔액 테이블 (일별 스냅샷)
CREATE TABLE allowance_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  balance INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 6. 가족 연결 요청 테이블
CREATE TABLE family_connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) NOT NULL,
  child_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성
CREATE INDEX idx_profiles_family_code ON profiles(family_code);
CREATE INDEX idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX idx_mission_templates_user_id ON mission_templates(user_id);
CREATE INDEX idx_mission_templates_active ON mission_templates(user_id, is_active);
CREATE INDEX idx_mission_instances_user_id ON mission_instances(user_id);
CREATE INDEX idx_mission_instances_date ON mission_instances(user_id, date);
CREATE INDEX idx_mission_instances_template ON mission_instances(template_id);
CREATE INDEX idx_allowance_transactions_user_id ON allowance_transactions(user_id);
CREATE INDEX idx_allowance_transactions_date ON allowance_transactions(user_id, date);
CREATE INDEX idx_allowance_balances_user_date ON allowance_balances(user_id, date);
CREATE INDEX idx_family_requests_parent ON family_connection_requests(parent_id, status);
CREATE INDEX idx_family_requests_child ON family_connection_requests(child_id, status);

-- Row Level Security (RLS) 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allowance_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성

-- 1. Profiles 정책
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 부모는 자녀 프로필 조회 가능
CREATE POLICY "Parents can view children profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT parent_id FROM profiles WHERE id = profiles.id
        )
    );

-- 2. Mission Templates 정책
CREATE POLICY "Users can manage own templates" ON mission_templates
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 템플릿 조회 가능
CREATE POLICY "Parents can view children templates" ON mission_templates
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles WHERE parent_id = auth.uid()
        )
    );

-- 3. Mission Instances 정책
CREATE POLICY "Users can manage own instances" ON mission_instances
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 미션 조회 및 관리 가능
CREATE POLICY "Parents can manage children instances" ON mission_instances
    FOR ALL USING (
        user_id IN (
            SELECT id FROM profiles WHERE parent_id = auth.uid()
        )
    );

-- 4. Allowance Transactions 정책
CREATE POLICY "Users can manage own transactions" ON allowance_transactions
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 거래 내역 조회 가능
CREATE POLICY "Parents can view children transactions" ON allowance_transactions
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles WHERE parent_id = auth.uid()
        )
    );

-- 5. Allowance Balances 정책
CREATE POLICY "Users can manage own balances" ON allowance_balances
    FOR ALL USING (auth.uid() = user_id);

-- 부모는 자녀 잔액 조회 가능
CREATE POLICY "Parents can view children balances" ON allowance_balances
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM profiles WHERE parent_id = auth.uid()
        )
    );

-- 6. Family Connection Requests 정책
CREATE POLICY "Users can view own connection requests" ON family_connection_requests
    FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = child_id);

CREATE POLICY "Children can create connection requests" ON family_connection_requests
    FOR INSERT WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Parents can update connection requests" ON family_connection_requests
    FOR UPDATE USING (auth.uid() = parent_id);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mission_templates_updated_at BEFORE UPDATE ON mission_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 함수: 가족 코드 생성
CREATE OR REPLACE FUNCTION generate_family_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        -- FAMILY_랜덤6자리 형태로 생성
        code := 'FAMILY_' || upper(substr(md5(random()::text), 1, 6));
        
        -- 중복 확인
        SELECT COUNT(*) INTO exists_check FROM profiles WHERE family_code = code;
        
        -- 중복이 없으면 반환
        IF exists_check = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 함수: 프로필 생성 시 자동 처리
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 부모 계정인 경우 가족 코드 자동 생성
    IF NEW.user_type = 'parent' AND NEW.family_code IS NULL THEN
        NEW.family_code := generate_family_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 새 사용자 처리
CREATE TRIGGER on_profile_created
    BEFORE INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();