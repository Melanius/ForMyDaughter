'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'

interface Profile {
  id: string
  full_name: string
  email: string
  user_type: 'parent' | 'child'
  family_code?: string
  parent_id?: string
  created_at: string
}

interface FamilyConnectionRequest {
  id: string
  parent_id: string
  child_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  child_profile: {
    full_name: string
    email: string
  }
}

export default function FamilyPage() {
  const { user, profile } = useAuth()
  const [familyCode, setFamilyCode] = useState<string>('')
  const [children, setChildren] = useState<Profile[]>([])
  const [connectionRequests, setConnectionRequests] = useState<FamilyConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user && profile) {
      loadFamilyData()
    }
  }, [user, profile])

  const loadFamilyData = async () => {
    if (!profile) return

    try {
      if (profile.user_type === 'parent') {
        // 부모인 경우: 가족 코드와 연결된 자녀들, 연결 요청 조회
        setFamilyCode(profile.family_code || '')
        
        // 승인된 자녀들 조회
        const { data: childrenData, error: childrenError } = await supabase
          .from('profiles')
          .select('*')
          .eq('parent_id', profile.id)
        
        if (childrenError) {
          console.error('Children fetch error:', childrenError)
        } else {
          setChildren(childrenData || [])
        }

        // 대기 중인 연결 요청 조회
        const { data: requestsData, error: requestsError } = await supabase
          .from('family_connection_requests')
          .select(`
            *,
            child_profile:profiles!child_id (
              full_name,
              email
            )
          `)
          .eq('parent_id', profile.id)
          .eq('status', 'pending')
        
        if (requestsError) {
          console.error('Requests fetch error:', requestsError)
        } else {
          setConnectionRequests(requestsData || [])
        }
      } else {
        // 자녀인 경우: 부모 정보 조회
        if (profile.parent_id) {
          const { data: parentData, error: parentError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profile.parent_id)
            .single()
          
          if (parentError) {
            console.error('Parent fetch error:', parentError)
          }
        }
      }
    } catch (error) {
      console.error('Family data load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async (requestId: string, childId: string) => {
    try {
      // 1. 연결 요청 승인으로 변경
      const { error: requestError } = await supabase
        .from('family_connection_requests')
        .update({ 
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (requestError) throw requestError

      // 2. 자녀 프로필에 parent_id 설정
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ parent_id: profile?.id })
        .eq('id', childId)

      if (profileError) throw profileError

      // 3. 데이터 새로고침
      await loadFamilyData()
      
      alert('자녀 계정이 승인되었습니다!')
    } catch (error) {
      console.error('Approve request error:', error)
      alert('승인 처리 중 오류가 발생했습니다.')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('family_connection_requests')
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      await loadFamilyData()
      alert('연결 요청이 거절되었습니다.')
    } catch (error) {
      console.error('Reject request error:', error)
      alert('거절 처리 중 오류가 발생했습니다.')
    }
  }

  const copyFamilyCode = async () => {
    if (familyCode) {
      await navigator.clipboard.writeText(familyCode)
      alert('가족 코드가 복사되었습니다!')
    }
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로그인이 필요합니다.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">가족 정보를 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 p-4 md:p-8 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl sm:text-5xl">👨‍👩‍👧‍👦</span>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
              가족
            </h1>
            <span className="text-4xl sm:text-5xl">❤️</span>
          </div>
        </div>

        {profile.user_type === 'parent' ? (
        <div className="space-y-8">
          {/* 가족 코드 섹션 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">가족 코드</h2>
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">자녀가 회원가입할 때 사용할 가족 코드:</p>
                <p className="text-2xl font-mono font-bold text-blue-600">{familyCode || '코드가 없습니다'}</p>
              </div>
              {familyCode && (
                <button
                  onClick={copyFamilyCode}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  복사하기
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              이 코드를 자녀에게 알려주세요. 자녀가 회원가입할 때 이 코드를 입력해야 합니다.
            </p>
          </div>

          {/* 연결 요청 섹션 */}
          {connectionRequests.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">연결 요청</h2>
              <div className="space-y-4">
                {connectionRequests.map((request) => (
                  <div key={request.id} className="border rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{request.child_profile.full_name}</p>
                        <p className="text-sm text-gray-600">{request.child_profile.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          요청일: {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.child_id)}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                          거절
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 연결된 자녀 목록 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">연결된 자녀 ({children.length}명)</h2>
            {children.length > 0 ? (
              <div className="space-y-3">
                {children.map((child) => (
                  <div key={child.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{child.full_name}</p>
                      <p className="text-sm text-gray-600">{child.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        가입일: {new Date(child.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-green-600 font-medium">연결됨</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">아직 연결된 자녀가 없습니다.</p>
            )}
          </div>
        </div>
        ) : (
          /* 자녀용 가족 페이지 */
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🏠</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                우리 가족 공간
              </h2>
              
              {profile.parent_id ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 max-w-md mx-auto">
                  <div className="text-4xl mb-4">✨</div>
                  <p className="text-lg font-semibold text-green-700 mb-2">
                    부모님과 연결됨!
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <span>🎯</span>
                    <span>미션과 용돈이 공유돼요</span>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 max-w-md mx-auto">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-lg font-semibold text-orange-700 mb-2">
                    부모님 승인 대기 중
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <span>🙏</span>
                    <span>조금만 기다려주세요!</span>
                  </div>
                </div>
              )}

              <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 max-w-md mx-auto">
                <div className="text-3xl mb-3">🚧</div>
                <p className="text-sm text-gray-700">
                  더 많은 가족 기능을 준비하고 있어요!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}