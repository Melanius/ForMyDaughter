// E2E Tests for Kids Allowance App
// 기본 기능 테스트

const { test, expect } = require('@playwright/test');

test.describe('용돈 관리 앱 기본 기능', () => {
  
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 홈페이지로 이동
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 및 한글 폰트 렌더링 테스트', async ({ page }) => {
    // 페이지 제목 확인
    await expect(page).toHaveTitle('우리 아이 용돈 관리');
    
    // 메인 헤딩 확인
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toContainText('우리 아이 용돈 관리');
    
    // 한글 폰트 렌더링 확인
    const computedFont = await mainHeading.evaluate(el => 
      getComputedStyle(el).fontFamily
    );
    expect(computedFont).toContain('Malgun Gothic');
    
    // 설명 텍스트 확인
    await expect(page.locator('text=미션을 완료하고 용돈을 모으는 재미있는 여행을 시작해요!')).toBeVisible();
  });

  test('미션 목록 표시 테스트', async ({ page }) => {
    // 오늘의 미션 섹션 확인
    await expect(page.locator('text=오늘의 미션')).toBeVisible();
    
    // 미션 추가 버튼 확인
    const addMissionBtn = page.locator('text=미션 추가');
    await expect(addMissionBtn).toBeVisible();
    
    // 달력 보기 버튼 확인
    const calendarBtn = page.locator('text=달력 보기');
    await expect(calendarBtn).toBeVisible();
  });

  test('현재 상황 섹션 테스트', async ({ page }) => {
    // 현재 상황 헤딩 확인
    await expect(page.locator('text=현재 상황')).toBeVisible();
    
    // 현재 용돈 표시 확인
    await expect(page.locator('text=현재 용돈')).toBeVisible();
    
    // 받을 용돈 표시 확인
    await expect(page.locator('text=받을 용돈')).toBeVisible();
    
    // 용돈 금액 형식 확인 (원 단위)
    const amounts = page.locator('text=/\\d+,?\\d*원/');
    await expect(amounts.first()).toBeVisible();
  });

  test('이번 주 목표 섹션 테스트', async ({ page }) => {
    // 이번 주 목표 헤딩 확인
    await expect(page.locator('text=이번 주 목표')).toBeVisible();
    
    // 완료한 미션 표시 확인
    await expect(page.locator('text=완료한 미션')).toBeVisible();
    
    // 남은 미션 표시 확인
    await expect(page.locator('text=남은 미션')).toBeVisible();
    
    // 이번 주 획득 용돈 표시 확인
    await expect(page.locator('text=이번 주 획득 용돈')).toBeVisible();
  });

  test('달력 섹션 테스트', async ({ page }) => {
    // 달력 헤딩 확인 (더 구체적인 선택자 사용)
    await expect(page.locator('h3:has-text("달력")')).toBeVisible();
    
    // 현재 날짜 표시 확인
    const currentDate = new Date().getDate();
    await expect(page.locator(`text="${currentDate}"`)).toBeVisible();
    
    // 월/년도 표시 확인
    await expect(page.locator('text=/\\d{4}년 \\d{1,2}월/')).toBeVisible();
    
    // 요일 표시 확인
    await expect(page.locator('text=/월요일|화요일|수요일|목요일|금요일|토요일|일요일/')).toBeVisible();
  });

  test('미션 완료 기능 테스트', async ({ page }) => {
    // 미션이 있는 경우에만 테스트
    const missionCards = page.locator('button:has-text("완료")');
    const missionCount = await missionCards.count();
    
    if (missionCount > 0) {
      // 첫 번째 미션의 완료 버튼 클릭
      const firstCompleteBtn = missionCards.first();
      await firstCompleteBtn.click();
      
      // 완료 후 변화 확인 (완료 버튼이 취소 버튼으로 변경되는지)
      await expect(page.locator('button:has-text("취소")')).toBeVisible();
    }
  });

  test('반응형 디자인 테스트', async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 메인 헤딩이 여전히 보이는지 확인
    await expect(page.locator('h1:has-text("우리 아이 용돈 관리")')).toBeVisible();
    
    // 버튼들이 여전히 클릭 가능한지 확인
    await expect(page.locator('text=미션 추가')).toBeVisible();
    await expect(page.locator('text=달력 보기')).toBeVisible();
    
    // 태블릿 뷰포트로 변경
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 레이아웃이 정상인지 확인
    await expect(page.locator('text=현재 상황')).toBeVisible();
    await expect(page.locator('text=이번 주 목표')).toBeVisible();
  });

  test('성공 메시지 표시 테스트', async ({ page }) => {
    // 성공 메시지 확인
    await expect(page.locator('text=웹앱이 성공적으로 실행되었습니다!')).toBeVisible();
  });
});