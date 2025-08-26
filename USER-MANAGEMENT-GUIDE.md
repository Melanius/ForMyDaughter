# 📋 사용자 관리 가이드

MoneySeed 앱의 사용자를 관리할 수 있는 도구입니다.

## 🚀 사용 방법

### 1. 사용자 목록 조회
```bash
node admin-user-management.js list
```

### 2. 사용자 삭제
```bash
node admin-user-management.js delete
```

## 📊 현재 등록된 사용자들

최근 확인된 사용자 목록:
- **이서하** (seoha111711@gmail.com) - 자녀 계정
- **테스트 부모** (testparent@test.com) - 부모 계정
- **테스트자녀1** (testchild456@gmail.com) - 자녀 계정
- **테스트부모6** (testparent333@gmail.com) - 부모 계정
- **테스트자녀** (testchild123@gmail.com) - 자녀 계정
- **테스트부모5** (testparent555@gmail.com) - 부모 계정
- **이훈정** (melanius88@naver.com) - 부모 계정

## 🔑 권한 설정

### 일반 사용자 권한 (현재)
- 사용자 목록 조회 ✅
- 프로필 및 관련 데이터 삭제 ✅
- Auth 사용자 삭제 ❌ (수동으로 Supabase Dashboard에서 삭제 필요)

### 관리자 권한 (서비스 키 필요)
완전한 관리자 기능을 위해서는 `.env.local` 파일에 서비스 키를 추가하세요:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

서비스 키가 있으면:
- 사용자 목록 조회 ✅
- 프로필 및 관련 데이터 삭제 ✅
- Auth 사용자 완전 삭제 ✅

## ⚠️ 주의사항

### 삭제 시 제거되는 데이터
1. **family_connection_requests** - 가족 연결 요청
2. **mission_instances** - 미션 인스턴스
3. **mission_templates** - 미션 템플릿
4. **allowance_transactions** - 용돈 거래 내역
5. **allowance_balances** - 용돈 잔액
6. **user_progress** - 사용자 진행상황 (연속 기록)
7. **reward_settings** - 보상 설정
8. **reward_history** - 보상 내역
9. **profiles** - 프로필 정보
10. **auth.users** - 인증 사용자 (서비스 키가 있을 때)

### 삭제 전 확인사항
- 삭제된 데이터는 복구할 수 없습니다
- 부모 계정 삭제 시 연결된 자녀들의 parent_id가 무효가 됩니다
- 가족 관계가 있는 계정들은 순서를 고려해서 삭제하세요

## 🔧 문제 해결

### Node.js 버전 경고
현재 Node.js 18 이하 버전 사용 시 경고가 표시됩니다. Node.js 20 이상으로 업그레이드를 권장합니다.

### 권한 오류
RLS (Row Level Security) 정책으로 인해 일부 데이터에 접근할 수 없을 수 있습니다. 이 경우 Supabase Dashboard에서 직접 관리하거나 서비스 키를 사용하세요.

## 📞 지원

스크립트 사용 중 문제가 발생하면:
1. 콘솔 출력 로그 확인
2. .env.local 파일의 환경 변수 확인
3. Supabase 연결 상태 확인