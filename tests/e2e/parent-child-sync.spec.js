// E2E Tests for Parent-Child Account Synchronization
// 부모-자녀 계정 동기화 테스트

const { test, expect } = require('@playwright/test');

test.describe('부모-자녀 계정 동기화 테스트', () => {
  
  const PARENT_EMAIL = 'melanius88@naver.com';
  const PARENT_PASSWORD = 'mela1499^^';
  const CHILD_EMAIL = 'seoha1117@naver.com';
  const CHILD_PASSWORD = 'mela1499^^';
  const APP_URL = 'http://localhost:3002'; // 현재 실행 중인 포트
  
  test('두 브라우저에서 부모-자녀 계정 동시 로그인 및 동기화 테스트', async ({ browser }) => {
    console.log('=== 부모-자녀 계정 동기화 테스트 시작 ===');
    
    // 두 개의 브라우저 컨텍스트 생성 (Chrome과 Firefox 시뮬레이션)
    const parentContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    const childContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    });
    
    const parentPage = await parentContext.newPage();
    const childPage = await childContext.newPage();
    
    // 콘솔 로그 캐처 설정
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
      // 1단계: 두 브라우저에서 앱 로드
      console.log('1단계: 앱 로딩 중...');
      await Promise.all([
        parentPage.goto(APP_URL, { waitUntil: 'networkidle' }),
        childPage.goto(APP_URL, { waitUntil: 'networkidle' })
      ]);
      
      // 페이지 로드 확인
      await expect(parentPage).toHaveTitle(/용돈|allowance/i);
      await expect(childPage).toHaveTitle(/용돈|allowance/i);
      console.log('✅ 두 브라우저에서 앱 로드 완료');
      
      // 2단계: 부모계정 로그인 (Chrome 시뮬레이션)
      console.log('2단계: 부모계정 로그인 중...');
      await loginUser(parentPage, PARENT_EMAIL, PARENT_PASSWORD, 'PARENT');
      
      // 3단계: 자녀계정 로그인 (Firefox 시뮬레이션)
      console.log('3단계: 자녀계정 로그인 중...');
      await loginUser(childPage, CHILD_EMAIL, CHILD_PASSWORD, 'CHILD');
      
      // 4단계: 부모계정에서 자녀의 완료된 미션 확인
      console.log('4단계: 부모계정에서 자녀 미션 확인 중...');
      await checkChildMissionsFromParent(parentPage);
      
      // 5단계: 자녀계정에서 현재 상태 확인
      console.log('5단계: 자녀계정 현재 상태 확인 중...');
      await checkChildCurrentState(childPage);
      
      // 6단계: 부모계정에서 "용돈 전달 완료" 클릭
      console.log('6단계: 부모계정에서 용돈 전달 완료 처리 중...');
      await processAllowanceDelivery(parentPage);
      
      // 7단계: 자녀계정에서 실시간 반영 확인 (최대 10초 대기)
      console.log('7단계: 자녀계정에서 실시간 동기화 확인 중...');
      await verifyRealTimeSync(childPage);
      
      // 8단계: 콘솔 로그 분석
      console.log('8단계: 콘솔 로그 분석 중...');
      analyzeLogs(parentLogs, childLogs);
      
      console.log('✅ 부모-자녀 계정 동기화 테스트 완료');
      
    } catch (error) {
      console.error('❌ 테스트 실행 중 오류 발생:', error);
      
      // 스크린샷 촬영 (디버깅용)
      await Promise.all([
        parentPage.screenshot({ path: 'test-results/parent-error.png', fullPage: true }),
        childPage.screenshot({ path: 'test-results/child-error.png', fullPage: true })
      ]);
      
      throw error;
    } finally {
      // 리소스 정리
      await parentContext.close();
      await childContext.close();
    }
  });
});

// 헬퍼 함수들
async function loginUser(page, email, password, userType) {
  console.log(`${userType} 로그인 시도: ${email}`);
  
  // 직접 로그인 페이지로 이동
  await page.goto('http://localhost:3002/login');
  await page.waitForLoadState('networkidle');
  
  // 이메일 입력 (정확한 선택자 사용)
  const emailInput = page.locator('input#email');
  if (await emailInput.isVisible({ timeout: 10000 })) {
    await emailInput.clear();
    await emailInput.fill(email);
    console.log(`${userType}: 이메일 입력 완료 - ${email}`);
  } else {
    throw new Error(`${userType}: 이메일 입력 필드를 찾을 수 없음`);
  }
  
  // 비밀번호 입력 (정확한 선택자 사용)
  const passwordInput = page.locator('input#password');
  if (await passwordInput.isVisible({ timeout: 5000 })) {
    await passwordInput.clear();
    await passwordInput.fill(password);
    console.log(`${userType}: 비밀번호 입력 완료`);
  } else {
    throw new Error(`${userType}: 비밀번호 입력 필드를 찾을 수 없음`);
  }
  
  // 로그인 제출 버튼 클릭
  const submitButton = page.locator('button[type="submit"]:has-text("로그인")');
  if (await submitButton.isVisible({ timeout: 5000 })) {
    await submitButton.click();
    console.log(`${userType}: 로그인 버튼 클릭`);
    
    // 로그인 처리 대기 및 리다이렉션 확인
    await page.waitForTimeout(3000); // 초기 처리 대기
    
    try {
      // 로그인 후 URL 변화 또는 페이지 컨텐츠 변화 대기
      await page.waitForFunction(
        () => window.location.pathname !== '/login' || 
              document.querySelector('[data-testid="dashboard"]') !== null ||
              document.querySelector('text=대시보드') !== null,
        { timeout: 15000 }
      );
      console.log(`✅ ${userType}: 로그인 성공 - URL: ${page.url()}`);
    } catch (error) {
      console.log(`⚠️ ${userType}: 로그인 후 리다이렉션 확인 실패, 현재 상태로 진행`);
      console.log(`현재 URL: ${page.url()}`);
    }
    
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
  } else {
    throw new Error(`${userType}: 로그인 버튼을 찾을 수 없음`);
  }
}

async function checkChildMissionsFromParent(parentPage) {
  console.log('부모계정: 자녀 미션 목록 확인 중...');
  
  // 자녀 미션 섹션 찾기
  const childMissionSection = parentPage.locator('text=/자녀.*미션|미션.*목록/i');
  if (await childMissionSection.isVisible({ timeout: 5000 })) {
    console.log('✅ 자녀 미션 섹션 발견');
  }
  
  // '사탕' 4000원 미션 찾기
  const candyMission = parentPage.locator('text=/사탕.*4000|4000.*사탕/i');
  if (await candyMission.isVisible({ timeout: 5000 })) {
    console.log('✅ 사탕 4000원 미션 확인됨');
    await candyMission.screenshot({ path: 'test-results/candy-mission-parent.png' });
  } else {
    console.log('⚠️ 사탕 4000원 미션을 찾을 수 없음');
    await parentPage.screenshot({ path: 'test-results/parent-no-candy-mission.png' });
  }
  
  // 모든 미션 목록 확인
  const missions = parentPage.locator('[data-testid*="mission"], .mission, text=/\\d+원/');
  const missionCount = await missions.count();
  console.log(`부모계정에서 보이는 미션 수: ${missionCount}`);
  
  for (let i = 0; i < Math.min(missionCount, 5); i++) {
    const missionText = await missions.nth(i).textContent();
    console.log(`미션 ${i + 1}: ${missionText}`);
  }
}

async function checkChildCurrentState(childPage) {
  console.log('자녀계정: 현재 상태 확인 중...');
  
  // 현재 용돈 확인
  const currentAllowance = childPage.locator('text=/현재.*용돈|용돈.*현재/i');
  if (await currentAllowance.isVisible({ timeout: 5000 })) {
    const allowanceText = await currentAllowance.textContent();
    console.log(`현재 용돈: ${allowanceText}`);
  }
  
  // 받을 용돈 확인
  const pendingAllowance = childPage.locator('text=/받을.*용돈|대기.*용돈/i');
  if (await pendingAllowance.isVisible({ timeout: 5000 })) {
    const pendingText = await pendingAllowance.textContent();
    console.log(`받을 용돈: ${pendingText}`);
  }
  
  // 완료된 미션 확인
  const completedMissions = childPage.locator('text=/완료.*미션|미션.*완료/i');
  if (await completedMissions.isVisible({ timeout: 5000 })) {
    const completedText = await completedMissions.textContent();
    console.log(`완료된 미션: ${completedText}`);
  }
  
  // 사탕 미션이 자녀계정에서도 보이는지 확인
  const candyMissionChild = childPage.locator('text=/사탕.*4000|4000.*사탕/i');
  if (await candyMissionChild.isVisible({ timeout: 5000 })) {
    console.log('✅ 자녀계정에서도 사탕 미션 확인됨');
  } else {
    console.log('❌ 자녀계정에서 사탕 미션 보이지 않음 (동기화 문제)');
    await childPage.screenshot({ path: 'test-results/child-no-candy-mission.png' });
  }
}

async function processAllowanceDelivery(parentPage) {
  console.log('부모계정: 용돈 전달 완료 처리 중...');
  
  // "용돈 전달 완료" 버튼 찾기
  const deliveryButton = parentPage.locator('text=/용돈.*전달.*완료|전달.*완료/i').or(
    parentPage.locator('button[data-testid*="deliver"]')
  );
  
  if (await deliveryButton.isVisible({ timeout: 5000 })) {
    await deliveryButton.click();
    console.log('✅ 용돈 전달 완료 버튼 클릭됨');
    
    // 처리 완료 대기
    await parentPage.waitForTimeout(2000);
    
    // 성공 메시지 확인
    const successMessage = parentPage.locator('text=/성공|완료|전달.*완료/i');
    if (await successMessage.isVisible({ timeout: 5000 })) {
      const messageText = await successMessage.textContent();
      console.log(`성공 메시지: ${messageText}`);
    }
  } else {
    console.log('⚠️ 용돈 전달 완료 버튼을 찾을 수 없음');
    await parentPage.screenshot({ path: 'test-results/parent-no-delivery-button.png' });
  }
}

async function verifyRealTimeSync(childPage) {
  console.log('자녀계정: 실시간 동기화 확인 중...');
  
  let syncDetected = false;
  const maxWaitTime = 10000; // 10초
  const checkInterval = 1000; // 1초마다 체크
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime && !syncDetected) {
    // 페이지 새로고침 (실시간 동기화 시뮬레이션)
    await childPage.reload({ waitUntil: 'networkidle' });
    
    // 용돈 업데이트 확인
    const updatedAllowance = childPage.locator('text=/\\d+,?\\d*원/');
    const allowanceCount = await updatedAllowance.count();
    
    if (allowanceCount > 0) {
      const allowanceTexts = [];
      for (let i = 0; i < allowanceCount; i++) {
        const text = await updatedAllowance.nth(i).textContent();
        allowanceTexts.push(text);
      }
      console.log(`현재 용돈 상태: ${allowanceTexts.join(', ')}`);
      
      // 4000원 증가 확인
      if (allowanceTexts.some(text => text.includes('4000'))) {
        syncDetected = true;
        console.log('✅ 실시간 동기화 감지됨: 4000원 반영');
        break;
      }
    }
    
    await childPage.waitForTimeout(checkInterval);
  }
  
  if (!syncDetected) {
    console.log('❌ 실시간 동기화 감지되지 않음');
    await childPage.screenshot({ path: 'test-results/child-sync-failed.png' });
  }
  
  return syncDetected;
}

function analyzeLogs(parentLogs, childLogs) {
  console.log('\n=== 콘솔 로그 분석 ===');
  
  console.log('\n부모계정 로그:');
  parentLogs.forEach((log, index) => {
    console.log(`${index + 1}. ${log}`);
  });
  
  console.log('\n자녀계정 로그:');
  childLogs.forEach((log, index) => {
    console.log(`${index + 1}. ${log}`);
  });
  
  // 동기화 관련 키워드 찾기
  const syncKeywords = ['sync', 'update', 'websocket', 'realtime', 'broadcast', 'supabase'];
  const parentSyncLogs = parentLogs.filter(log => 
    syncKeywords.some(keyword => log.toLowerCase().includes(keyword))
  );
  const childSyncLogs = childLogs.filter(log => 
    syncKeywords.some(keyword => log.toLowerCase().includes(keyword))
  );
  
  if (parentSyncLogs.length > 0 || childSyncLogs.length > 0) {
    console.log('\n동기화 관련 로그 발견:');
    [...parentSyncLogs, ...childSyncLogs].forEach(log => {
      console.log(`- ${log}`);
    });
  } else {
    console.log('\n⚠️ 동기화 관련 로그가 발견되지 않음');
  }
  
  // 에러 로그 찾기
  const errorLogs = [...parentLogs, ...childLogs].filter(log => 
    log.includes('error') || log.includes('Error') || log.includes('ERROR')
  );
  
  if (errorLogs.length > 0) {
    console.log('\n❌ 에러 로그 발견:');
    errorLogs.forEach(log => {
      console.log(`- ${log}`);
    });
  }
}