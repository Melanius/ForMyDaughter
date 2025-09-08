/**
 * 🧪 가족 시스템 테스터 컴포넌트
 * 새로운 가족 시스템의 기능을 테스트하기 위한 개발용 컴포넌트
 */

'use client'

import { useState } from 'react'
import { Users, Plus, Search, Settings, Database } from 'lucide-react'
import familyService from '@/lib/services/familyService'
import familyCompatibilityService from '@/lib/services/familyCompatibilityService'
import { migrateFamilyData, rollbackFamilyData } from '@/lib/scripts/migrateFamilyData'
import { FamilyWithMembers, FamilyCreateRequest, FamilyJoinRequest } from '@/lib/types/family'

export default function FamilySystemTester() {
  const [currentFamily, setCurrentFamily] = useState<FamilyWithMembers | null>(null)
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 테스트 결과 로깅
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // 현재 사용자의 가족 정보 조회
  const testGetCurrentFamily = async () => {
    setIsLoading(true)
    try {
      const family = await familyService.getCurrentUserFamily()
      setCurrentFamily(family)
      
      if (family) {
        addTestResult(`✅ 가족 조회 성공: ${family.family_name} (${family.members.length}명)`)
      } else {
        addTestResult('ℹ️ 가족 정보 없음')
      }
    } catch (error) {
      addTestResult(`❌ 가족 조회 실패: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 새 가족 생성 테스트
  const testCreateFamily = async () => {
    setIsLoading(true)
    try {
      const request: FamilyCreateRequest = {
        family_name: `테스트 가족 ${Date.now()}`,
        role: 'father'
      }

      const family = await familyService.createFamily(request)
      addTestResult(`✅ 가족 생성 성공: ${family.family_name} (${family.family_code})`)
      await testGetCurrentFamily() // 새로고침
    } catch (error) {
      addTestResult(`❌ 가족 생성 실패: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 가족 코드로 가입 테스트
  const testJoinFamily = async () => {
    const familyCode = prompt('가족 코드를 입력하세요:')
    if (!familyCode) return

    setIsLoading(true)
    try {
      const request: FamilyJoinRequest = {
        family_code: familyCode,
        role: 'child', // 테스트용 기본값
        nickname: '테스트 자녀'
      }

      const family = await familyService.joinFamily(request)
      addTestResult(`✅ 가족 가입 성공: ${family.family_name}`)
      await testGetCurrentFamily() // 새로고침
    } catch (error) {
      addTestResult(`❌ 가족 가입 실패: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 호환성 서비스 테스트
  const testCompatibility = async () => {
    setIsLoading(true)
    try {
      const userWithFamily = await familyCompatibilityService.getCurrentUserWithFamily()
      addTestResult(`✅ 호환성 조회 성공: ${userWithFamily.profile.full_name} (역할: ${userWithFamily.familyRole || 'N/A'})`)
      
      const connectedChildren = await familyCompatibilityService.getConnectedChildrenLegacyFormat()
      addTestResult(`📝 레거시 자녀 목록: ${connectedChildren.length}명`)
      
      const isParentWithChild = await familyCompatibilityService.getIsParentWithChild()
      addTestResult(`👨‍👩‍👧‍👦 부모-자녀 상태: ${isParentWithChild ? '예' : '아니오'}`)
    } catch (error) {
      addTestResult(`❌ 호환성 테스트 실패: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 마이그레이션 테스트
  const testMigration = async () => {
    setIsLoading(true)
    try {
      addTestResult('🔄 마이그레이션 시작...')
      const result = await migrateFamilyData()
      
      if (result.success) {
        addTestResult(`✅ 마이그레이션 성공: ${result.message}`)
        addTestResult(`📊 통계: 가족 ${result.stats.families_created}개, 구성원 ${result.stats.members_migrated}명`)
      } else {
        addTestResult(`❌ 마이그레이션 실패: ${result.message}`)
      }
      
      await testGetCurrentFamily() // 마이그레이션 후 새로고침
    } catch (error) {
      addTestResult(`💥 마이그레이션 오류: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 마이그레이션 롤백 테스트
  const testRollback = async () => {
    if (!confirm('정말로 마이그레이션을 롤백하시겠습니까? 모든 가족 데이터가 삭제됩니다.')) return

    setIsLoading(true)
    try {
      await rollbackFamilyData()
      addTestResult('🔄 마이그레이션 롤백 완료')
      setCurrentFamily(null)
    } catch (error) {
      addTestResult(`❌ 롤백 실패: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 테스트 결과 클리어
  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🧪 가족 시스템 테스터</h2>
        <p className="text-gray-600">새로운 가족 시스템의 기능을 테스트합니다.</p>
      </div>

      {/* 현재 가족 정보 */}
      {currentFamily && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">현재 가족 정보</h3>
          <div className="text-sm space-y-1">
            <p><strong>가족명:</strong> {currentFamily.family_name}</p>
            <p><strong>가족 코드:</strong> {currentFamily.family_code}</p>
            <p><strong>구성원:</strong> {currentFamily.members.length}명</p>
            <div className="mt-2">
              <p><strong>구성원 목록:</strong></p>
              <ul className="ml-4 list-disc">
                {currentFamily.members.map(member => (
                  <li key={member.id} className="text-xs">
                    {member.profile.full_name} ({member.role}) 
                    {member.nickname && ` - ${member.nickname}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 테스트 버튼들 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={testGetCurrentFamily}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          <Search className="w-4 h-4" />
          가족 조회
        </button>

        <button
          onClick={testCreateFamily}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          가족 생성
        </button>

        <button
          onClick={testJoinFamily}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
        >
          <Users className="w-4 h-4" />
          가족 가입
        </button>

        <button
          onClick={testCompatibility}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
        >
          <Settings className="w-4 h-4" />
          호환성 테스트
        </button>

        <button
          onClick={testMigration}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          마이그레이션
        </button>

        <button
          onClick={testRollback}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          <Database className="w-4 h-4" />
          롤백
        </button>
      </div>

      {/* 테스트 결과 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">테스트 결과</h3>
          <button
            onClick={clearResults}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            결과 지우기
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-center">테스트 결과가 여기에 표시됩니다.</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span>테스트 실행 중...</span>
          </div>
        </div>
      )}
    </div>
  )
}