const { chromium } = require('playwright');

/**
 * 🚀 간단한 이중 브라우저 테스트
 * 
 * 사용법: node simple-dual-test.js
 * 
 * 이 스크립트는:
 * 1. 두 개의 독립된 브라우저 창을 열어줍니다
 * 2. 각각에서 수동으로 다른 계정으로 로그인할 수 있습니다
 * 3. 세션이 완전히 분리되어 있어 서로 영향을 주지 않습니다
 */

async function openDualBrowsers() {
  console.log('🚀 이중 브라우저 환경 시작...');
  console.log('===============================');
  
  // 브라우저 시작
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security'] // CORS 이슈 방지
  });

  // 첫 번째 브라우저 컨텍스트 (자녀용)
  const childContext = await browser.newContext({
    viewport: { width: 800, height: 900 },
  });

  // 두 번째 브라우저 컨텍스트 (부모용)  
  const parentContext = await browser.newContext({
    viewport: { width: 800, height: 900 },
  });

  // 페이지 생성 및 앱 로드
  const childPage = await childContext.newPage();
  const parentPage = await parentContext.newPage();

  // 두 페이지 모두 앱으로 이동
  await Promise.all([
    childPage.goto('http://localhost:3001'),
    parentPage.goto('http://localhost:3001')
  ]);

  // 페이지 타이틀 설정으로 구분하기 쉽게
  await childPage.evaluate(() => {
    document.title = '👶 자녀 계정 - ' + document.title;
  });

  await parentPage.evaluate(() => {
    document.title = '👨‍👩‍👧‍👦 부모 계정 - ' + document.title;
  });

  console.log('✅ 두 개의 독립된 브라우저 창이 열렸습니다!');
  console.log('');
  console.log('📋 사용 방법:');
  console.log('  1. 첫 번째 창 (👶): 자녀 계정으로 로그인');
  console.log('  2. 두 번째 창 (👨‍👩‍👧‍👦): 부모 계정으로 로그인');
  console.log('  3. 두 계정이 독립적으로 작동하는지 확인');
  console.log('');
  console.log('⚠️  주의: 각 창은 완전히 독립된 세션을 사용합니다');
  console.log('💡 팁: 한 창에서 로그인해도 다른 창은 영향받지 않습니다');
  console.log('');
  console.log('🔄 테스트 종료: Ctrl+C 를 눌러주세요');

  // 사용자가 테스트할 수 있도록 대기
  let isRunning = true;
  
  process.on('SIGINT', async () => {
    if (isRunning) {
      console.log('\n\n🧹 브라우저 정리 중...');
      await browser.close();
      console.log('✅ 테스트 환경 정리 완료');
      process.exit(0);
    }
  });

  // 무한 대기 (사용자가 Ctrl+C로 종료할 때까지)
  while (isRunning) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// 에러 처리와 함께 실행
(async () => {
  try {
    await openDualBrowsers();
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.log('');
    console.log('🔧 문제 해결 방법:');
    console.log('  1. 개발 서버가 실행 중인지 확인: http://localhost:3001');
    console.log('  2. Playwright 설치 확인: npx playwright install');
    console.log('  3. 포트 3001이 사용 중인지 확인');
    process.exit(1);
  }
})();