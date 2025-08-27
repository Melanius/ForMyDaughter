const { test, expect, chromium } = require('@playwright/test');

/**
 * 🎭 이중 사용자 테스트 환경
 * 
 * 세션 공유 문제 해결:
 * - 각 사용자별로 완전히 독립된 브라우저 컨텍스트 생성
 * - 쿠키, 로컬스토리지, 세션 완전 분리
 * - 동시 테스트로 상호작용 검증
 */

class DualUserTestEnvironment {
  constructor() {
    this.browser = null;
    this.childContext = null;
    this.parentContext = null;
    this.childPage = null;
    this.parentPage = null;
  }

  async setup() {
    console.log('🚀 브라우저 컨텍스트 초기화...');
    
    // 브라우저 시작
    this.browser = await chromium.launch({ 
      headless: false,  // 시각적 확인을 위해 headless 끄기
      slowMo: 1000     // 동작을 천천히 보기
    });

    // 자녀용 브라우저 컨텍스트 (완전 독립)
    this.childContext = await this.browser.newContext({
      viewport: { width: 1200, height: 800 },
      userAgent: 'Child-Browser-Context'
    });
    
    // 부모용 브라우저 컨텍스트 (완전 독립)
    this.parentContext = await this.browser.newContext({
      viewport: { width: 1200, height: 800 },
      userAgent: 'Parent-Browser-Context'
    });

    // 각 컨텍스트에서 페이지 생성
    this.childPage = await this.childContext.newPage();
    this.parentPage = await this.parentContext.newPage();

    console.log('✅ 독립된 브라우저 컨텍스트 생성 완료');
  }

  async navigateBoth() {
    console.log('🌐 두 계정 모두 앱으로 이동...');
    
    const [childNav, parentNav] = await Promise.all([
      this.childPage.goto('http://localhost:3001'),
      this.parentPage.goto('http://localhost:3001')
    ]);

    console.log('✅ 두 페이지 모두 로드 완료');
    return { childNav, parentNav };
  }

  async loginChild(email, password) {
    console.log('👶 자녀 계정 로그인 시작...');
    
    // 로그인 버튼 클릭
    await this.childPage.click('text="로그인"');
    
    // 로그인 폼 입력
    await this.childPage.fill('input[type="email"]', email);
    await this.childPage.fill('input[type="password"]', password);
    
    // 로그인 제출
    await this.childPage.click('button[type="submit"]');
    
    // 로그인 성공 대기
    await this.childPage.waitForSelector('text="미션 어드벤처"');
    
    console.log('✅ 자녀 계정 로그인 성공');
  }

  async loginParent(email, password) {
    console.log('👨‍👩‍👧‍👦 부모 계정 로그인 시작...');
    
    // 로그인 버튼 클릭
    await this.parentPage.click('text="로그인"');
    
    // 로그인 폼 입력
    await this.parentPage.fill('input[type="email"]', email);
    await this.parentPage.fill('input[type="password"]', password);
    
    // 로그인 제출
    await this.parentPage.click('button[type="submit"]');
    
    // 로그인 성공 대기
    await this.parentPage.waitForSelector('text="미션 어드벤처"');
    
    console.log('✅ 부모 계정 로그인 성공');
  }

  async verifyIndependentSessions() {
    console.log('🔍 세션 독립성 검증 시작...');
    
    // 각 페이지에서 현재 로그인된 사용자 정보 확인
    const childUserInfo = await this.childPage.evaluate(() => {
      return {
        url: window.location.href,
        localStorage: window.localStorage.getItem('supabase.auth.token'),
        userType: document.body.textContent.includes('부모') ? 'parent' : 'child'
      };
    });

    const parentUserInfo = await this.parentPage.evaluate(() => {
      return {
        url: window.location.href,
        localStorage: window.localStorage.getItem('supabase.auth.token'),
        userType: document.body.textContent.includes('추가') ? 'parent' : 'child'
      };
    });

    console.log('👶 자녀 세션:', childUserInfo);
    console.log('👨‍👩‍👧‍👦 부모 세션:', parentUserInfo);

    // 세션이 독립적인지 확인
    const isIndependent = childUserInfo.localStorage !== parentUserInfo.localStorage;
    
    if (isIndependent) {
      console.log('✅ 세션 독립성 검증 성공 - 각각 다른 인증 토큰을 사용 중');
    } else {
      console.log('❌ 세션 독립성 검증 실패 - 같은 인증 토큰을 공유 중');
    }

    return isIndependent;
  }

  async testMissionInteraction() {
    console.log('🎯 미션 상호작용 테스트 시작...');

    // 부모가 미션 추가
    if (await this.parentPage.isVisible('text="추가"')) {
      await this.parentPage.click('text="추가"');
      await this.parentPage.fill('input[placeholder*="제목"]', '테스트 미션');
      await this.parentPage.fill('textarea[placeholder*="설명"]', '부모가 생성한 테스트 미션');
      await this.parentPage.fill('input[type="number"]', '1000');
      await this.parentPage.click('button[type="submit"]');
      console.log('✅ 부모가 미션 생성 완료');
    }

    // 잠시 대기 후 자녀 페이지에서 미션 확인
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.childPage.reload();

    const missionsVisible = await this.childPage.isVisible('text="테스트 미션"');
    
    if (missionsVisible) {
      console.log('✅ 자녀 화면에서 부모가 생성한 미션 확인됨');
      
      // 자녀가 미션 완료
      await this.childPage.click('text="완료"');
      console.log('✅ 자녀가 미션 완료');
    }

    return missionsVisible;
  }

  async takeScreenshots() {
    console.log('📸 스크린샷 촬영...');
    
    await this.childPage.screenshot({ 
      path: 'test-results/child-account-view.png',
      fullPage: true 
    });
    
    await this.parentPage.screenshot({ 
      path: 'test-results/parent-account-view.png',
      fullPage: true 
    });
    
    console.log('✅ 스크린샷 저장 완료');
  }

  async cleanup() {
    console.log('🧹 테스트 환경 정리...');
    
    if (this.childContext) await this.childContext.close();
    if (this.parentContext) await this.parentContext.close();
    if (this.browser) await this.browser.close();
    
    console.log('✅ 정리 완료');
  }
}

// 실제 테스트 실행
async function runDualUserTest() {
  const testEnv = new DualUserTestEnvironment();
  
  try {
    // 1. 환경 설정
    await testEnv.setup();
    
    // 2. 두 계정 모두 앱으로 이동
    await testEnv.navigateBoth();
    
    // 3. 각각 로그인 (실제 계정 정보는 여기서 수정)
    console.log('🔐 로그인 대기 - 수동으로 각 브라우저에서 로그인해주세요');
    console.log('   👶 자녀 브라우저: 첫 번째 창');
    console.log('   👨‍👩‍👧‍👦 부모 브라우저: 두 번째 창');
    console.log('   ⏰ 30초 후 자동으로 다음 단계 진행...');
    
    // 수동 로그인 시간 제공
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 4. 세션 독립성 검증
    await testEnv.verifyIndependentSessions();
    
    // 5. 미션 상호작용 테스트
    await testEnv.testMissionInteraction();
    
    // 6. 스크린샷 촬영
    await testEnv.takeScreenshots();
    
    console.log('🎉 테스트 완료!');
    
    // 결과 유지를 위해 5초 대기
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
  } finally {
    await testEnv.cleanup();
  }
}

// 모듈로 내보내기 (다른 스크립트에서 사용 가능)
module.exports = { DualUserTestEnvironment, runDualUserTest };

// 직접 실행 시
if (require.main === module) {
  console.log('🎭 이중 사용자 테스트 환경 시작');
  console.log('=====================================');
  runDualUserTest();
}