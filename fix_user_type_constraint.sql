-- profiles 테이블의 user_type 제약 조건을 4가지 역할로 업데이트

-- 1. 현재 제약 조건 확인
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname LIKE '%user_type%';

-- 2. 기존 제약 조건 제거
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;

-- 3. 새로운 제약 조건 추가 (4가지 역할 허용)
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('father', 'mother', 'son', 'daughter'));

-- 4. 현재 상태 확인
SELECT user_type, COUNT(*) as count 
FROM profiles 
GROUP BY user_type 
ORDER BY user_type;

-- 5. user_type 업데이트 (parent -> father, child -> daughter)
UPDATE profiles 
SET user_type = CASE 
    WHEN user_type = 'parent' THEN 'father'
    WHEN user_type = 'child' THEN 'daughter'
    ELSE user_type
END 
WHERE user_type IN ('parent', 'child');

-- 6. 최종 결과 확인
SELECT user_type, COUNT(*) as count 
FROM profiles 
GROUP BY user_type 
ORDER BY user_type;

-- 7. 제약 조건 확인
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname LIKE '%user_type%';