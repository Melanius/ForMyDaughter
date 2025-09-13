const { chromium } = require('playwright');

async function testParentSignup() {
  console.log('🚀 부모 계정 회원가입 테스트 시작...');

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // 1. 회원가입 페이지로 이동
    console.log('📝 회원가입 페이지로 이동...');
    await page.goto('http://localhost:3000/signup');
    await page.waitForLoadState('networkidle');
    
    // 2. 폼 작성
    const testEmail = `testparent_${Date.now()}@example.com`;
    const testPassword = 'testpass123';
    const testName = '테스트부모';
    
    console.log(`📋 회원가입 정보 입력: ${testEmail}`);
    
    // 이름 입력
    await page.fill('input[id="fullName"]', testName);
    
    // 이메일 입력
    await page.fill('input[id="email"]', testEmail);
    
    // 비밀번호 입력
    await page.fill('input[id="password"]', testPassword);
    await page.fill('input[id="confirmPassword"]', testPassword);
    
    // 부모 선택 - 라디오 버튼 대신 라벨 클릭
    await page.click('label:has(input[value="parent"])');
    
    // 3. 회원가입 버튼 클릭
    console.log('🚀 회원가입 버튼 클릭...');
    await page.click('button[type="submit"]');
    
    // 4. 결과 확인 (성공 메시지나 오류 확인)
    try {
      await page.waitForSelector('.bg-green-50', { timeout: 10000 });
      console.log('✅ 회원가입 성공 메시지 확인됨');
      
      // 성공 메시지 텍스트 가져오기
      const successMessage = await page.textContent('.bg-green-50 p');
      console.log('📢 성공 메시지:', successMessage);
      
    } catch (e) {
      // 오류 메시지 확인
      try {
        await page.waitForSelector('.bg-red-50', { timeout: 5000 });
        const errorMessage = await page.textContent('.bg-red-50 p');
        console.log('❌ 오류 메시지:', errorMessage);
      } catch (e2) {
        console.log('⚠️ 메시지를 찾을 수 없음');
      }
    }
    
    // 5. 3초 후 로그인 페이지로 이동 (자동 리다이렉트)
    console.log('⏳ 자동 로그인 페이지 이동 대기...');
    await page.waitForTimeout(4000);
    
    // 6. 로그인하여 가족 페이지 확인
    console.log('🔐 로그인 시작...');
    
    // 로그인 폼이 나타날 때까지 대기
    await page.waitForSelector('input[id="email"]', { timeout: 10000 });
    
    // 로그인 정보 입력
    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // 7. 메인 페이지로 이동 후 가족 페이지 접근
    await page.waitForLoadState('networkidle');
    console.log('🏠 가족 페이지로 이동...');
    
    await page.goto('http://localhost:3000/family');
    await page.waitForLoadState('networkidle');
    
    // 8. 가족 페이지 상태 확인
    await page.waitForTimeout(2000);
    
    // 가족 생성/참여 버튼이 있는지 확인
    const hasJoinOptions = await page.isVisible('text=가족 코드 생성');
    
    if (hasJoinOptions) {
      console.log('❌ 문제 발견: 부모 계정인데 가족 생성/참여 옵션이 표시됨');
      console.log('📸 스크린샷 촬영 중...');
      await page.screenshot({ path: 'parent-signup-issue.png', fullPage: true });
    } else {
      console.log('✅ 정상: 가족 정보가 표시되거나 다른 상태임');
    }
    
    // 현재 페이지의 제목 확인
    const pageTitle = await page.title();
    console.log('📄 현재 페이지 제목:', pageTitle);
    
    // 페이지 URL 확인
    const currentUrl = page.url();
    console.log('🌐 현재 URL:', currentUrl);
    
    console.log('✅ 테스트 완료');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testParentSignup();