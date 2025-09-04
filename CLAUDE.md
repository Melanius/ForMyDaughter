# Kids Allowance App - 개발 가이드라인

## 🕘 **시간 처리 규칙 (중요)**

### **필수 사항: 모든 시간은 한국시간(KST) 기준**

1. **날짜/시간 함수 사용 규칙:**
   ```typescript
   // ✅ 올바른 사용 (KST 기준)
   import { getTodayKST, nowKST, formatDateKST } from '@/lib/utils/dateUtils'
   
   const today = getTodayKST()                    // 오늘 날짜 (YYYY-MM-DD)
   const now = nowKST()                          // 현재 시간 (ISO 문자열, KST)
   const formatted = formatDateKST(new Date())   // Date 객체를 KST 문자열로
   
   // ❌ 잘못된 사용 (UTC 기준)
   const today = new Date().toISOString().split('T')[0]  // UTC 기준!
   const now = new Date().toISOString()                  // UTC 기준!
   ```

2. **DB 저장 시간 규칙:**
   ```typescript
   // ✅ 올바른 DB 저장
   const updateData = {
     updated_at: nowKST(),
     created_at: nowKST()
   }
   
   // ❌ 잘못된 DB 저장
   const updateData = {
     updated_at: new Date().toISOString()  // UTC!
   }
   ```

3. **날짜 비교 및 판정:**
   - 모든 날짜 비교는 KST 기준으로 수행
   - "오늘"의 정의: `getTodayKST()` 결과 기준
   - 데일리 미션 생성도 KST 날짜 기준

### **왜 KST를 사용해야 하는가?**
- 사용자는 한국에 거주하며 한국 시간대로 생활
- "오늘의 미션"은 한국 시간 기준 자정부터 시작
- UTC를 사용하면 9시간 차이로 인해 잘못된 날짜 판정 발생

## 🎯 **데일리 미션 관리 규칙**

### **단일 책임 원칙 적용**

1. **통합 관리자 사용:**
   ```typescript
   // ✅ 올바른 사용 (통합 관리자)
   import { dailyMissionManager, checkDailyMissionsOnChildLogin } from '@/lib/services/dailyMissionManager'
   
   // 자녀 로그인 시
   await checkDailyMissionsOnChildLogin(userId)
   
   // 수동 미션 생성
   const created = await dailyMissionManager.ensureDailyMissions(userId, date)
   
   // ❌ 잘못된 사용 (직접 호출로 중복 위험)
   await missionSupabaseService.generateDailyMissions(date)  // 중복 생성 위험!
   ```

2. **중복 방지 보장:**
   - 모든 데일리 미션 생성은 락(lock) 시스템으로 보호
   - 동시 실행 방지 및 중복 체크 자동화
   - Race Condition 완전 해결

3. **책임 분리:**
   - `AuthProvider`: 자녀 로그인 감지만 담당
   - `useDailyMissionWelcome`: UI 모달 관리만 담당
   - `dailyMissionManager`: 모든 미션 생성 로직 통합 관리

## 🔧 **코드 품질 규칙**

### **로깅 시스템**
```typescript
// ✅ 구조화된 로깅 사용
import { authLogger, missionLogger } from '@/lib/utils/logger'

authLogger.log('사용자 로그인 성공', { userId })
missionLogger.error('미션 생성 실패', error)

// ❌ 직접 console 사용 금지 (프로덕션에서 자동 제거됨)
console.log('디버그 메시지')  // 프로덕션에서 제거됨
```

### **타입 안전성**
```typescript
// ✅ 강타입 사용
import { UserType, ApiResponse } from '@/lib/types/common'

const response: ApiResponse<Mission[]> = await api.getMissions()

// ❌ any 타입 남발 금지
const data: any = await api.call()  // 지양
```

## 🚀 **성능 최적화 가이드라인**

1. **React 컴포넌트:** `memo`, `useMemo`, `useCallback` 적극 활용
2. **쿼리 최적화:** `useOptimizedQuery` 훅 사용
3. **번들 최적화:** Lazy loading 및 code splitting 적용
4. **이미지 최적화:** Next.js Image 컴포넌트 사용

## 📝 **커밋 메시지 규칙**

```
feat: 새로운 기능 추가
fix: 버그 수정  
perf: 성능 개선
refactor: 코드 리팩토링
style: 코드 스타일 변경
docs: 문서 수정
test: 테스트 추가/수정
chore: 기타 작업

예: feat: 데일리 미션 중복 생성 방지 시스템 구현
```

## ⚠️ **주의사항**

1. **시간 처리 실수 방지:** 반드시 KST 유틸 함수 사용
2. **미션 생성:** 직접 호출 금지, 통합 관리자 사용
3. **타입 안전성:** any 타입 사용 최소화
4. **로깅:** 구조화된 로깅 시스템 사용
5. **성능:** 불필요한 리렌더링 방지

---

이 가이드라인을 준수하여 **안정적이고 일관된 코드**를 작성하세요.