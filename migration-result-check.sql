-- =============================================
-- 마이그레이션 결과 확인 (수정된 버전)
-- =============================================

-- 방법 1: 테이블명 명시
DO $$
DECLARE
  total_families integer;
  total_members integer;
  total_parents integer;
  total_children integer;
BEGIN
  SELECT
    count(*),
    sum(f.total_members),
    sum(f.parents_count),
    sum(f.children_count)
  INTO total_families, total_members, total_parents, total_children
  FROM families f
  WHERE f.is_active = true;

  RAISE NOTICE '=== 마이그레이션 완료 ===';
  RAISE NOTICE '총 가족 수: %', total_families;
  RAISE NOTICE '총 구성원 수: %', total_members;
  RAISE NOTICE '총 부모 수: %', total_parents;
  RAISE NOTICE '총 자녀 수: %', total_children;
END;
$$;

-- 방법 2: 변수명 변경
DO $$
DECLARE
  family_count integer;
  member_count integer;
  parent_count integer;
  child_count integer;
BEGIN
  SELECT
    count(*),
    sum(total_members),
    sum(parents_count),
    sum(children_count)
  INTO family_count, member_count, parent_count, child_count
  FROM families
  WHERE is_active = true;

  RAISE NOTICE '=== 마이그레이션 완료 ===';
  RAISE NOTICE '총 가족 수: %', family_count;
  RAISE NOTICE '총 구성원 수: %', member_count;
  RAISE NOTICE '총 부모 수: %', parent_count;
  RAISE NOTICE '총 자녀 수: %', child_count;
END;
$$;