// Final Parent-Child Synchronization Test
// 최종 부모-자녀 계정 동기화 테스트

const { test, expect } = require('@playwright/test');

test.describe('최종 부모-자녀 계정 동기화 테스트', () => {
  
  const PARENT_EMAIL = 'melanius88@naver.com';
  const PARENT_PASSWORD = 'mela1499^^';
  const CHILD_EMAIL = 'seoha1117@naver.com';
  const CHILD_PASSWORD = 'mela1499^^';
  
  test('부모-자녀 계정 동시 테스트', async ({ browser }) => {
    console.log('=== 최종 부모-자녀 계정 동기화 테스트 시작 ===');
    
    // 두 개의 브라우저 컨텍스트 생성
    const parentContext = await browser.newContext();
    const childContext = await browser.newContext();
    
    const parentPage = await parentContext.newPage();
    const childPage = await childContext.newPage();
    
    // 콘솔 로그 캐처
    const parentLogs = [];
    const childLogs = [];
    
    parentPage.on('console', msg => {
      parentLogs.push(`[PARENT] ${msg.type()}: ${msg.text()}`);
      console.log(`[PARENT] ${msg.type()}: ${msg.text()}`);
    });
    
    childPage.on('console', msg => {
      childLogs.push(`[CHILD] ${msg.type()}: ${msg.text()}`);
      console.log(`[CHILD] ${msg.type()}: ${msg.text()}`);
    });
    
    try {
      // 1단계: 부모계정 로그인
      console.log('1단계: 부모계정 로그인 시작...');
      await parentPage.goto('http://localhost:3002/login');
      await parentPage.waitForLoadState('networkidle');
      
      // 부모계정 로그인
      const parentEmailInput = parentPage.locator('input#email');
      const parentPasswordInput = parentPage.locator('input#password');
      const parentLoginButton = parentPage.locator('button[type="submit"]:has-text("로그인")');
      
      await parentEmailInput.fill(PARENT_EMAIL);
      await parentPasswordInput.fill(PARENT_PASSWORD);
      await parentLoginButton.click();
      
      // 로그인 처리 대기
      await parentPage.waitForTimeout(5000);
      await parentPage.waitForLoadState('networkidle');
      
      console.log('부모계정 로그인 후 URL:', parentPage.url());
      await parentPage.screenshot({ path: 'test-results/parent-after-login.png', fullPage: true });
      
      // 2단계: 자녀계정 로그인
      console.log('2단계: 자녀계정 로그인 시작...');
      await childPage.goto('http://localhost:3002/login');
      await childPage.waitForLoadState('networkidle');
      
      // 자녀계정 로그인
      const childEmailInput = childPage.locator('input#email');
      const childPasswordInput = childPage.locator('input#password');
      const childLoginButton = childPage.locator('button[type="submit"]:has-text("로그인")');
      
      await childEmailInput.fill(CHILD_EMAIL);
      await childPasswordInput.fill(CHILD_PASSWORD);
      await childLoginButton.click();
      
      // 로그인 처리 대기
      await childPage.waitForTimeout(5000);
      await childPage.waitForLoadState('networkidle');
      
      console.log('자녀계정 로그인 후 URL:', childPage.url());
      await childPage.screenshot({ path: 'test-results/child-after-login.png', fullPage: true });
      
      // 3단계: 부모계정에서 미션 상태 확인
      console.log('3단계: 부모계정에서 미션 상태 확인...');
      
      // 페이지 내의 모든 텍스트 요소 확인
      const parentPageTexts = await parentPage.locator('body *').evaluateAll(elements =>
        elements
          .filter(el => el.textContent && el.textContent.trim().length > 0)
          .map(el => el.textContent.trim())
          .filter(text => text.includes('4000') || text.includes('사탕') || text.includes('미션') || text.includes('용돈'))
      );
      
      console.log('부모계정 페이지에서 발견된 관련 텍스트:', parentPageTexts.slice(0, 20));
      
      // 특별히 4000원 사탕 미션 찾기
      const parentCandyMission = await parentPage.locator('text=/사탕.*4000|4000.*사탕/i').count();
      console.log(`부모계정에서 사탕 4000원 미션 발견 수: ${parentCandyMission}`);
      
      // 4단계: 자녀계정에서 미션 상태 확인
      console.log('4단계: 자녀계정에서 미션 상태 확인...');
      
      const childPageTexts = await childPage.locator('body *').evaluateAll(elements =>
        elements
          .filter(el => el.textContent && el.textContent.trim().length > 0)
          .map(el => el.textContent.trim())
          .filter(text => text.includes('4000') || text.includes('사탕') || text.includes('미션') || text.includes('용돈'))
      );
      
      console.log('자녀계정 페이지에서 발견된 관련 텍스트:', childPageTexts.slice(0, 20));
      
      // 특별히 4000원 사탕 미션 찾기
      const childCandyMission = await childPage.locator('text=/사탕.*4000|4000.*사탕/i').count();
      console.log(`자녀계정에서 사탕 4000원 미션 발견 수: ${childCandyMission}`);
      
      // 5단계: 용돈 전달 완료 버튼 찾기 및 클릭 (부모계정에서)
      console.log('5단계: 부모계정에서 용돈 전달 완료 버튼 찾기...');
      
      const deliveryButtons = await parentPage.locator('button, [role="button"]').evaluateAll(elements =>
        elements.map(el => ({
          text: el.textContent?.trim(),
          className: el.className,
          visible: el.offsetParent !== null
        })).filter(btn => 
          btn.text && (
            btn.text.includes('전달') || 
            btn.text.includes('완료') || 
            btn.text.includes('승인') ||
            btn.text.includes('확인')
          )
        )
      );
      
      console.log('부모계정에서 발견된 전달/완료 관련 버튼들:', deliveryButtons);
      
      // 용돈 전달 완료 버튼 클릭 시도
      const deliveryButton = parentPage.locator('text=/용돈.*전달.*완료|전달.*완료|승인|확인/i').first();
      if (await deliveryButton.isVisible({ timeout: 3000 })) {
        console.log('✅ 용돈 전달 완료 버튼 발견 - 클릭 시도');
        await deliveryButton.click();
        await parentPage.waitForTimeout(3000);
        console.log('용돈 전달 완료 버튼 클릭 완료');
      } else {
        console.log('⚠️ 용돈 전달 완료 버튼을 찾을 수 없음');
      }
      
      // 6단계: 자녀계정에서 변화 확인
      console.log('6단계: 자녀계정에서 실시간 변화 확인...');
      
      // 페이지 새로고침 후 변화 확인
      await childPage.reload();
      await childPage.waitForLoadState('networkidle');
      await childPage.waitForTimeout(3000);
      
      const updatedChildPageTexts = await childPage.locator('body *').evaluateAll(elements =>
        elements
          .filter(el => el.textContent && el.textContent.trim().length > 0)
          .map(el => el.textContent.trim())
          .filter(text => text.includes('4000') || text.includes('사탕') || text.includes('미션') || text.includes('용돈'))
      );
      
      console.log('자녀계정 새로고침 후 관련 텍스트:', updatedChildPageTexts.slice(0, 20));
      
      const updatedChildCandyMission = await childPage.locator('text=/사탕.*4000|4000.*사탕/i').count();
      console.log(`자녀계정 새로고침 후 사탕 4000원 미션 발견 수: ${updatedChildCandyMission}`);
      
      // 7단계: 결과 분석
      console.log('7단계: 동기화 테스트 결과 분석...');
      
      console.log('=== 동기화 테스트 결과 ===');
      console.log(`부모계정에서 사탕 미션 발견: ${parentCandyMission > 0 ? '✅ 예' : '❌ 아니오'}`);
      console.log(`자녀계정에서 사탕 미션 발견 (로그인 직후): ${childCandyMission > 0 ? '✅ 예' : '❌ 아니오'}`);
      console.log(`자녀계정에서 사탕 미션 발견 (새로고침 후): ${updatedChildCandyMission > 0 ? '✅ 예' : '❌ 아니오'}`);
      
      if (parentCandyMission > 0 && childCandyMission === 0 && updatedChildCandyMission === 0) {
        console.log('🔍 문제점: 부모계정에서는 미션이 보이지만 자녀계정에서는 보이지 않음 (동기화 문제)');
      } else if (parentCandyMission > 0 && updatedChildCandyMission > 0) {
        console.log('✅ 동기화 성공: 부모와 자녀 계정 모두에서 미션 확인됨');
      } else if (parentCandyMission === 0 && childCandyMission === 0) {
        console.log('⚠️ 두 계정 모두에서 미션이 보이지 않음 (데이터 문제 가능성)');
      }
      
      // 8단계: 콘솔 로그 분석
      console.log('8단계: 콘솔 로그 분석...');
      analyzeLogs(parentLogs, childLogs);
      
      // 최종 스크린샷 촬영
      await parentPage.screenshot({ path: 'test-results/final-parent-state.png', fullPage: true });
      await childPage.screenshot({ path: 'test-results/final-child-state.png', fullPage: true });
      
      console.log('✅ 부모-자녀 계정 동기화 테스트 완료');
      
    } catch (error) {
      console.error('❌ 테스트 실행 중 오류 발생:', error);
      
      // 오류 발생 시 스크린샷
      await Promise.all([
        parentPage.screenshot({ path: 'test-results/error-parent.png', fullPage: true }),
        childPage.screenshot({ path: 'test-results/error-child.png', fullPage: true })
      ]);
      
      throw error;
    } finally {
      await parentContext.close();
      await childContext.close();
    }
  });
});

function analyzeLogs(parentLogs, childLogs) {
  console.log('\n=== 콘솔 로그 분석 결과 ===');
  
  console.log(`\n부모계정 로그 수: ${parentLogs.length}`);
  console.log(`자녀계정 로그 수: ${childLogs.length}`);
  
  // 동기화 관련 키워드 찾기
  const syncKeywords = ['sync', 'update', 'websocket', 'realtime', 'broadcast', 'supabase', '동기화'];
  const parentSyncLogs = parentLogs.filter(log => 
    syncKeywords.some(keyword => log.toLowerCase().includes(keyword))
  );
  const childSyncLogs = childLogs.filter(log => 
    syncKeywords.some(keyword => log.toLowerCase().includes(keyword))
  );
  
  console.log(`\n부모계정 동기화 관련 로그: ${parentSyncLogs.length}개`);
  parentSyncLogs.forEach(log => console.log(`  - ${log}`));
  
  console.log(`\n자녀계정 동기화 관련 로그: ${childSyncLogs.length}개`);
  childSyncLogs.forEach(log => console.log(`  - ${log}`));
  
  // 에러 로그 찾기
  const errorLogs = [...parentLogs, ...childLogs].filter(log => 
    log.includes('error') || log.includes('Error') || log.includes('ERROR')
  );
  
  console.log(`\n에러 로그: ${errorLogs.length}개`);
  errorLogs.forEach(log => console.log(`  ❌ ${log}`));
  
  // 성공 로그 찾기
  const successLogs = [...parentLogs, ...childLogs].filter(log => 
    log.includes('✅') || log.includes('success') || log.includes('Success')
  );
  
  console.log(`\n성공 로그: ${successLogs.length}개`);
  successLogs.forEach(log => console.log(`  ✅ ${log}`));
}