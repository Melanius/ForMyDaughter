// API 엔드포인트 테스트 스크립트
// Node.js 환경에서 실행

const https = require('https');
const http = require('http');

console.log('🧪 API 엔드포인트 테스트 시작\n');

// 테스트할 엔드포인트들
const endpoints = [
  { name: 'Homepage', path: '/', expected: 200 },
  { name: 'CSS Assets', path: '/_next/static/css/app/layout.css', expected: 200 },
  { name: 'JS Chunks', path: '/_next/static/chunks/webpack.js', expected: 200 }
];

// HTTP 요청 함수
function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint.path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      const success = res.statusCode === endpoint.expected;
      console.log(`${success ? '✅' : '❌'} ${endpoint.name}: ${res.statusCode} ${res.statusMessage}`);
      
      if (endpoint.name === 'Homepage') {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // HTML 내용 분석
          const hasStreakSystem = data.includes('연속 완료 도전');
          const hasWallet = data.includes('지갑');
          const hasAnimations = data.includes('animate-pulse');
          const hasReactScripts = data.includes('_next/static/chunks/app/page.js');
          
          console.log('   📊 페이지 분석:');
          console.log(`   - 연속 완료 시스템: ${hasStreakSystem ? '✅' : '❌'}`);
          console.log(`   - 지갑 섹션: ${hasWallet ? '✅' : '❌'}`);
          console.log(`   - 로딩 애니메이션: ${hasAnimations ? '✅' : '❌'}`);
          console.log(`   - React 스크립트: ${hasReactScripts ? '✅' : '❌'}`);
          
          resolve({ success, details: { hasStreakSystem, hasWallet, hasAnimations, hasReactScripts }});
        });
      } else {
        resolve({ success });
      }
    });

    req.on('error', (err) => {
      console.log(`❌ ${endpoint.name}: 연결 실패 - ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      console.log(`❌ ${endpoint.name}: 타임아웃 (5초 초과)`);
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });

    req.end();
  });
}

// 전체 테스트 실행
async function runAPITests() {
  console.log('🚀 개발 서버 연결 테스트\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await makeRequest(endpoint);
    results.push({ endpoint: endpoint.name, ...result });
  }
  
  console.log('\n📋 테스트 결과 요약:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.endpoint}`);
  });
  
  console.log(`\n🎯 API 테스트 결과: ${successful}/${total} 성공 (${Math.round(successful/total*100)}%)`);
  
  if (successful === total) {
    console.log('🎉 모든 API 엔드포인트가 정상 작동합니다!');
    console.log('📱 브라우저에서 http://localhost:3000 으로 접속하여 실제 테스트를 진행하세요.');
  } else {
    console.log('⚠️ 일부 API 엔드포인트에 문제가 있습니다.');
  }
  
  return results;
}

// 테스트 실행
runAPITests().catch(console.error);