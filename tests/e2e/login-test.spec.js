// Login functionality test
// 로그인 기능 테스트

const { test, expect } = require('@playwright/test');

test.describe('로그인 기능 테스트', () => {
  
  const PARENT_EMAIL = 'melanius88@naver.com';
  const PARENT_PASSWORD = 'mela1499^^';
  const CHILD_EMAIL = 'seoha1117@naver.com';
  const CHILD_PASSWORD = 'mela1499^^';
  
  test('부모계정 로그인 테스트', async ({ page }) => {
    console.log('=== 부모계정 로그인 테스트 시작 ===');
    
    // 콘솔 로그 캐처
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    console.log('1단계: 로그인 링크 클릭');
    const loginLink = page.locator('text=로그인');
    await loginLink.click();
    await page.waitForLoadState('networkidle');
    
    console.log('현재 URL:', page.url());
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });
    
    // 이메일 입력 필드 찾기
    console.log('2단계: 이메일 입력');
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="이메일"], input[placeholder*="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(PARENT_EMAIL);
      console.log('✅ 이메일 입력 완료:', PARENT_EMAIL);
    } else {
      console.log('❌ 이메일 입력 필드를 찾을 수 없음');
      // 모든 input 요소 확인
      const allInputs = await page.locator('input').allTextContents();
      console.log('페이지의 모든 input 요소들:', allInputs);
      
      const allInputsAttributes = await page.locator('input').evaluateAll(inputs => 
        inputs.map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id
        }))
      );
      console.log('Input 속성들:', allInputsAttributes);
    }
    
    // 비밀번호 입력 필드 찾기
    console.log('3단계: 비밀번호 입력');
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    if (await passwordInput.isVisible({ timeout: 5000 })) {
      await passwordInput.fill(PARENT_PASSWORD);
      console.log('✅ 비밀번호 입력 완료');
    } else {
      console.log('❌ 비밀번호 입력 필드를 찾을 수 없음');
    }
    
    // 로그인 버튼 클릭
    console.log('4단계: 로그인 버튼 클릭');
    const loginButton = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login"), button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 5000 })) {
      await loginButton.click();
      console.log('✅ 로그인 버튼 클릭 완료');
      
      // 로그인 처리 대기
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      console.log('로그인 후 URL:', page.url());
      await page.screenshot({ path: 'test-results/after-parent-login.png', fullPage: true });
    } else {
      console.log('❌ 로그인 버튼을 찾을 수 없음');
      // 모든 button 요소 확인
      const allButtons = await page.locator('button').allTextContents();
      console.log('페이지의 모든 button 요소들:', allButtons);
    }
    
    console.log('✅ 부모계정 로그인 테스트 완료');
  });
  
  test('자녀계정 로그인 테스트', async ({ page }) => {
    console.log('=== 자녀계정 로그인 테스트 시작 ===');
    
    // 콘솔 로그 캐처
    page.on('console', msg => {
      console.log(`[CHILD CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    console.log('1단계: 로그인 링크 클릭');
    const loginLink = page.locator('text=로그인');
    await loginLink.click();
    await page.waitForLoadState('networkidle');
    
    console.log('현재 URL:', page.url());
    await page.screenshot({ path: 'test-results/child-login-page.png', fullPage: true });
    
    // 이메일 입력
    console.log('2단계: 자녀 이메일 입력');
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="이메일"], input[placeholder*="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill(CHILD_EMAIL);
      console.log('✅ 자녀 이메일 입력 완료:', CHILD_EMAIL);
    }
    
    // 비밀번호 입력
    console.log('3단계: 비밀번호 입력');
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    if (await passwordInput.isVisible({ timeout: 5000 })) {
      await passwordInput.fill(CHILD_PASSWORD);
      console.log('✅ 비밀번호 입력 완료');
    }
    
    // 로그인 버튼 클릭
    console.log('4단계: 로그인 버튼 클릭');
    const loginButton = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login"), button:has-text("Sign In")').first();
    if (await loginButton.isVisible({ timeout: 5000 })) {
      await loginButton.click();
      console.log('✅ 로그인 버튼 클릭 완료');
      
      // 로그인 처리 대기
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      console.log('자녀계정 로그인 후 URL:', page.url());
      await page.screenshot({ path: 'test-results/after-child-login.png', fullPage: true });
      
      // 자녀계정에서 미션 정보 확인
      console.log('5단계: 자녀계정 미션 정보 확인');
      const missions = await page.locator('text=/\\d+원|미션|Mission/i').allTextContents();
      console.log('자녀계정에서 보이는 미션/용돈 정보:', missions);
      
      // 사탕 미션 특별히 찾기
      const candyMission = page.locator('text=/사탕.*4000|4000.*사탕/i');
      if (await candyMission.isVisible({ timeout: 3000 })) {
        console.log('✅ 자녀계정에서 사탕 4000원 미션 확인됨');
      } else {
        console.log('❌ 자녀계정에서 사탕 미션을 찾을 수 없음');
      }
    }
    
    console.log('✅ 자녀계정 로그인 테스트 완료');
  });
});