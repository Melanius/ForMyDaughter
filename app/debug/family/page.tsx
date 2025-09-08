/**
 * 🧪 가족 시스템 테스트 페이지
 */

import { Suspense } from 'react'
import FamilySystemTester from '@/components/debug/FamilySystemTester'

export default function FamilyDebugPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      }>
        <FamilySystemTester />
      </Suspense>
    </div>
  )
}