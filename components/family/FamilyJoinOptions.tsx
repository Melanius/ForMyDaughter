'use client'

import { useState } from 'react'
import { Plus, Users, AlertCircle } from 'lucide-react'

interface FamilyJoinOptionsProps {
  onCreateFamily: (familyName: string) => Promise<void>
  onJoinFamily: (familyCode: string) => Promise<void>
  loading?: boolean
}

export function FamilyJoinOptions({ onCreateFamily, onJoinFamily, loading = false }: FamilyJoinOptionsProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select')
  const [familyName, setFamilyName] = useState('')
  const [familyCode, setFamilyCode] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim()) return

    setProcessing(true)
    try {
      await onCreateFamily(familyName.trim())
    } catch (error) {
      console.error('가족 생성 실패:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyCode.trim()) return

    setProcessing(true)
    try {
      await onJoinFamily(familyCode.trim())
    } catch (error) {
      console.error('가족 참여 실패:', error)
    } finally {
      setProcessing(false)
    }
  }

  const isDisabled = loading || processing

  // 선택 화면
  if (mode === 'select') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            가족 설정하기
          </h2>
          <p className="text-gray-600">
            대표 가족이 되거나 기존 가족에 참여하세요
          </p>
        </div>

        <div className="space-y-4">
          {/* 가족 코드 생성 */}
          <button
            onClick={() => setMode('create')}
            disabled={isDisabled}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white p-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <div className="flex items-center justify-center mb-3">
              <Plus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">가족 코드 생성</h3>
            <p className="text-sm opacity-90">
              대표 가족이 되어 새로운 가족 코드를 만들어요
            </p>
          </button>

          {/* 가족 코드 입력 */}
          <button
            onClick={() => setMode('join')}
            disabled={isDisabled}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white p-6 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <div className="flex items-center justify-center mb-3">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold mb-1">가족 코드 입력</h3>
            <p className="text-sm opacity-90">
              받은 가족 코드로 기존 가족에 참여해요
            </p>
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">💡 가족 구성 방법</p>
              <p>대표 가족(주로 부모님)이 가족 코드를 생성하고, 다른 가족 구성원들이 해당 코드로 참여합니다.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 가족 생성 화면
  if (mode === 'create') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏠</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            새 가족 만들기
          </h2>
          <p className="text-gray-600">
            가족 이름을 입력해주세요
          </p>
        </div>

        <form onSubmit={handleCreateFamily} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가족 이름 *
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="예: 김씨 가족"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isDisabled}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMode('select')}
              disabled={isDisabled}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              뒤로
            </button>
            <button
              type="submit"
              disabled={isDisabled || !familyName.trim()}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-xl transition-colors font-medium"
            >
              {processing ? '생성 중...' : '가족 만들기'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // 가족 참여 화면
  if (mode === 'join') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔗</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            가족 참여하기
          </h2>
          <p className="text-gray-600">
            받으신 가족 코드를 입력해주세요
          </p>
        </div>

        <form onSubmit={handleJoinFamily} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가족 코드 *
            </label>
            <input
              type="text"
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
              placeholder="예: FAM123ABC"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-center text-lg"
              disabled={isDisabled}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMode('select')}
              disabled={isDisabled}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              뒤로
            </button>
            <button
              type="submit"
              disabled={isDisabled || !familyCode.trim()}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-3 rounded-xl transition-colors font-medium"
            >
              {processing ? '참여 중...' : '가족 참여'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return null
}