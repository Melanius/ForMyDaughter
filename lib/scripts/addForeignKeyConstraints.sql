-- 🔗 가족 시스템을 위한 외래키 관계 설정
-- JOIN 쿼리 문제 해결을 위한 필수 외래키 제약조건 추가

-- 1. family_members → profiles 외래키 관계 설정
ALTER TABLE family_members 
ADD CONSTRAINT fk_family_members_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. family_members → families 외래키 관계 설정 (이미 있는지 확인 후 추가)
ALTER TABLE family_members 
ADD CONSTRAINT fk_family_members_family_id 
FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

-- 3. families → profiles (생성자) 외래키 관계 설정
ALTER TABLE families 
ADD CONSTRAINT fk_families_created_by 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. 외래키 설정 확인 쿼리
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'family_members' OR tc.table_name = 'families');

-- 5. JOIN 쿼리 테스트
SELECT 
  fm.*,
  p.id as profile_id,
  p.full_name,
  p.user_type,
  p.avatar_url
FROM family_members fm
JOIN profiles p ON fm.user_id = p.id
WHERE fm.is_active = true
LIMIT 5;