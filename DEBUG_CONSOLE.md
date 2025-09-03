# 🚨 디버깅 콘솔 확인 가이드

## 🎯 목적
부모-자녀 거래내역 동기화 문제의 정확한 원인을 파악하기 위한 상세 디버깅

## 📋 테스트 절차

### 1. 자녀 계정으로 로그인
```
http://localhost:3002 접속
F12 → Console 탭 열기
```

### 2. 확인해야 할 핵심 로그들

#### A. 기본 사용자 정보
```
🔍 [DEBUG] getCurrentUserWithParent 결과: {
  parentId: "8083ef38-...",  // 이것이 null이면 문제!
  profile: {...},
  childrenIds: []
}
```

#### B. 거래내역 조회 대상
```
🔍 [DEBUG] 자녀 계정 거래내역 조회 대상: {
  profileId: "db0fb595-...",
  parentId: "8083ef38-...",
  targetUserIds: ["db0fb595-...", "8083ef38-..."],  // 부모ID 포함되어야 함
  hasParent: true
}
```

#### C. Supabase 쿼리 실행
```
🚨 [CRITICAL] Supabase 쿼리 실행 직전: {
  targetUserIds: ["자녀ID", "부모ID"],
  query: "SELECT * FROM allowance_transactions WHERE user_id IN ('자녀ID', '부모ID')"
}
```

#### D. 쿼리 실행 결과
```
🚨 [CRITICAL] Supabase 쿼리 실행 결과: {
  hasError: false,
  rawTransactionsCount: N,  // 부모 거래 포함된 총 개수
  rawTransactionsData: [...]
}
```

#### E. 사용자별 거래 분포
```
🔍 [DEBUG] 사용자별 거래 분포: [
  {userId: "자녀ID", count: X},
  {userId: "부모ID", count: Y}  // Y가 0이면 문제!
]
```

#### F. RLS 정책 테스트 (핵심!)
```
🚨 [RLS_TEST] 부모 ID 직접 쿼리 결과: {
  parentId: "8083ef38",
  hasError: false,
  resultCount: N,  // 이게 0이면 RLS 정책 문제!
  results: [...]
}
```

#### G. 쿼리 방식 비교
```
🚨 [RLS_TEST] .in() 쿼리 결과 비교: {
  inQueryCount: A,
  directQueryCount: B,
  areResultsEqual: true/false  // false면 .in() 필터링 문제
}
```

#### H. 사용자 컨텍스트 확인
```
🚨 [RLS_TEST] 현재 Supabase 사용자 컨텍스트: {
  currentUserId: "db0fb595",
  queryingForParentId: "8083ef38",
  isQueryingForSelf: false  // 자녀가 부모 데이터 조회할 때는 false
}
```

#### I. RLS 정책 진단 (중요!)
```
🚨 [RLS_DIAGNOSTIC] allowance_transactions (부모): {
  hasError: true/false,
  errorMessage: "...",  // 에러 메시지 확인
  count: N,
  canAccess: true/false  // false면 RLS 정책 차단
}
```

#### J. 가족 구성원 확인
```
🔧 [진단] 같은 가족 구성원들: {
  familyCode: "...",
  members: [
    {id: "db0fb595", userType: "child"},
    {id: "8083ef38", userType: "parent"}
  ]
}
```

## 🚨 문제 패턴 분석

### Case 1: RLS 정책 차단
```
🚨 [RLS_DIAGNOSTIC] allowance_transactions (부모): {
  hasError: true,
  errorMessage: "Permission denied",
  canAccess: false
}
```
**원인**: Supabase RLS 정책이 자녀의 부모 데이터 접근을 차단
**해결**: RLS 정책 수정 필요

### Case 2: .in() 쿼리 필터링 문제
```
🚨 [RLS_TEST] .in() 쿼리 결과 비교: {
  inQueryCount: 0,
  directQueryCount: 5,
  areResultsEqual: false
}
```
**원인**: .in() 메소드 사용 시 필터링 오류
**해결**: 쿼리 방식 변경

### Case 3: parent_id 연결 실패
```
🔍 [DEBUG] getCurrentUserWithParent 결과: {
  parentId: null
}
```
**원인**: profiles 테이블에서 parent_id가 설정되지 않음
**해결**: forceFixFamilyRelations() 실행

## ⚡ 즉시 확인할 것

1. **자녀 계정 로그인** → F12 콘솔 열기
2. **용돈 페이지 접속** → 위의 로그들이 자동 실행됨  
3. **핵심 체크포인트**:
   - parentId가 null인가?
   - targetUserIds에 부모ID가 포함되는가?
   - RLS_DIAGNOSTIC에서 "canAccess: false"가 나오는가?
   - directQueryCount vs inQueryCount가 다른가?

## 📞 결과 보고

위의 로그들을 복사해서 다음 정보와 함께 제공:
1. **어떤 로그에서 문제가 발견되었는지**
2. **에러 메시지가 있다면 정확한 내용**
3. **count 값들 (부모 거래가 몇 개 조회되는지)**