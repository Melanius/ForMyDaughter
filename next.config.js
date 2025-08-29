/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Supabase 외부 패키지 설정 (Next.js 15 방식)
  serverExternalPackages: ['@supabase/supabase-js'],
  experimental: {
    // Supabase 호환성을 위해 Node.js Runtime 사용
    runtime: 'nodejs'
  },
  // 웹팩 설정으로 Supabase 모듈 최적화
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  }
}

module.exports = nextConfig