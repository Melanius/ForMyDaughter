const { chromium, firefox } = require('playwright');

/**
 * 🎭 실시간 동기화 테스트 환경
 * 
 * Chrome과 Firefox를 동시에 실행하여:
 * 1. 세션 완전 분리 확인
 * 2. 실시간 동기화 동작 검증
 * 3. 다중 브라우저 간 데이터 동기화 테스트
 */

class RealtimeSyncTester {
  constructor() {
    this.chromeBrowser = null;
    this.firefoxBrowser = null;
    this.chromeContext = null;
    this.firefoxContext = null;
    this.chromePage = null;
    this.firefoxPage = null;
    this.testResults = [];
  }

  async setup() {
    console.log('🚀 다중 브라우저 환경 초기화...');
    console.log('=====================================');

    try {
      // Chrome 브라우저 시작
      this.chromeBrowser = await chromium.launch({ 
        headless: false,
        slowMo: 500,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
      });

      // Firefox 브라우저 시작  
      this.firefoxBrowser = await firefox.launch({
        headless: false,
        slowMo: 500
      });

      // 각각 독립된 컨텍스트 생성
      this.chromeContext = await this.chromeBrowser.newContext({
        viewport: { width: 900, height: 1000 },
        userAgent: 'Chrome-SyncTest'
      });

      this.firefoxContext = await this.firefoxBrowser.newContext({
        viewport: { width: 900, height: 1000 },
        userAgent: 'Firefox-SyncTest'
      });

      // 페이지 생성
      this.chromePage = await this.chromeContext.newPage();
      this.firefoxPage = await this.firefoxContext.newPage();

      // 콘솔 로그 캡처
      this.chromePage.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'error') {
          console.log(`🟦 Chrome: ${msg.text()}`);
        }
      });

      this.firefoxPage.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'error') {
          console.log(`🦊 Firefox: ${msg.text()}`);
        }
      });

      console.log('✅ 다중 브라우저 환경 초기화 완료');
      return true;

    } catch (error) {
      console.error('❌ 브라우저 초기화 실패:', error);
      return false;
    }
  }

  async navigateBoth() {
    console.log('🌐 두 브라우저에서 앱 로드...');

    try {
      await Promise.all([
        this.chromePage.goto('http://localhost:3001'),
        this.firefoxPage.goto('http://localhost:3001')
      ]);

      // 페이지 타이틀 설정으로 구분
      await this.chromePage.evaluate(() => {
        document.title = '🟦 Chrome - ' + document.title;
      });

      await this.firefoxPage.evaluate(() => {
        document.title = '🦊 Firefox - ' + document.title;
      });

      console.log('✅ 두 브라우저 모두 앱 로드 완료');
      return true;

    } catch (error) {
      console.error('❌ 페이지 로드 실패:', error);
      return false;
    }
  }

  async waitForLogin() {
    console.log('🔐 로그인 대기 중...');
    console.log('=====================================');
    console.log('👤 수동 로그인 안내:');
    console.log('  🟦 Chrome: 자녀 계정으로 로그인');
    console.log('  🦊 Firefox: 부모 계정으로 로그인');
    console.log('  ⏰ 60초 후 자동으로 테스트 시작...');
    console.log('');

    // 로그인 대기 시간
    await new Promise(resolve => setTimeout(resolve, 60000));
    console.log('⏰ 로그인 시간 종료, 동기화 테스트 시작...');
  }

  async testBasicSync() {
    console.log('🔄 기본 동기화 테스트 시작...');

    try {
      // Chrome에서 미션 완료 시뮬레이션
      const chromeHasMissions = await this.chromePage.isVisible('button:has-text("완료")');
      
      if (chromeHasMissions) {
        console.log('🟦 Chrome: 미션 완료 버튼 클릭 시도...');
        await this.chromePage.click('button:has-text("완료")');
        
        // 동기화 대기
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Firefox에서 변경사항 확인
        await this.firefoxPage.reload();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const firefoxShowsCompleted = await this.firefoxPage.isVisible('text="완료됨"');
        
        this.testResults.push({
          test: '기본 동기화',
          success: firefoxShowsCompleted,
          details: firefoxShowsCompleted ? 
            'Chrome의 미션 완료가 Firefox에서 확인됨' : 
            'Firefox에서 변경사항이 확인되지 않음'
        });
        
        console.log(firefoxShowsCompleted ? '✅ 기본 동기화 성공' : '❌ 기본 동기화 실패');
      } else {
        console.log('⚠️ Chrome에 완료할 미션이 없음');
        this.testResults.push({
          test: '기본 동기화',
          success: false,
          details: '테스트할 미션이 없음'
        });
      }

    } catch (error) {
      console.error('❌ 기본 동기화 테스트 실패:', error);
      this.testResults.push({
        test: '기본 동기화',
        success: false,
        details: `오류: ${error.message}`
      });
    }
  }

  async testCrossUserSync() {
    console.log('👥 크로스 사용자 동기화 테스트...');

    try {
      // Firefox(부모)에서 미션 추가
      const firefoxCanAdd = await this.firefoxPage.isVisible('button:has-text("추가")');
      
      if (firefoxCanAdd) {
        console.log('🦊 Firefox: 새 미션 추가 시도...');
        await this.firefoxPage.click('button:has-text("추가")');
        
        // 미션 추가 폼 작성
        await this.firefoxPage.fill('input[placeholder*="제목"]', '실시간 동기화 테스트 미션');
        await this.firefoxPage.fill('textarea[placeholder*="설명"]', 'Firefox에서 생성한 테스트 미션입니다');
        await this.firefoxPage.fill('input[type="number"]', '2000');
        
        await this.firefoxPage.click('button[type="submit"]');
        console.log('🦊 Firefox: 미션 추가 완료');
        
        // 동기화 대기
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Chrome에서 새 미션 확인
        await this.chromePage.reload();
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const chromeHasNewMission = await this.chromePage.isVisible('text="실시간 동기화 테스트 미션"');
        
        this.testResults.push({
          test: '크로스 사용자 동기화',
          success: chromeHasNewMission,
          details: chromeHasNewMission ? 
            'Firefox의 미션 추가가 Chrome에서 확인됨' : 
            'Chrome에서 새 미션이 확인되지 않음'
        });
        
        console.log(chromeHasNewMission ? '✅ 크로스 사용자 동기화 성공' : '❌ 크로스 사용자 동기화 실패');
        
      } else {
        console.log('⚠️ Firefox에 미션 추가 권한 없음 (부모 계정이 아님)');
        this.testResults.push({
          test: '크로스 사용자 동기화',
          success: false,
          details: '부모 계정 권한 없음'
        });
      }

    } catch (error) {
      console.error('❌ 크로스 사용자 동기화 테스트 실패:', error);
      this.testResults.push({
        test: '크로스 사용자 동기화',
        success: false,
        details: `오류: ${error.message}`
      });
    }
  }

  async testSyncSpeed() {
    console.log('⚡ 동기화 속도 테스트...');

    try {
      const startTime = Date.now();
      
      // Chrome에서 액션 수행
      const actionAvailable = await this.chromePage.isVisible('button:has-text("완료"), button:has-text("취소")');
      
      if (actionAvailable) {
        await this.chromePage.click('button:has-text("완료"), button:has-text("취소")');
        
        // Firefox에서 변경사항이 나타날 때까지 대기 (최대 10초)
        let syncDetected = false;
        const maxWaitTime = 10000;
        
        for (let i = 0; i < maxWaitTime / 500; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.firefoxPage.reload();
          
          // 변경사항 확인 (예: 완료됨 텍스트 또는 버튼 상태 변경)
          const hasChanges = await this.firefoxPage.isVisible('text="완료됨", text="미완료"');
          if (hasChanges) {
            syncDetected = true;
            break;
          }
        }
        
        const syncTime = Date.now() - startTime;
        
        this.testResults.push({
          test: '동기화 속도',
          success: syncDetected,
          details: syncDetected ? 
            `동기화 완료 시간: ${syncTime}ms` : 
            `${maxWaitTime}ms 내에 동기화되지 않음`
        });
        
        console.log(syncDetected ? 
          `✅ 동기화 속도: ${syncTime}ms` : 
          `❌ 동기화 타임아웃 (${maxWaitTime}ms)`
        );
        
      } else {
        this.testResults.push({
          test: '동기화 속도',
          success: false,
          details: '테스트할 액션이 없음'
        });
      }

    } catch (error) {
      console.error('❌ 동기화 속도 테스트 실패:', error);
      this.testResults.push({
        test: '동기화 속도',
        success: false,
        details: `오류: ${error.message}`
      });
    }
  }

  async takeScreenshots() {
    console.log('📸 테스트 결과 스크린샷 촬영...');

    try {
      await this.chromePage.screenshot({ 
        path: 'test-results/chrome-realtime-test.png',
        fullPage: true 
      });
      
      await this.firefoxPage.screenshot({ 
        path: 'test-results/firefox-realtime-test.png',
        fullPage: true 
      });
      
      console.log('✅ 스크린샷 저장 완료');
    } catch (error) {
      console.error('❌ 스크린샷 저장 실패:', error);
    }
  }

  printResults() {
    console.log('');
    console.log('📊 실시간 동기화 테스트 결과');
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
      console.log('🎉 모든 동기화 테스트 통과!');
    } else {
      console.log('⚠️ 일부 동기화 테스트 실패 - 개선 필요');
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
async function runRealtimeSyncTest() {
  const tester = new RealtimeSyncTester();
  
  try {
    console.log('🎭 실시간 동기화 테스트 시작');
    console.log('=====================================');
    console.log('🔧 테스트 환경: Chrome + Firefox');
    console.log('🎯 목표: 다중 브라우저 실시간 동기화 검증');
    console.log('');

    // 1. 환경 설정
    const setupSuccess = await tester.setup();
    if (!setupSuccess) {
      console.error('❌ 환경 설정 실패');
      return;
    }

    // 2. 앱 로드
    const loadSuccess = await tester.navigateBoth();
    if (!loadSuccess) {
      console.error('❌ 앱 로드 실패');
      return;
    }

    // 3. 로그인 대기
    await tester.waitForLogin();

    // 4. 테스트 실행
    await tester.testBasicSync();
    await tester.testCrossUserSync();
    await tester.testSyncSpeed();

    // 5. 스크린샷
    await tester.takeScreenshots();

    // 6. 결과 출력
    tester.printResults();

    console.log('');
    console.log('💡 추가 개선 사항:');
    console.log('  1. WebSocket 연결 상태 모니터링');
    console.log('  2. 오프라인 모드 동기화 대기열');
    console.log('  3. 충돌 해결 메커니즘');
    console.log('  4. 동기화 실패 시 자동 재시도');

    // 결과 유지를 위해 잠시 대기
    console.log('');
    console.log('🔄 10초 후 브라우저 종료...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ 테스트 실행 중 치명적 오류:', error);
  } finally {
    await tester.cleanup();
  }
}

// 직접 실행 시
if (require.main === module) {
  runRealtimeSyncTest();
}

module.exports = { RealtimeSyncTester, runRealtimeSyncTest };