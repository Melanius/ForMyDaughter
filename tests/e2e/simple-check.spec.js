// Simple check for app availability and basic functionality
// 앱 가용성 및 기본 기능 확인

const { test, expect } = require('@playwright/test');

test.describe('앱 기본 상태 확인', () => {
  
  test('앱 로드 및 기본 요소 확인', async ({ page }) => {
    console.log('=== 앱 기본 상태 확인 테스트 시작 ===');
    
    // 콘솔 로그 캐처
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    // 1단계: 앱 로드
    console.log('1단계: 앱 로딩...');
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // 2단계: 페이지 제목 확인
    console.log('2단계: 페이지 제목 확인...');
    const title = await page.title();
    console.log(`페이지 제목: ${title}`);
    
    // 3단계: 기본 요소들 확인
    console.log('3단계: 기본 요소 확인...');
    
    // 헤딩 확인
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('페이지 헤딩들:', headings);
    
    // 버튼 확인
    const buttons = await page.locator('button').allTextContents();
    console.log('버튼들:', buttons.slice(0, 10)); // 처음 10개만
    
    // 링크 확인
    const links = await page.locator('a').allTextContents();
    console.log('링크들:', links.slice(0, 10)); // 처음 10개만
    
    // 4단계: 로그인 관련 요소 확인
    console.log('4단계: 로그인 요소 확인...');
    const loginElements = await page.locator('text=/로그인|Login|signin|auth/i').allTextContents();
    console.log('로그인 관련 요소들:', loginElements);
    
    // 5단계: 스크린샷 촬영
    console.log('5단계: 스크린샷 촬영...');
    await page.screenshot({ path: 'test-results/app-basic-state.png', fullPage: true });
    
    // 6단계: 미션/용돈 관련 요소 확인
    console.log('6단계: 미션/용돈 관련 요소 확인...');
    const missionElements = await page.locator('text=/미션|용돈|Mission|Allowance/i').allTextContents();
    console.log('미션/용돈 관련 요소들:', missionElements);
    
    console.log('✅ 앱 기본 상태 확인 완료');
  });
  
  test('기본 네비게이션 테스트', async ({ page }) => {
    console.log('=== 기본 네비게이션 테스트 시작 ===');
    
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    // 클릭 가능한 요소들 찾기
    const clickableElements = page.locator('button, a, [role="button"]');
    const count = await clickableElements.count();
    console.log(`클릭 가능한 요소 수: ${count}`);
    
    // 처음 5개 요소의 텍스트 확인
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = clickableElements.nth(i);
      const text = await element.textContent();
      const isVisible = await element.isVisible();
      console.log(`요소 ${i + 1}: "${text}" (보임: ${isVisible})`);
    }
    
    console.log('✅ 기본 네비게이션 테스트 완료');
  });
});