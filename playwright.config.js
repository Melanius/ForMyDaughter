// Playwright Configuration for Kids Allowance App E2E Tests

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // 테스트 디렉토리
  testDir: './tests/e2e',
  
  // 글로벌 설정
  timeout: 30 * 1000, // 30초
  expect: {
    timeout: 5 * 1000, // 5초
  },
  
  // 테스트 실행 설정
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 리포터 설정
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  
  // 글로벌 설정
  use: {
    // 기본 URL (로컬 개발 서버)
    baseURL: 'http://localhost:3001',
    
    // 브라우저 설정
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // 스크린샷 및 비디오
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    
    // 한국어 설정
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },

  // 테스트 브라우저별 설정
  projects: [
    // 데스크톱 브라우저
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 한글 폰트 지원을 위한 추가 설정
        launchOptions: {
          args: ['--font-render-hinting=none', '--disable-font-subpixel-positioning']
        }
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // 모바일 브라우저
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // 태블릿
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 }
      },
    },
  ],

  // 개발 서버 설정 (테스트 실행 전 자동 시작)
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2분
  },
});