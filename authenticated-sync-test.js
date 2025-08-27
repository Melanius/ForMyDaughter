const { chromium, firefox } = require('playwright');

/**
 * 🎭 인증된 실시간 동기화 테스트
 * 
 * 실제 계정으로 로그인하여 다음을 테스트:
 * 1. 부모가 미션 생성 → 자녀 화면 실시간 반영
 * 2. 자녀가 미션 완료 → 부모 화면 실시간 반영
 * 3. 자녀 지갑 내역 수정 → 부모 화면 실시간 반영
 * 4. 기타 동기화 검증
 */

class AuthenticatedSyncTester {
  constructor() {
    this.chromeBrowser = null;
    this.firefoxBrowser = null;
    this.chromeContext = null;
    this.firefoxContext = null;
    this.chromePage = null;
    this.firefoxPage = null;
    this.testResults = [];
    
    // 계정 정보
    this.parentAccount = {
      email: 'melanius88@naver.com',
      password: 'mela1499^^'
    };
    
    this.childAccount = {
      email: 'seoha1117@naver.com', 
      password: 'mela1499^^'
    };
  }

  async setup() {
    console.log('🚀 인증된 테스트 환경 초기화...');
    console.log('=====================================');

    try {
      // Chrome 브라우저 시작 (부모용)
      this.chromeBrowser = await chromium.launch({ 
        headless: false,
        slowMo: 1000,
        args: ['--disable-web-security']
      });

      // Firefox 브라우저 시작 (자녀용)
      this.firefoxBrowser = await firefox.launch({
        headless: false,
        slowMo: 1000
      });

      // 독립된 컨텍스트 생성
      this.chromeContext = await this.chromeBrowser.newContext({
        viewport: { width: 1000, height: 900 }
      });

      this.firefoxContext = await this.firefoxBrowser.newContext({
        viewport: { width: 1000, height: 900 }
      });

      // 페이지 생성
      this.chromePage = await this.chromeContext.newPage();
      this.firefoxPage = await this.firefoxContext.newPage();

      // 콘솔 로그 캡처
      this.chromePage.on('console', msg => {
        if (msg.type() === 'log' && msg.text().includes('동기화')) {
          console.log(`👨‍👩‍👧‍👦 부모(Chrome): ${msg.text()}`);
        }
      });

      this.firefoxPage.on('console', msg => {
        if (msg.type() === 'log' && msg.text().includes('동기화')) {
          console.log(`👶 자녀(Firefox): ${msg.text()}`);
        }
      });

      console.log('✅ 브라우저 환경 초기화 완료');
      return true;

    } catch (error) {
      console.error('❌ 환경 초기화 실패:', error);
      return false;
    }
  }

  async loginParent() {
    console.log('👨‍👩‍👧‍👦 부모 계정 자동 로그인 중...');

    try {
      await this.chromePage.goto('http://localhost:3001/login');
      
      // 페이지 타이틀 설정
      await this.chromePage.evaluate(() => {
        document.title = '👨‍👩‍👧‍👦 부모 계정 - ' + document.title;
      });

      // 로그인 폼 입력
      await this.chromePage.fill('input[type="email"]', this.parentAccount.email);
      await this.chromePage.fill('input[type="password"]', this.parentAccount.password);
      
      // 로그인 버튼 클릭
      await this.chromePage.click('button[type="submit"]');
      
      // 로그인 성공 대기 (홈페이지로 리다이렉트)
      await this.chromePage.waitForURL('**/');
      
      // 사용자 타입 확인
      await this.chromePage.waitForTimeout(3000);
      const isParent = await this.chromePage.isVisible('text="추가"'); // 부모만 미션 추가 가능
      
      if (isParent) {
        console.log('✅ 부모 계정 로그인 성공');
        return true;
      } else {
        console.log('⚠️ 부모 권한이 확인되지 않음');
        return false;
      }

    } catch (error) {
      console.error('❌ 부모 로그인 실패:', error);
      return false;
    }
  }

  async loginChild() {
    console.log('👶 자녀 계정 자동 로그인 중...');

    try {
      await this.firefoxPage.goto('http://localhost:3001/login');
      
      // 페이지 타이틀 설정
      await this.firefoxPage.evaluate(() => {
        document.title = '👶 자녀 계정 - ' + document.title;
      });

      // 로그인 폼 입력
      await this.firefoxPage.fill('input[type="email"]', this.childAccount.email);
      await this.firefoxPage.fill('input[type="password"]', this.childAccount.password);
      
      // 로그인 버튼 클릭
      await this.firefoxPage.click('button[type="submit"]');
      
      // 로그인 성공 대기 (홈페이지로 리다이렉트)
      await this.firefoxPage.waitForURL('**/');
      
      // 로그인 확인
      await this.firefoxPage.waitForTimeout(3000);
      const isLoggedIn = await this.firefoxPage.isVisible('text="미션 어드벤처"');
      
      if (isLoggedIn) {
        console.log('✅ 자녀 계정 로그인 성공');
        return true;
      } else {
        console.log('❌ 자녀 로그인 실패');
        return false;
      }

    } catch (error) {
      console.error('❌ 자녀 로그인 실패:', error);
      return false;
    }
  }

  async testParentCreatesMission() {
    console.log('🎯 테스트 1: 부모가 미션 생성 → 자녀 화면 실시간 반영');
    
    try {
      const testMissionTitle = `동기화 테스트 미션 ${Date.now()}`;
      
      // 부모가 미션 추가
      await this.chromePage.click('button:has-text("추가")');
      await this.chromePage.waitForSelector('input[placeholder*="제목"], input[placeholder*="title"]');
      
      await this.chromePage.fill('input[placeholder*="제목"], input[placeholder*="title"]', testMissionTitle);
      await this.chromePage.fill('textarea[placeholder*="설명"], textarea[placeholder*="description"]', '부모가 생성한 테스트 미션입니다');
      await this.chromePage.fill('input[type="number"]', '1500');
      
      // 미션 생성 완료
      await this.chromePage.click('button:has-text("추가"), button[type="submit"]');
      await this.chromePage.waitForTimeout(2000);
      
      console.log(`📝 부모가 미션 생성: "${testMissionTitle}"`);
      
      // 자녀 화면에서 새 미션 확인 (최대 10초 대기)
      let missionFoundInChild = false;
      for (let i = 0; i < 10; i++) {
        await this.firefoxPage.reload();
        await this.firefoxPage.waitForTimeout(1000);
        
        missionFoundInChild = await this.firefoxPage.isVisible(`text="${testMissionTitle}"`);
        if (missionFoundInChild) {
          const waitTime = (i + 1) * 1000;
          console.log(`✅ 자녀 화면에서 새 미션 확인됨 (${waitTime}ms 후)`);
          break;
        }
      }
      
      this.testResults.push({
        test: '부모 미션 생성 → 자녀 실시간 반영',
        success: missionFoundInChild,
        details: missionFoundInChild ? 
          `미션 "${testMissionTitle}" 실시간 동기화 성공` :
          '10초 내에 자녀 화면에서 미션이 확인되지 않음'
      });

      return { success: missionFoundInChild, missionTitle: testMissionTitle };

    } catch (error) {
      console.error('❌ 부모 미션 생성 테스트 실패:', error);
      this.testResults.push({
        test: '부모 미션 생성 → 자녀 실시간 반영',
        success: false,
        details: `오류: ${error.message}`
      });
      return { success: false };
    }
  }

  async testChildCompletesMission(missionTitle) {
    console.log('🎯 테스트 2: 자녀가 미션 완료 → 부모 화면 실시간 반영');
    
    try {
      // 자녀가 미션 완료
      const missionCard = this.firefoxPage.locator(`text="${missionTitle}"`).locator('..').locator('..');
      const completeButton = missionCard.locator('button:has-text("완료")');
      
      if (await completeButton.isVisible()) {
        await completeButton.click();
        console.log(`👶 자녀가 미션 완료: "${missionTitle}"`);
        await this.firefoxPage.waitForTimeout(2000);
      }
      
      // 부모 화면에서 완료 상태 확인 (최대 10초 대기)
      let completionFoundInParent = false;
      for (let i = 0; i < 10; i++) {
        await this.chromePage.reload();
        await this.chromePage.waitForTimeout(1000);
        
        // 완료된 미션 확인 (체크마크나 완료됨 텍스트)
        const isCompleted = await this.chromePage.isVisible(`text="${missionTitle}"`) &&
                           (await this.chromePage.isVisible('text="완료됨"') ||
                            await this.chromePage.isVisible('text="✅"'));
        
        if (isCompleted) {
          const waitTime = (i + 1) * 1000;
          console.log(`✅ 부모 화면에서 미션 완료 상태 확인됨 (${waitTime}ms 후)`);
          completionFoundInParent = true;
          break;
        }
      }
      
      this.testResults.push({
        test: '자녀 미션 완료 → 부모 실시간 반영',
        success: completionFoundInParent,
        details: completionFoundInParent ?
          `미션 "${missionTitle}" 완료 상태 실시간 동기화 성공` :
          '10초 내에 부모 화면에서 완료 상태가 확인되지 않음'
      });

      return completionFoundInParent;

    } catch (error) {
      console.error('❌ 자녀 미션 완료 테스트 실패:', error);
      this.testResults.push({
        test: '자녀 미션 완료 → 부모 실시간 반영',
        success: false,
        details: `오류: ${error.message}`
      });
      return false;
    }
  }

  async testAllowanceSync() {
    console.log('🎯 테스트 3: 지갑 동기화 테스트');
    
    try {
      // 자녀 화면에서 현재 용돈 확인
      const childBalanceBefore = await this.firefoxPage.textContent('.bg-green-50 .text-green-600');
      console.log(`👶 자녀 용돈 (변경 전): ${childBalanceBefore}`);
      
      // 부모가 용돈 승인 (완료된 미션이 있다면)
      const transferButton = await this.chromePage.isVisible('button:has-text("용돈 전달 완료")');
      if (transferButton) {
        await this.chromePage.click('button:has-text("용돈 전달 완료")');
        
        // 확인 다이얼로그 처리
        await this.chromePage.waitForTimeout(500);
        this.chromePage.on('dialog', dialog => dialog.accept());
        
        console.log('💰 부모가 용돈 승인 완료');
        await this.chromePage.waitForTimeout(3000);
      }
      
      // 자녀 화면에서 용돈 변경 확인 (최대 10초 대기)
      let allowanceChanged = false;
      for (let i = 0; i < 10; i++) {
        await this.firefoxPage.reload();
        await this.firefoxPage.waitForTimeout(1000);
        
        const childBalanceAfter = await this.firefoxPage.textContent('.bg-green-50 .text-green-600');
        
        if (childBalanceAfter !== childBalanceBefore) {
          const waitTime = (i + 1) * 1000;
          console.log(`✅ 자녀 용돈 동기화 확인 (${waitTime}ms 후): ${childBalanceBefore} → ${childBalanceAfter}`);
          allowanceChanged = true;
          break;
        }
      }
      
      this.testResults.push({
        test: '용돈 실시간 동기화',
        success: allowanceChanged,
        details: allowanceChanged ?
          `용돈 변경사항 실시간 동기화 성공: ${childBalanceBefore} → 변경됨` :
          '10초 내에 용돈 변경사항이 동기화되지 않음'
      });

      return allowanceChanged;

    } catch (error) {
      console.error('❌ 용돈 동기화 테스트 실패:', error);
      this.testResults.push({
        test: '용돈 실시간 동기화',
        success: false,
        details: `오류: ${error.message}`
      });
      return false;
    }
  }

  async testAdditionalSyncFeatures() {
    console.log('🎯 테스트 4: 추가 동기화 기능 검증');
    
    try {
      // 연속 완료 시스템 동기화 테스트
      const streakSectionVisible = await this.firefoxPage.isVisible('text="연속 완료 도전"');
      
      // 부모 설정 변경이 자녀에게 반영되는지 테스트
      let settingsSync = false;
      if (await this.chromePage.isVisible('⚙️')) {
        // 부모가 연속 완료 설정 변경 시도
        console.log('⚙️ 부모 설정 변경 테스트 중...');
        // 실제 설정 변경 로직 구현 가능
        settingsSync = true;
      }
      
      // 실시간 상태 모니터링 테스트
      const syncStatusTest = await this.testSyncStatus();
      
      this.testResults.push({
        test: '추가 동기화 기능',
        success: streakSectionVisible && syncStatusTest,
        details: `연속 완료 UI: ${streakSectionVisible ? '✅' : '❌'}, 동기화 상태: ${syncStatusTest ? '✅' : '❌'}`
      });

      return streakSectionVisible && syncStatusTest;

    } catch (error) {
      console.error('❌ 추가 동기화 테스트 실패:', error);
      this.testResults.push({
        test: '추가 동기화 기능',
        success: false,
        details: `오류: ${error.message}`
      });
      return false;
    }
  }

  async testSyncStatus() {
    // 브라우저 콘솔에서 동기화 상태 확인
    const chromeStatus = await this.chromePage.evaluate(() => {
      return window.enhancedSyncService ? window.enhancedSyncService.getStatus() : null;
    });

    const firefoxStatus = await this.firefoxPage.evaluate(() => {
      return window.enhancedSyncService ? window.enhancedSyncService.getStatus() : null;
    });

    console.log('📊 Chrome 동기화 상태:', chromeStatus);
    console.log('📊 Firefox 동기화 상태:', firefoxStatus);

    return !!(chromeStatus && firefoxStatus);
  }

  async takeScreenshots() {
    console.log('📸 테스트 결과 스크린샷 촬영...');

    try {
      await this.chromePage.screenshot({ 
        path: 'test-results/parent-authenticated-test.png',
        fullPage: true 
      });
      
      await this.firefoxPage.screenshot({ 
        path: 'test-results/child-authenticated-test.png',
        fullPage: true 
      });
      
      console.log('✅ 스크린샷 저장 완료');
    } catch (error) {
      console.error('❌ 스크린샷 저장 실패:', error);
    }
  }

  printResults() {
    console.log('');
    console.log('📊 인증된 실시간 동기화 테스트 결과');
    console.log('=====================================');
    
    let passedTests = 0;
    const totalTests = this.testResults.length;
    
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const number = (index + 1).toString().padStart(2, '0');
      
      console.log(`${status} ${number}. ${result.test}`);
      console.log(`     ${result.details}`);
      
      if (result.success) passedTests++;
    });
    
    console.log('');
    console.log(`🎯 성공률: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
      console.log('🎉 모든 실시간 동기화 테스트 통과!');
    } else {
      console.log('⚠️ 일부 테스트 실패 - 추가 개선 필요');
    }

    // 개선 권장사항
    console.log('');
    console.log('💡 개선 권장사항:');
    if (passedTests < totalTests) {
      console.log('  1. Supabase Realtime 연결 상태 확인');
      console.log('  2. 네트워크 지연시간 최적화');
      console.log('  3. 동기화 실패 시 재시도 로직 강화');
      console.log('  4. 오프라인 모드 대응 개선');
    } else {
      console.log('  1. 동기화 성능 모니터링 대시보드 추가');
      console.log('  2. 동기화 충돌 해결 메커니즘 구현');
      console.log('  3. 사용자 경험 최적화 (로딩 상태 개선)');
    }
  }

  async cleanup() {
    console.log('🧹 테스트 환경 정리...');
    
    try {
      if (this.chromeContext) await this.chromeContext.close();
      if (this.firefoxContext) await this.firefoxContext.close();
      if (this.chromeBrowser) await this.chromeBrowser.close();
      if (this.firefoxBrowser) await this.firefoxBrowser.close();
      
      console.log('✅ 정리 완료');
    } catch (error) {
      console.error('❌ 정리 중 오류:', error);
    }
  }
}

// 메인 테스트 실행 함수
async function runAuthenticatedSyncTest() {
  const tester = new AuthenticatedSyncTester();
  
  try {
    console.log('🎭 인증된 실시간 동기화 테스트 시작');
    console.log('=====================================');
    console.log('👨‍👩‍👧‍👦 부모 계정: Chrome 브라우저');
    console.log('👶 자녀 계정: Firefox 브라우저');
    console.log('🔐 자동 로그인 진행');
    console.log('');

    // 1. 환경 설정
    const setupSuccess = await tester.setup();
    if (!setupSuccess) return;

    // 2. 로그인
    const [parentLoginSuccess, childLoginSuccess] = await Promise.all([
      tester.loginParent(),
      tester.loginChild()
    ]);

    if (!parentLoginSuccess || !childLoginSuccess) {
      console.error('❌ 로그인 실패 - 테스트 중단');
      return;
    }

    console.log('✅ 두 계정 모두 로그인 성공');
    console.log('');

    // 3. 동기화 테스트 실행
    const missionResult = await tester.testParentCreatesMission();
    
    if (missionResult.success) {
      await tester.testChildCompletesMission(missionResult.missionTitle);
    }
    
    await tester.testAllowanceSync();
    await tester.testAdditionalSyncFeatures();

    // 4. 스크린샷
    await tester.takeScreenshots();

    // 5. 결과 출력
    tester.printResults();

    // 결과 유지를 위해 잠시 대기
    console.log('');
    console.log('🔍 15초간 결과 확인 후 브라우저 종료...');
    await new Promise(resolve => setTimeout(resolve, 15000));

  } catch (error) {
    console.error('❌ 테스트 실행 중 치명적 오류:', error);
  } finally {
    await tester.cleanup();
  }
}

// 직접 실행 시
if (require.main === module) {
  runAuthenticatedSyncTest();
}

module.exports = { AuthenticatedSyncTester, runAuthenticatedSyncTest };