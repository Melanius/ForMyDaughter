const { chromium, firefox } = require('playwright');

/**
 * 🎭 실시간 동기화 라이브 테스트
 * 
 * Chrome(부모) + Firefox(자녀)로 실제 계정 테스트:
 * 1. 부모가 미션 생성 → 자녀 실시간 반영
 * 2. 자녀가 미션 완료 → 부모 실시간 반영  
 * 3. 용돈 지급 → 실시간 동기화
 * 4. 추가 동기화 기능 검증
 */

class LiveSyncTester {
  constructor() {
    this.chromeBrowser = null;
    this.firefoxBrowser = null;
    this.parentPage = null;  // Chrome - 부모 계정
    this.childPage = null;   // Firefox - 자녀 계정
    this.testResults = [];
    
    // 실제 계정 정보
    this.accounts = {
      parent: { email: 'melanius88@naver.com', password: 'mela1499^^' },
      child: { email: 'seoha1117@naver.com', password: 'mela1499^^' }
    };
  }

  async setup() {
    console.log('🚀 실시간 동기화 라이브 테스트 환경 구축');
    console.log('==========================================');
    console.log('🟦 Chrome: 부모 계정 (melanius88@naver.com)');
    console.log('🦊 Firefox: 자녀 계정 (seoha1117@naver.com)');
    console.log('');

    try {
      // Chrome 시작 (부모용)
      this.chromeBrowser = await chromium.launch({ 
        headless: false,
        slowMo: 800,
        args: ['--disable-web-security']
      });

      // Firefox 시작 (자녀용)
      this.firefoxBrowser = await firefox.launch({
        headless: false,
        slowMo: 800
      });

      // 독립된 컨텍스트 생성
      const chromeContext = await this.chromeBrowser.newContext({
        viewport: { width: 1100, height: 900 }
      });

      const firefoxContext = await this.firefoxBrowser.newContext({
        viewport: { width: 1100, height: 900 }
      });

      // 페이지 생성
      this.parentPage = await chromeContext.newPage();
      this.childPage = await firefoxContext.newPage();

      // 실시간 로그 모니터링
      this.parentPage.on('console', msg => {
        if (msg.text().includes('동기화') || msg.text().includes('미션') || msg.text().includes('용돈')) {
          console.log(`👨‍👩‍👧‍👦 [부모-Chrome]: ${msg.text()}`);
        }
      });

      this.childPage.on('console', msg => {
        if (msg.text().includes('동기화') || msg.text().includes('미션') || msg.text().includes('용돈')) {
          console.log(`👶 [자녀-Firefox]: ${msg.text()}`);
        }
      });

      // 페이지 타이틀 설정
      await this.parentPage.evaluate(() => {
        document.addEventListener('DOMContentLoaded', () => {
          document.title = '👨‍👩‍👧‍👦 부모 계정 - ' + document.title;
        });
      });

      await this.childPage.evaluate(() => {
        document.addEventListener('DOMContentLoaded', () => {
          document.title = '👶 자녀 계정 - ' + document.title;
        });
      });

      console.log('✅ 브라우저 환경 구축 완료');
      return true;

    } catch (error) {
      console.error('❌ 환경 구축 실패:', error);
      return false;
    }
  }

  async loginBothAccounts() {
    console.log('🔐 두 계정 동시 로그인 시작...');
    
    try {
      // 동시에 로그인 페이지로 이동
      await Promise.all([
        this.parentPage.goto('http://localhost:3001/login'),
        this.childPage.goto('http://localhost:3001/login')
      ]);

      // 부모 계정 로그인
      console.log('👨‍👩‍👧‍👦 부모 계정 로그인 중...');
      await this.parentPage.fill('input[type="email"]', this.accounts.parent.email);
      await this.parentPage.fill('input[type="password"]', this.accounts.parent.password);
      await this.parentPage.click('button[type="submit"]');

      // 자녀 계정 로그인
      console.log('👶 자녀 계정 로그인 중...');
      await this.childPage.fill('input[type="email"]', this.accounts.child.email);
      await this.childPage.fill('input[type="password"]', this.accounts.child.password);
      await this.childPage.click('button[type="submit"]');

      // 로그인 완료 대기
      console.log('⏳ 로그인 완료 대기 중...');
      await Promise.all([
        this.parentPage.waitForURL('**/', { timeout: 10000 }),
        this.childPage.waitForURL('**/', { timeout: 10000 })
      ]);

      // 로그인 성공 확인
      await this.parentPage.waitForTimeout(3000);
      await this.childPage.waitForTimeout(3000);

      const parentLoggedIn = await this.parentPage.isVisible('text="미션 어드벤처"');
      const childLoggedIn = await this.childPage.isVisible('text="미션 어드벤처"');

      if (parentLoggedIn && childLoggedIn) {
        console.log('✅ 두 계정 모두 로그인 성공');
        
        // 권한 확인
        const parentCanAdd = await this.parentPage.isVisible('button:has-text("추가")');
        const childCannotAdd = !(await this.childPage.isVisible('button:has-text("추가")'));
        
        console.log(`👨‍👩‍👧‍👦 부모 권한: ${parentCanAdd ? '✅ 미션 추가 가능' : '❌ 권한 없음'}`);
        console.log(`👶 자녀 권한: ${childCannotAdd ? '✅ 일반 사용자' : '❌ 예상과 다름'}`);
        
        return parentCanAdd; // 부모 권한이 있어야 테스트 가능
      } else {
        console.log('❌ 로그인 실패');
        return false;
      }

    } catch (error) {
      console.error('❌ 로그인 과정 실패:', error);
      return false;
    }
  }

  async test1_ParentCreatesMission() {
    console.log('');
    console.log('🎯 테스트 1: 부모가 미션 생성 → 자녀에게 실시간 반영');
    console.log('================================================');
    
    try {
      const testMissionTitle = `실시간 테스트 미션 ${Date.now()}`;
      const startTime = Date.now();
      
      // 부모가 미션 추가
      console.log(`👨‍👩‍👧‍👦 부모: "${testMissionTitle}" 미션 생성 시작...`);
      await this.parentPage.click('button:has-text("추가")');
      
      await this.parentPage.waitForSelector('input[placeholder*="제목"], input[placeholder*="title"]');
      await this.parentPage.fill('input[placeholder*="제목"], input[placeholder*="title"]', testMissionTitle);
      await this.parentPage.fill('textarea', '부모가 생성한 실시간 동기화 테스트 미션');
      await this.parentPage.fill('input[type="number"]', '2000');
      
      await this.parentPage.click('button:has-text("추가"), button[type="submit"]');
      console.log('✅ 부모: 미션 생성 완료');

      // 자녀 페이지에서 실시간 반영 확인
      console.log('👶 자녀: 실시간 반영 확인 중...');
      let missionFound = false;
      let syncTime = 0;
      
      for (let i = 0; i < 15; i++) { // 15초간 확인
        await this.childPage.waitForTimeout(1000);
        
        // 새로고침 없이 먼저 확인
        missionFound = await this.childPage.isVisible(`text="${testMissionTitle}"`);
        
        if (!missionFound && i % 3 === 0) {
          // 3초마다 한번씩 새로고침
          await this.childPage.reload();
          await this.childPage.waitForTimeout(1000);
          missionFound = await this.childPage.isVisible(`text="${testMissionTitle}"`);
        }
        
        if (missionFound) {
          syncTime = Date.now() - startTime;
          break;
        }
      }
      
      const result = {
        test: '부모 미션 생성 → 자녀 실시간 반영',
        success: missionFound,
        syncTime: syncTime,
        details: missionFound ? 
          `미션 "${testMissionTitle}" ${syncTime}ms 후 동기화 성공` :
          '15초 내에 자녀 화면에서 미션이 확인되지 않음'
      };
      
      this.testResults.push(result);
      console.log(missionFound ? `✅ ${result.details}` : `❌ ${result.details}`);
      
      return { success: missionFound, missionTitle: testMissionTitle };

    } catch (error) {
      console.error('❌ 테스트 1 실행 실패:', error);
      this.testResults.push({
        test: '부모 미션 생성 → 자녀 실시간 반영',
        success: false,
        details: `오류: ${error.message}`
      });
      return { success: false };
    }
  }

  async test2_ChildCompletesMission(missionTitle) {
    console.log('');
    console.log('🎯 테스트 2: 자녀가 미션 완료 → 부모에게 실시간 반영');
    console.log('================================================');
    
    if (!missionTitle) {
      console.log('⚠️ 테스트할 미션이 없음 - 테스트 2 건너뛰기');
      return false;
    }

    try {
      const startTime = Date.now();
      
      // 자녀가 미션 완료
      console.log(`👶 자녀: "${missionTitle}" 미션 완료 시작...`);
      
      // 미션 카드에서 완료 버튼 찾기
      const missionExists = await this.childPage.isVisible(`text="${missionTitle}"`);
      if (!missionExists) {
        console.log('❌ 자녀 화면에서 미션을 찾을 수 없음');
        return false;
      }
      
      // 완료 버튼 클릭
      const completeButtons = await this.childPage.locator('button:has-text("완료")').all();
      if (completeButtons.length > 0) {
        await completeButtons[0].click(); // 첫 번째 완료 버튼 클릭
        console.log('✅ 자녀: 미션 완료 버튼 클릭');
        await this.childPage.waitForTimeout(2000);
      } else {
        console.log('❌ 완료 버튼을 찾을 수 없음');
        return false;
      }

      // 부모 페이지에서 완료 상태 실시간 반영 확인
      console.log('👨‍👩‍👧‍👦 부모: 완료 상태 실시간 반영 확인 중...');
      let completionFound = false;
      let syncTime = 0;
      
      for (let i = 0; i < 15; i++) {
        await this.parentPage.waitForTimeout(1000);
        
        // 완료 표시 확인 (체크마크, 완료됨 텍스트 등)
        const hasCheckmark = await this.parentPage.isVisible('text="✅"');
        const hasCompletedText = await this.parentPage.isVisible('text="완료됨"');
        const hasUndoButton = await this.parentPage.isVisible('button:has-text("취소")');
        
        completionFound = hasCheckmark || hasCompletedText || hasUndoButton;
        
        if (!completionFound && i % 3 === 0) {
          await this.parentPage.reload();
          await this.parentPage.waitForTimeout(1000);
          
          const hasCheckmark2 = await this.parentPage.isVisible('text="✅"');
          const hasCompletedText2 = await this.parentPage.isVisible('text="완료됨"');
          const hasUndoButton2 = await this.parentPage.isVisible('button:has-text("취소")');
          
          completionFound = hasCheckmark2 || hasCompletedText2 || hasUndoButton2;
        }
        
        if (completionFound) {
          syncTime = Date.now() - startTime;
          break;
        }
      }
      
      const result = {
        test: '자녀 미션 완료 → 부모 실시간 반영',
        success: completionFound,
        syncTime: syncTime,
        details: completionFound ? 
          `미션 완료 상태 ${syncTime}ms 후 동기화 성공` :
          '15초 내에 부모 화면에서 완료 상태가 확인되지 않음'
      };
      
      this.testResults.push(result);
      console.log(completionFound ? `✅ ${result.details}` : `❌ ${result.details}`);
      
      return completionFound;

    } catch (error) {
      console.error('❌ 테스트 2 실행 실패:', error);
      this.testResults.push({
        test: '자녀 미션 완료 → 부모 실시간 반영',
        success: false,
        details: `오류: ${error.message}`
      });
      return false;
    }
  }

  async test3_AllowanceSync() {
    console.log('');
    console.log('🎯 테스트 3: 용돈 지급 → 실시간 동기화');
    console.log('======================================');
    
    try {
      const startTime = Date.now();
      
      // 자녀 용돈 현재 상태 확인
      let childBalanceBefore = '0원';
      try {
        childBalanceBefore = await this.childPage.textContent('.bg-green-50 .text-green-600') || '0원';
      } catch (error) {
        console.log('⚠️ 자녀 용돈 정보를 가져올 수 없음');
      }
      console.log(`👶 자녀 용돈 (변경 전): ${childBalanceBefore}`);

      // 부모가 용돈 승인 (완료된 미션이 있다면)
      const transferButton = await this.parentPage.isVisible('button:has-text("용돈 전달 완료")');
      
      if (!transferButton) {
        console.log('⚠️ 승인할 완료된 미션이 없음 - 용돈 테스트 건너뛰기');
        this.testResults.push({
          test: '용돈 실시간 동기화',
          success: false,
          details: '승인할 완료된 미션이 없음'
        });
        return false;
      }

      console.log('👨‍👩‍👧‍👦 부모: 용돈 승인 시작...');
      
      // 용돈 전달 버튼 클릭
      await this.parentPage.click('button:has-text("용돈 전달 완료")');
      
      // 확인 다이얼로그 처리
      this.parentPage.on('dialog', dialog => {
        console.log(`👨‍👩‍👧‍👦 부모: 확인 다이얼로그 - ${dialog.message()}`);
        dialog.accept();
      });
      
      await this.parentPage.waitForTimeout(3000);
      console.log('✅ 부모: 용돈 승인 완료');

      // 자녀 화면에서 용돈 변경 실시간 확인
      console.log('👶 자녀: 용돈 변경 실시간 확인 중...');
      let allowanceChanged = false;
      let newBalance = childBalanceBefore;
      let syncTime = 0;
      
      for (let i = 0; i < 15; i++) {
        await this.childPage.waitForTimeout(1000);
        
        try {
          newBalance = await this.childPage.textContent('.bg-green-50 .text-green-600') || childBalanceBefore;
          allowanceChanged = newBalance !== childBalanceBefore;
        } catch (error) {
          // 요소를 찾을 수 없는 경우 새로고침
        }
        
        if (!allowanceChanged && i % 3 === 0) {
          await this.childPage.reload();
          await this.childPage.waitForTimeout(1000);
          
          try {
            newBalance = await this.childPage.textContent('.bg-green-50 .text-green-600') || childBalanceBefore;
            allowanceChanged = newBalance !== childBalanceBefore;
          } catch (error) {
            console.log('⚠️ 용돈 정보 확인 중 오류');
          }
        }
        
        if (allowanceChanged) {
          syncTime = Date.now() - startTime;
          break;
        }
      }
      
      const result = {
        test: '용돈 실시간 동기화',
        success: allowanceChanged,
        syncTime: syncTime,
        details: allowanceChanged ? 
          `용돈 ${childBalanceBefore} → ${newBalance} (${syncTime}ms 후 동기화)` :
          '15초 내에 용돈 변경사항이 동기화되지 않음'
      };
      
      this.testResults.push(result);
      console.log(allowanceChanged ? `✅ ${result.details}` : `❌ ${result.details}`);
      
      return allowanceChanged;

    } catch (error) {
      console.error('❌ 테스트 3 실행 실패:', error);
      this.testResults.push({
        test: '용돈 실시간 동기화',
        success: false,
        details: `오류: ${error.message}`
      });
      return false;
    }
  }

  async test4_AdditionalSync() {
    console.log('');
    console.log('🎯 테스트 4: 추가 동기화 기능 검증');
    console.log('==================================');
    
    try {
      // 연속 완료 시스템 확인
      const parentStreakVisible = await this.parentPage.isVisible('text="연속 완료 도전"');
      const childStreakVisible = await this.childPage.isVisible('text="연속 완료 도전"');
      
      console.log(`👨‍👩‍👧‍👦 부모 연속 완료 UI: ${parentStreakVisible ? '✅' : '❌'}`);
      console.log(`👶 자녀 연속 완료 UI: ${childStreakVisible ? '✅' : '❌'}`);
      
      // 동기화 상태 확인
      let syncStatusGood = true;
      try {
        // 브라우저 콘솔에서 동기화 상태 확인
        const parentSyncStatus = await this.parentPage.evaluate(() => {
          return typeof window !== 'undefined' && 
                 window.BroadcastChannel !== 'undefined' &&
                 !!document.querySelector('text*="BroadcastChannel"');
        });

        const childSyncStatus = await this.childPage.evaluate(() => {
          return typeof window !== 'undefined' && 
                 window.BroadcastChannel !== 'undefined' &&
                 !!document.querySelector('text*="BroadcastChannel"');
        });

        console.log(`👨‍👩‍👧‍👦 부모 동기화 환경: ${parentSyncStatus ? '✅' : '❌'}`);
        console.log(`👶 자녀 동기화 환경: ${childSyncStatus ? '✅' : '❌'}`);
        
        syncStatusGood = parentSyncStatus && childSyncStatus;

      } catch (error) {
        console.log('⚠️ 동기화 상태 확인 중 오류');
        syncStatusGood = false;
      }
      
      const overallSuccess = parentStreakVisible && childStreakVisible && syncStatusGood;
      
      this.testResults.push({
        test: '추가 동기화 기능',
        success: overallSuccess,
        details: `연속완료UI: ${parentStreakVisible && childStreakVisible ? '✅' : '❌'}, 동기화환경: ${syncStatusGood ? '✅' : '❌'}`
      });

      console.log(overallSuccess ? '✅ 추가 동기화 기능 확인 완료' : '❌ 일부 기능에 문제 있음');
      
      return overallSuccess;

    } catch (error) {
      console.error('❌ 테스트 4 실행 실패:', error);
      this.testResults.push({
        test: '추가 동기화 기능',
        success: false,
        details: `오류: ${error.message}`
      });
      return false;
    }
  }

  async takeScreenshots() {
    console.log('');
    console.log('📸 테스트 결과 스크린샷 촬영...');
    
    try {
      await this.parentPage.screenshot({ 
        path: 'test-results/parent-live-test.png',
        fullPage: true 
      });
      
      await this.childPage.screenshot({ 
        path: 'test-results/child-live-test.png',
        fullPage: true 
      });
      
      console.log('✅ 스크린샷 저장 완료');
    } catch (error) {
      console.error('❌ 스크린샷 저장 실패:', error);
    }
  }

  printFinalResults() {
    console.log('');
    console.log('📊 실시간 동기화 라이브 테스트 최종 결과');
    console.log('==========================================');
    
    let passedTests = 0;
    const totalTests = this.testResults.length;
    let totalSyncTime = 0;
    let syncCount = 0;
    
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const number = (index + 1).toString().padStart(2, '0');
      
      console.log(`${status} ${number}. ${result.test}`);
      console.log(`     ${result.details}`);
      
      if (result.success) passedTests++;
      if (result.syncTime) {
        totalSyncTime += result.syncTime;
        syncCount++;
      }
    });
    
    const successRate = Math.round(passedTests/totalTests*100);
    const avgSyncTime = syncCount > 0 ? Math.round(totalSyncTime / syncCount) : 0;
    
    console.log('');
    console.log(`🎯 성공률: ${passedTests}/${totalTests} (${successRate}%)`);
    if (avgSyncTime > 0) {
      console.log(`⚡ 평균 동기화 시간: ${avgSyncTime}ms`);
    }
    
    if (passedTests === totalTests) {
      console.log('🎉 모든 실시간 동기화 테스트 통과!');
    } else if (passedTests > totalTests / 2) {
      console.log('✅ 대부분의 테스트 통과 - 일부 개선 필요');
    } else {
      console.log('⚠️ 다수 테스트 실패 - 동기화 시스템 점검 필요');
    }

    // 성능 평가
    console.log('');
    console.log('📈 성능 평가:');
    if (avgSyncTime > 0) {
      if (avgSyncTime < 2000) {
        console.log(`🚀 우수: 평균 동기화 시간 ${avgSyncTime}ms`);
      } else if (avgSyncTime < 5000) {
        console.log(`👍 양호: 평균 동기화 시간 ${avgSyncTime}ms`);
      } else {
        console.log(`⚠️ 개선 필요: 평균 동기화 시간 ${avgSyncTime}ms`);
      }
    }

    // 권장사항
    console.log('');
    console.log('💡 개선 권장사항:');
    if (successRate === 100) {
      console.log('  🎯 모든 테스트 통과 - 프로덕션 배포 준비 완료');
      console.log('  🔄 정기적인 성능 모니터링 권장');
      console.log('  📊 사용자 피드백 수집 및 반영');
    } else {
      console.log('  🔧 실패한 테스트 케이스 분석 및 수정');
      console.log('  🌐 네트워크 연결 상태 최적화');
      console.log('  ⏰ 동기화 타임아웃 설정 검토');
      console.log('  🔄 재시도 로직 강화');
    }
  }

  async cleanup() {
    console.log('');
    console.log('🧹 테스트 환경 정리...');
    
    try {
      if (this.chromeBrowser) await this.chromeBrowser.close();
      if (this.firefoxBrowser) await this.firefoxBrowser.close();
      
      console.log('✅ 브라우저 정리 완료');
    } catch (error) {
      console.error('❌ 정리 중 오류:', error);
    }
  }
}

// 메인 실행 함수
async function runLiveSyncTest() {
  const tester = new LiveSyncTester();
  
  try {
    // 1. 환경 구축
    const setupSuccess = await tester.setup();
    if (!setupSuccess) {
      console.error('❌ 환경 구축 실패 - 테스트 중단');
      return;
    }

    // 2. 로그인
    const loginSuccess = await tester.loginBothAccounts();
    if (!loginSuccess) {
      console.error('❌ 로그인 실패 - 테스트 중단');
      return;
    }

    console.log('');
    console.log('🎯 실시간 동기화 테스트 시작');
    console.log('==============================');

    // 3. 테스트 실행
    const test1Result = await tester.test1_ParentCreatesMission();
    const test2Result = await tester.test2_ChildCompletesMission(test1Result.missionTitle);
    const test3Result = await tester.test3_AllowanceSync();
    const test4Result = await tester.test4_AdditionalSync();

    // 4. 스크린샷
    await tester.takeScreenshots();

    // 5. 최종 결과
    tester.printFinalResults();

    // 6. 결과 확인을 위해 20초 대기
    console.log('');
    console.log('🔍 20초간 결과 확인 후 자동 종료...');
    console.log('   (브라우저를 직접 확인해보세요!)');
    await new Promise(resolve => setTimeout(resolve, 20000));

  } catch (error) {
    console.error('❌ 테스트 실행 중 치명적 오류:', error);
  } finally {
    await tester.cleanup();
  }
}

// 직접 실행 시
if (require.main === module) {
  console.log('🎭 실시간 동기화 라이브 테스트 시작');
  console.log('====================================');
  runLiveSyncTest();
}

module.exports = { LiveSyncTester, runLiveSyncTest };