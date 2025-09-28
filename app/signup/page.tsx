'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
// 가족 코드 생성 함수 (현재 사용되지 않음 - 부모는 회원가입 후 별도로 가족 생성)
// function generateFamilyCode(): string {
//   const prefix = 'FAM'
//   const numbers = Math.floor(100 + Math.random() * 900) // 100-999
//   const letters = Math.random().toString(36).substring(2, 5).toUpperCase()
//   return `${prefix}${numbers}${letters}`
// }

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [userType, setUserType] = useState<'father' | 'mother' | 'son' | 'daughter'>('father')
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
      setError('🤔 비밀번호가 다르네요! 같은 비밀번호를 입력해주세요.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('🔐 비밀번호는 6글자 이상 입력해주세요!')
      setLoading(false)
      return
    }

    // 자녀인 경우 가족 코드 필수 체크
    if (['son', 'daughter'].includes(userType) && !familyCode.trim()) {
      setError('👨‍👩‍👧‍👦 부모님께 받은 가족 코드를 입력해주세요!')
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

      // 2. 부모 정보 처리 (자녀인 경우만)
      let parentId = null

      if (['son', 'daughter'].includes(userType)) {
        // 자녀: 가족 코드로 부모 찾기
        const { data: parent, error: parentError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('family_code', familyCode.trim())
          .in('user_type', ['father', 'mother'])
          .single()
        
        if (parentError || !parent) {
          throw new Error('유효하지 않은 가족 코드입니다')
        }
        
        parentId = parent.id
      }

      // 3. 프로필 생성
      const profileData: Record<string, unknown> = {
        id: authData.user.id,
        email,
        full_name: fullName,
        user_type: userType,
        is_first_login: true  // 새 사용자는 첫 로그인으로 설정
      }

      // 자녀인 경우만 family_code와 parent_id 추가
      if (['son', 'daughter'].includes(userType)) {
        profileData.family_code = familyCode.trim()
        profileData.parent_id = parentId
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileData)

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw new Error('프로필 생성에 실패했습니다.')
      }

      // 4. 프로필 생성 완료 대기 (AuthProvider 타이밍 문제 해결)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 5. 성공 메시지
      if (['father', 'mother'].includes(userType)) {
        setSuccess('🎉 부모 계정이 만들어졌어요! 로그인 후 가족을 생성해주세요.')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setSuccess('🎉 우리 가족에 참여했어요! 이제 용돈 관리를 시작할 수 있어요!')
        setTimeout(() => router.push('/login'), 2000)
      }

    } catch (error: unknown) {
      console.error('Signup error:', error)
      if (error instanceof Error) {
        if (error.message.includes('가족 코드')) {
          setError('❌ 가족 코드가 맞지 않아요. 부모님께 다시 확인해주세요!')
        } else if (error.message.includes('Email')) {
          setError('📧 이미 사용 중인 이메일이에요. 다른 이메일을 사용해주세요!')
        } else {
          setError(`😅 ${error.message}`)
        }
      } else {
        setError('😕 회원가입 중에 문제가 생겼어요. 다시 시도해주세요!')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🌱 MoneySeed 💰</h1>
            <p className="text-lg text-gray-600">우리 가족 용돈 관리를 시작해요!</p>
            <p className="text-sm text-gray-500 mt-2">
              {['father', 'mother'].includes(userType) ? '👨‍👩‍👧‍👦 부모님이라면 가족을 만들어요' : '🧒 자녀라면 가족 코드로 참여해요'}
            </p>
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
              <label htmlFor="fullName" className="block text-lg font-medium text-gray-700 mb-2">
                😊 이름이 뭐예요?
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-lg"
                placeholder="홍길동"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-lg font-medium text-gray-700 mb-2">
                📧 이메일 주소
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-lg"
                placeholder="example@email.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-lg font-medium text-gray-700 mb-2">
                🔐 비밀번호 (6글자 이상)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-lg"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-lg font-medium text-gray-700 mb-2">
                🔐 비밀번호 다시 한번
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-lg"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-lg font-medium text-gray-700 mb-3">
                👥 나는 누구일까요?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  userType === 'father' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="userType"
                    value="father"
                    checked={userType === 'father'}
                    onChange={(e) => setUserType(e.target.value as 'father' | 'mother' | 'son' | 'daughter')}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">👨</div>
                  <span className="text-sm font-medium text-gray-700">아빠</span>
                </label>
                <label className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  userType === 'mother' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="userType"
                    value="mother"
                    checked={userType === 'mother'}
                    onChange={(e) => setUserType(e.target.value as 'father' | 'mother' | 'son' | 'daughter')}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">👩</div>
                  <span className="text-sm font-medium text-gray-700">엄마</span>
                </label>
                <label className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  userType === 'son' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="userType"
                    value="son"
                    checked={userType === 'son'}
                    onChange={(e) => setUserType(e.target.value as 'father' | 'mother' | 'son' | 'daughter')}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">👦</div>
                  <span className="text-sm font-medium text-gray-700">아들</span>
                </label>
                <label className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  userType === 'daughter' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="userType"
                    value="daughter"
                    checked={userType === 'daughter'}
                    onChange={(e) => setUserType(e.target.value as 'father' | 'mother' | 'son' | 'daughter')}
                    className="sr-only"
                  />
                  <div className="text-2xl mb-1">👧</div>
                  <span className="text-sm font-medium text-gray-700">딸</span>
                </label>
              </div>
            </div>

            {['son', 'daughter'].includes(userType) && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <label htmlFor="familyCode" className="block text-lg font-medium text-gray-700 mb-2">
                  🔑 부모님께 받은 가족 코드
                </label>
                <input
                  id="familyCode"
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-lg text-center font-mono"
                  placeholder="FAM123ABC"
                  required={['son', 'daughter'].includes(userType)}
                />
                <p className="mt-2 text-sm text-gray-600 flex items-center">
                  <span className="mr-2">💡</span>
                  부모님이 알려주신 가족 코드를 입력하세요
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:bg-gray-400 text-white font-bold py-4 px-4 rounded-xl text-lg transition-all transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  가입 중이에요...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <span className="mr-2">🚀</span>
                  {['father', 'mother'].includes(userType) ? '가족 만들기!' : '가족에 참여하기!'}
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-lg text-gray-600">
              이미 계정이 있나요?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-bold text-lg">
                👋 로그인하기
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}