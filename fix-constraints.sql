-- =============================================
-- 제약조건 추가 (PostgreSQL 호환)
-- =============================================

-- 방법 1: DO 블록을 사용한 조건부 제약조건 추가
DO $$
BEGIN
    -- families_members_count_check 제약조건 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'families_members_count_check' 
        AND table_name = 'families'
    ) THEN
        ALTER TABLE families 
        ADD CONSTRAINT families_members_count_check 
        CHECK (total_members = parents_count + children_count);
        
        RAISE NOTICE '제약조건 추가됨: families_members_count_check';
    ELSE
        RAISE NOTICE '제약조건 이미 존재: families_members_count_check';
    END IF;

    -- families_valid_counts_check 제약조건 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'families_valid_counts_check' 
        AND table_name = 'families'
    ) THEN
        ALTER TABLE families 
        ADD CONSTRAINT families_valid_counts_check 
        CHECK (
            total_members >= 0 AND 
            parents_count >= 0 AND 
            children_count >= 0
        );
        
        RAISE NOTICE '제약조건 추가됨: families_valid_counts_check';
    ELSE
        RAISE NOTICE '제약조건 이미 존재: families_valid_counts_check';
    END IF;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '제약조건 추가 중 오류: %', SQLERRM;
END;
$$;

-- 방법 2: 단순한 DROP + ADD (기존 제약조건 무시)
-- 기존 제약조건이 있으면 삭제 후 다시 추가
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_members_count_check;
ALTER TABLE families DROP CONSTRAINT IF EXISTS families_valid_counts_check;

-- 새로운 제약조건 추가
ALTER TABLE families 
ADD CONSTRAINT families_members_count_check 
CHECK (total_members = parents_count + children_count);

ALTER TABLE families 
ADD CONSTRAINT families_valid_counts_check 
CHECK (
    total_members >= 0 AND 
    parents_count >= 0 AND 
    children_count >= 0
);

-- 제약조건 확인
SELECT 
    constraint_name, 
    constraint_type,
    check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'families' 
    AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;