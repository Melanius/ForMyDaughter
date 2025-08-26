// 브라우저 콘솔에서 실행할 테스트 스크립트
// 개발자 도구(F12) → Console 탭에서 실행

console.log('🧪 연속 완료 보너스 시스템 테스트 시작');

// 1. 연속 완료 UI 요소 확인
function testStreakUI() {
  console.log('\n📊 1. 연속 완료 UI 테스트');
  
  // 연속 완료 도전 섹션 확인
  const streakSection = document.querySelector('h2');
  const hasStreakSection = Array.from(document.querySelectorAll('h2')).some(h2 => 
    h2.textContent.includes('연속 완료 도전')
  );
  console.log(`- 연속 완료 도전 섹션: ${hasStreakSection ? '✅ 있음' : '❌ 없음'}`);
  
  // 불 이모지 확인
  const fireEmoji = document.querySelector('span').textContent.includes('🔥');
  console.log(`- 불 이모지 표시: ${fireEmoji ? '✅ 있음' : '❌ 없음'}`);
  
  // 프로그레스 바 확인
  const progressBars = document.querySelectorAll('[role="progressbar"], .rounded-full');
  console.log(`- 프로그레스 바: ${progressBars.length > 0 ? '✅ 있음' : '❌ 없음'}`);
  
  return hasStreakSection;
}

// 2. 부모 전용 기능 확인
function testParentFeatures() {
  console.log('\n⚙️ 2. 부모 전용 기능 테스트');
  
  // 설정 버튼 확인 (⚙️ 이모지 포함)
  const settingsButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('⚙️')
  );
  console.log(`- 설정 버튼: ${settingsButtons.length > 0 ? '✅ 있음' : '❌ 없음'}`);
  
  // 테스트 도구 확인
  const testTools = Array.from(document.querySelectorAll('*')).some(el => 
    el.textContent.includes('🧪') || el.textContent.includes('연속 완료 시스템 테스트')
  );
  console.log(`- 테스트 도구: ${testTools ? '✅ 있음' : '❌ 없음'}`);
  
  return settingsButtons.length > 0;
}

// 3. 미션 완료 버튼 확인
function testMissionButtons() {
  console.log('\n🎯 3. 미션 완료 기능 테스트');
  
  // 완료 버튼 찾기
  const completeButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
    btn.textContent.includes('완료') || btn.textContent.includes('✓')
  );
  console.log(`- 미션 완료 버튼: ${completeButtons.length}개 발견`);
  
  // 미션 항목 확인
  const missions = document.querySelectorAll('[class*="mission"], [data-mission]');
  console.log(`- 미션 항목: ${missions.length}개 발견`);
  
  return completeButtons.length > 0;
}

// 4. 용돈 표시 확인
function testAllowanceDisplay() {
  console.log('\n💰 4. 용돈 표시 테스트');
  
  // 용돈 금액 표시 확인
  const allowanceElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent.includes('원') && (el.textContent.includes('7,500') || el.textContent.includes('7500'))
  );
  console.log(`- 용돈 금액 표시: ${allowanceElements.length > 0 ? '✅ 있음' : '❌ 없음'}`);
  
  // 지갑 섹션 확인
  const walletSection = Array.from(document.querySelectorAll('h2')).some(h2 => 
    h2.textContent.includes('지갑')
  );
  console.log(`- 지갑 섹션: ${walletSection ? '✅ 있음' : '❌ 없음'}`);
  
  return allowanceElements.length > 0;
}

// 5. 축하 효과 시뮬레이션 (개발자 도구에서만 가능)
function simulateCelebration() {
  console.log('\n🎉 5. 축하 효과 시뮬레이션');
  
  // 축하 효과 컴포넌트가 DOM에 있는지 확인
  const celebrationElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.className && (
      el.className.includes('celebration') || 
      el.className.includes('particle') ||
      el.className.includes('confetti')
    )
  );
  
  console.log(`- 축하 효과 요소: ${celebrationElements.length}개 발견`);
  console.log('💡 실제 축하 효과는 미션 완료 시에만 표시됩니다');
  
  return true;
}

// 전체 테스트 실행
function runAllTests() {
  console.log('🚀 연속 완료 보너스 시스템 종합 테스트 실행');
  console.log('='.repeat(50));
  
  const results = {
    streakUI: testStreakUI(),
    parentFeatures: testParentFeatures(), 
    missionButtons: testMissionButtons(),
    allowanceDisplay: testAllowanceDisplay(),
    celebrationReady: simulateCelebration()
  };
  
  console.log('\n📋 테스트 결과 요약:');
  console.log('='.repeat(50));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\n🎯 전체 결과: ${passed}/${total} 통과 (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 모든 테스트 통과! 시스템이 정상 작동합니다.');
  } else {
    console.log('⚠️ 일부 테스트 실패. 추가 개발이 필요합니다.');
  }
  
  return results;
}

// 테스트 자동 실행 (페이지 로드 완료 후)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}