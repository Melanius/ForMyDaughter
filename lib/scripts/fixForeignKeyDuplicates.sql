-- 🔧 중복된 외래키 제약조건 정리
-- PGRST201 오류 해결을 위한 외래키 중복 제거

-- 1. 기존 외래키 제약조건 확인
SELECT
    tc.constraint_name,
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
  AND tc.table_name IN ('family_members', 'families')
ORDER BY tc.table_name, kcu.column_name;

-- 2. 모든 기존 외래키 제약조건 제거
-- family_members 테이블의 외래키들
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS fk_family_members_family_id;
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS fk_family_members_user_id;
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_family_id_fkey;
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_user_id_fkey;

-- families 테이블의 외래키들
ALTER TABLE families DROP CONSTRAINT IF EXISTS fk_families_created_by;
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_created_by_fkey;

-- 3. 새로운 외래키 제약조건 추가 (고유한 이름으로)
-- family_members → families 관계
ALTER TABLE family_members 
ADD CONSTRAINT family_members_family_id_fkey 
FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE;

-- family_members → profiles 관계
ALTER TABLE family_members 
ADD CONSTRAINT family_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- families → profiles (생성자) 관계
ALTER TABLE families 
ADD CONSTRAINT families_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. 외래키 설정 확인 (최종 상태)
SELECT
    tc.constraint_name,
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
  AND tc.table_name IN ('family_members', 'families')
ORDER BY tc.table_name, kcu.column_name;

-- 5. JOIN 쿼리 테스트
SELECT 
  fm.*,
  f.family_name,
  p.full_name
FROM family_members fm
JOIN families f ON fm.family_id = f.id
JOIN profiles p ON fm.user_id = p.id
WHERE fm.is_active = true
LIMIT 3;