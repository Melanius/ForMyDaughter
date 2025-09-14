-- profiles 테이블의 user_type을 4가지 역할로 업데이트
-- parent -> father, child -> daughter로 변경

-- 1. 현재 상태 확인
SELECT user_type, COUNT(*) as count 
FROM profiles 
GROUP BY user_type 
ORDER BY user_type;

-- 2. 백업을 위한 임시 컬럼 생성 (이미 있으면 무시)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type_backup VARCHAR(10);

-- 3. 기존 데이터 백업
UPDATE profiles 
SET user_type_backup = user_type 
WHERE user_type_backup IS NULL;

-- 4. user_type 업데이트
UPDATE profiles 
SET user_type = CASE 
    WHEN user_type = 'parent' THEN 'father'
    WHEN user_type = 'child' THEN 'daughter'
    ELSE user_type  -- 이미 새로운 형식인 경우 유지
END 
WHERE user_type IN ('parent', 'child');

-- 5. 업데이트 결과 확인
SELECT 
    user_type_backup as original_type,
    user_type as new_type,
    COUNT(*) as count 
FROM profiles 
WHERE user_type_backup IS NOT NULL
GROUP BY user_type_backup, user_type 
ORDER BY user_type_backup, user_type;

-- 6. 최종 상태 확인
SELECT user_type, COUNT(*) as count 
FROM profiles 
GROUP BY user_type 
ORDER BY user_type;