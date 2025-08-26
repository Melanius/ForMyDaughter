'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [userType, setUserType] = useState<'parent' | 'child'>('parent')
  const [familyCode, setFamilyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자리 이상이어야 합니다.')
      setLoading(false)
      return
    }

    try {
      // 1. Supabase Auth 회원가입
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('사용자 생성에 실패했습니다.')
      }

      // 2. 잠시 기다린 후 프로필 생성 (세션 동기화 대기)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 3. 프로필 생성
      const profileData: {
        id: string;
        email: string;
        full_name: string;
        user_type: 'parent' | 'child';
        family_code?: string;
      } = {
        id: authData.user.id,
        email,
        full_name: fullName,
        user_type: userType
      }

      // 자녀인 경우 가족 코드로 부모 찾기 및 연결 요청 생성
      let parentId: string | null = null
      if (userType === 'child' && familyCode) {
        // 1. 가족 코드로 부모 찾기
        const { data: parentData, error: parentError } = await supabase
          .from('profiles')
          .select('id')
          .eq('family_code', familyCode)
          .eq('user_type', 'parent')
          .single()

        if (parentError || !parentData) {
          throw new Error('유효하지 않은 가족 코드입니다. 부모님께 확인해주세요.')
        }

        parentId = parentData.id
        profileData.family_code = familyCode
      }

      // 프로필 생성
      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw profileError
      }

      // 자녀인 경우 가족 연결 요청 생성
      if (userType === 'child' && parentId) {
        const { error: requestError } = await supabase
          .from('family_connection_requests')
          .insert({
            parent_id: parentId,
            child_id: authData.user.id,
            status: 'pending'
          })

        if (requestError) {
          console.error('Connection request creation error:', requestError)
          // 연결 요청 생성 실패 시에도 회원가입은 성공으로 처리하되 안내 메시지 변경
          console.warn('프로필은 생성되었지만 연결 요청 생성에 실패했습니다.')
        }
      }

      setSuccess(
        userType === 'parent' 
          ? '부모 계정 회원가입이 완료되었습니다!' 
          : '자녀 계정 회원가입이 완료되었습니다. 부모님의 승인을 기다려주세요.'
      )
      
      // 부모 계정은 바로 로그인 페이지로 이동
      if (userType === 'parent') {
        setTimeout(() => router.push('/login'), 2000)
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MoneySeed 💰</h1>
            <p className="text-gray-600">회원가입하여 용돈 관리를 시작하세요</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="이름을 입력하세요"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="이메일을 입력하세요"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="비밀번호를 다시 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                계정 유형
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="parent"
                    checked={userType === 'parent'}
                    onChange={(e) => setUserType(e.target.value as 'parent' | 'child')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">부모</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="userType"
                    value="child"
                    checked={userType === 'child'}
                    onChange={(e) => setUserType(e.target.value as 'parent' | 'child')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">자녀</span>
                </label>
              </div>
            </div>

            {userType === 'child' && (
              <div>
                <label htmlFor="familyCode" className="block text-sm font-medium text-gray-700 mb-2">
                  가족 코드
                </label>
                <input
                  id="familyCode"
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="부모님께 받은 가족 코드 입력"
                  required={userType === 'child'}
                />
                <p className="mt-2 text-xs text-gray-500">
                  부모님께서 제공한 가족 코드를 입력하세요
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}