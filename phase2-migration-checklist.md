# 📋 Phase 2 마이그레이션 체크리스트

## 🎯 배포 전 필수 작업

### 1. 스키마 업데이트 (우선순위: 🔴 HIGH)
```sql
-- 파일: phase2-manual-migration.sql
-- 실행 순서: 1번째

ALTER TABLE families 
ADD COLUMN IF NOT EXISTS members jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_members integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parents_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS children_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;
```

### 2. 시간대 수정 (우선순위: 🔴 HIGH)
```sql
-- 파일: fix-kst-timezone.sql  
-- 실행 순서: 2번째

-- KST 함수 생성
CREATE OR REPLACE FUNCTION now_kst() RETURNS timestamptz AS $$
BEGIN
  RETURN (now() AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
END;
$$ LANGUAGE plpgsql;

-- 기존 UTC 시간을 KST로 변환
UPDATE families SET 
  created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul',
  updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul';
```

### 3. 문제 해결 (우선순위: 🟡 MEDIUM)
```sql
-- 파일: fix-phase2-issues.sql
-- 실행 순서: 3번째

-- 누락된 가족 추가 + 동기화 함수 타입 수정
-- 상세 내용은 해당 파일 참조
```

## 📊 검증 쿼리

### 배포 후 필수 검증
```sql
-- 1. 스키마 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'families' 
ORDER BY ordinal_position;

-- 2. 데이터 무결성 확인
SELECT 
  family_code,
  family_name,
  total_members,
  parents_count,
  children_count,
  jsonb_array_length(members) as actual_members,
  (total_members = parents_count + children_count) as count_valid,
  (total_members = jsonb_array_length(members)) as members_valid
FROM families;

-- 3. 시간대 확인
SELECT 
  family_code,
  created_at,
  extract(timezone from created_at) as timezone_offset,
  '한국시간(+9)인지 확인' as note
FROM families 
LIMIT 3;

-- 4. 동기화 상태 확인
SELECT * FROM check_families_sync_status();
```

## 🚨 롤백 계획

### 문제 발생 시 즉시 실행
```sql
-- 1. 새 컬럼 제거 (최후의 수단)
ALTER TABLE families 
DROP COLUMN IF EXISTS members,
DROP COLUMN IF EXISTS total_members,
DROP COLUMN IF EXISTS parents_count,
DROP COLUMN IF EXISTS children_count,
DROP COLUMN IF EXISTS last_activity_at;

-- 2. 트리거 비활성화
DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_insert ON profiles;
DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_update ON profiles;
DROP TRIGGER IF EXISTS trigger_sync_profiles_to_families_delete ON profiles;

-- 3. 백업에서 복원
-- (데이터베이스 백업 복원 절차 따름)
```

## ✅ 성공 기준

### 배포 성공 확인
- [ ] families 테이블에 모든 필수 컬럼 존재
- [ ] 기존 데이터 무손실 확인
- [ ] 모든 시간이 KST(+9) 기준으로 저장
- [ ] profiles-families 자동 동기화 작동
- [ ] adminFamilyService 모든 메서드 정상 작동
- [ ] 성능 테스트 통과 (응답시간 <100ms)

### 운영 안정성 확인
- [ ] 1시간 동안 에러 없이 운영
- [ ] 신규 가족 가입 시 자동 동기화 확인
- [ ] 기존 사용자 데이터 변경 시 실시간 반영 확인
- [ ] 관리자 통계 조회 정상 작동

## 📈 모니터링 대상

### 필수 모니터링 지표
```sql
-- 실시간 모니터링 쿼리 (5분마다 실행)
SELECT 
  count(*) as total_families,
  count(*) FILTER (WHERE is_active = true) as active_families,
  sum(total_members) as total_users,
  avg(total_members) as avg_family_size,
  max(updated_at) as last_update,
  now() as check_time
FROM families;

-- 오류 감지 쿼리 (10분마다 실행)  
SELECT 
  family_code,
  'Count mismatch' as error_type
FROM families 
WHERE total_members != (parents_count + children_count)
   OR total_members != jsonb_array_length(members);
```

## 🔧 문제 해결 가이드

### 자주 발생할 수 있는 문제들

#### 1. 동기화 함수 타입 오류
```
ERROR: structure of query does not match function result type
```
**해결**: `fix-phase2-issues.sql`의 함수 재정의 실행

#### 2. KST 시간 미적용
```
시간이 UTC 기준으로 표시됨
```
**해결**: `fix-kst-timezone.sql` 전체 실행

#### 3. 누락된 가족 데이터
```
profiles에 있지만 families에 없는 가족
```
**해결**: `fix-phase2-issues.sql`의 누락 가족 추가 섹션 실행

## 📞 비상 연락처

### 기술 지원
- **Phase 2 시스템**: Claude Code Assistant
- **데이터베이스**: DBA 팀
- **백엔드 API**: 백엔드 개발팀

### 에스컬레이션 절차
1. **Level 1**: 자동 복구 시도 (롤백 계획 실행)
2. **Level 2**: 기술팀 연락 및 수동 복구
3. **Level 3**: 백업 복원 및 전체 시스템 점검

---

**⚠️ 중요**: 모든 마이그레이션은 반드시 **개발/스테이징 환경**에서 먼저 테스트 후 프로덕션에 적용하세요!