// Explore login page structure
// 로그인 페이지 구조 탐색

const { test, expect } = require('@playwright/test');

test.describe('로그인 페이지 구조 탐색', () => {
  
  test('로그인 페이지 HTML 구조 분석', async ({ page }) => {
    console.log('=== 로그인 페이지 구조 분석 시작 ===');
    
    // 콘솔 로그 캐처
    page.on('console', msg => {
      console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    // 네트워크 요청 모니터링
    page.on('request', request => {
      if (request.url().includes('login') || request.url().includes('auth')) {
        console.log(`[NETWORK] Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('login') || response.url().includes('auth')) {
        console.log(`[NETWORK] Response: ${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('http://localhost:3002');
    await page.waitForLoadState('networkidle');
    
    console.log('1단계: 메인 페이지에서 로그인 링크 확인');
    const loginLinks = await page.locator('a, button').evaluateAll(elements => 
      elements.map(el => ({
        text: el.textContent?.trim(),
        href: el.href,
        onclick: el.onclick?.toString(),
        tagName: el.tagName
      })).filter(el => 
        el.text?.toLowerCase().includes('로그인') || 
        el.text?.toLowerCase().includes('login') ||
        el.href?.includes('login') ||
        el.href?.includes('auth')
      )
    );
    console.log('로그인 관련 링크/버튼들:', loginLinks);
    
    console.log('2단계: 로그인 페이지로 이동');
    const loginLink = page.locator('text=로그인');
    if (await loginLink.isVisible()) {
      await loginLink.click();
      console.log('✅ 로그인 링크 클릭됨');
      
      // 페이지 변화 대기
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      console.log('현재 URL:', page.url());
      console.log('페이지 제목:', await page.title());
      
      // 전체 페이지 HTML 구조 분석
      console.log('3단계: 페이지 HTML 구조 분석');
      const bodyContent = await page.locator('body').innerHTML();
      console.log('페이지 HTML 길이:', bodyContent.length);
      
      // 폼 요소 확인
      const forms = await page.locator('form').count();
      console.log('페이지의 form 요소 수:', forms);
      
      if (forms > 0) {
        for (let i = 0; i < forms; i++) {
          const form = page.locator('form').nth(i);
          const formHTML = await form.innerHTML();
          console.log(`Form ${i + 1} HTML:`, formHTML.substring(0, 500));
        }
      }
      
      // 모든 input 요소 상세 분석
      const inputs = await page.locator('input').evaluateAll(inputs => 
        inputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          className: input.className,
          value: input.value,
          required: input.required,
          visible: input.offsetParent !== null
        }))
      );
      console.log('모든 input 요소 상세 정보:', inputs);
      
      // 모든 button 요소 상세 분석
      const buttons = await page.locator('button').evaluateAll(buttons => 
        buttons.map(button => ({
          text: button.textContent?.trim(),
          type: button.type,
          className: button.className,
          disabled: button.disabled,
          visible: button.offsetParent !== null
        }))
      );
      console.log('모든 button 요소 상세 정보:', buttons);
      
      // 텍스트 입력이 가능한 모든 요소 확인
      const allInputs = await page.locator('input, textarea, [contenteditable]').evaluateAll(elements => 
        elements.map(el => ({
          tagName: el.tagName,
          type: el.type || 'N/A',
          placeholder: el.placeholder || 'N/A',
          id: el.id || 'N/A',
          name: el.name || 'N/A',
          className: el.className || 'N/A',
          visible: el.offsetParent !== null,
          rect: el.getBoundingClientRect()
        }))
      );
      console.log('모든 입력 가능한 요소들:', allInputs);
      
      // Supabase Auth 관련 요소 확인
      const authElements = await page.locator('[data-supabase], [class*="supabase"], [id*="supabase"], [class*="auth"], [id*="auth"]').evaluateAll(elements => 
        elements.map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: el.textContent?.substring(0, 100)
        }))
      );
      console.log('Supabase/Auth 관련 요소들:', authElements);
      
      // 스크린샷 다시 촬영 (더 긴 대기 후)
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/login-page-detailed.png', fullPage: true });
      
    } else {
      console.log('❌ 로그인 링크를 찾을 수 없음');
      
      // 메인 페이지의 모든 요소 확인
      const allElements = await page.locator('a, button, [role="button"]').evaluateAll(elements => 
        elements.map(el => ({
          text: el.textContent?.trim(),
          href: el.href,
          className: el.className,
          tagName: el.tagName
        }))
      );
      console.log('메인 페이지의 모든 클릭 가능한 요소들:', allElements);
    }
    
    console.log('✅ 로그인 페이지 구조 분석 완료');
  });
  
  test('직접 로그인 URL 접근', async ({ page }) => {
    console.log('=== 직접 로그인 URL 접근 테스트 ===');
    
    const loginUrls = [
      'http://localhost:3002/login',
      'http://localhost:3002/auth',
      'http://localhost:3002/auth/login',
      'http://localhost:3002/signin',
      'http://localhost:3002/sign-in'
    ];
    
    for (const url of loginUrls) {
      console.log(`${url} 접근 시도...`);
      try {
        const response = await page.goto(url);
        const status = response?.status();
        console.log(`${url} - 상태코드: ${status}`);
        
        if (status === 200) {
          await page.waitForLoadState('networkidle');
          console.log(`현재 URL: ${page.url()}`);
          console.log(`페이지 제목: ${await page.title()}`);
          
          const inputs = await page.locator('input').count();
          const buttons = await page.locator('button').count();
          console.log(`Input 요소 수: ${inputs}, Button 요소 수: ${buttons}`);
          
          if (inputs > 0 || buttons > 0) {
            await page.screenshot({ path: `test-results/direct-${url.split('/').pop()}.png`, fullPage: true });
            console.log(`✅ ${url}에서 로그인 폼 발견!`);
            break;
          }
        }
      } catch (error) {
        console.log(`${url} - 오류: ${error.message}`);
      }
      
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ 직접 URL 접근 테스트 완료');
  });
});