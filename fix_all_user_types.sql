-- 모든 user_type 값을 4가지 역할로 정리하고 제약 조건 추가

-- 1. 현재 모든 user_type 값 확인
SELECT user_type, COUNT(*) as count 
FROM profiles 
GROUP BY user_type 
ORDER BY user_type;

-- 2. 모든 비표준 user_type 값을 정리
UPDATE profiles 
SET user_type = CASE 
    WHEN user_type = 'parent' THEN 'father'
    WHEN user_type = 'child' THEN 'daughter'
    WHEN user_type IS NULL THEN 'father'  -- NULL 값 처리
    WHEN user_type = '' THEN 'father'     -- 빈 문자열 처리
    WHEN user_type NOT IN ('father', 'mother', 'son', 'daughter') THEN 'father'  -- 기타 값들
    ELSE user_type
END;

-- 3. 업데이트 후 상태 확인
SELECT user_type, COUNT(*) as count 
FROM profiles 
GROUP BY user_type 
ORDER BY user_type;

-- 4. 이제 제약 조건 추가
ALTER TABLE profiles ADD CONSTRAINT profiles_user_type_check 
CHECK (user_type IN ('father', 'mother', 'son', 'daughter'));

-- 5. 최종 확인
SELECT 
    user_type, 
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM profiles), 2) as percentage
FROM profiles 
GROUP BY user_type 
ORDER BY user_type;