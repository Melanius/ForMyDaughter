import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 성능 최적화
  poweredByHeader: false,
  compress: true,
  
  // 이미지 최적화
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },

  // 실험적 기능들
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      'lucide-react',
    ],
  },

  // 빌드 최적화
  swcMinify: true,
  
  // 타입 체크를 빌드 시에 실행
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint 체크를 빌드 시에 실행
  eslint: {
    ignoreDuringBuilds: false,
  },

  // 보안 헤더
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
