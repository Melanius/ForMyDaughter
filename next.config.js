/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Supabase 외부 패키지 설정 (Next.js 15 방식)
  serverExternalPackages: ['@supabase/supabase-js'],
  experimental: {
    // Next.js 15에서 runtime 옵션 제거됨
  },
  // 웹팩 설정으로 Supabase 모듈 최적화
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    // WSL 환경에서 파일 감시 개선 (Hot Reload 문제 해결)
    config.watchOptions = {
      poll: 1000,           // 1초마다 폴링으로 파일 변경 감지
      aggregateTimeout: 300, // 300ms 후 변경사항 반영
      ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**']
    }
    
    return config
  }
}

module.exports = nextConfig