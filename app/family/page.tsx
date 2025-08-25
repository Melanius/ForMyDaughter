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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">가족 관리</h1>

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
        /* 자녀 계정용 UI */
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">가족 연결 상태</h2>
          {profile.parent_id ? (
            <div className="text-green-600">
              <p className="font-medium">✅ 부모 계정과 연결되어 있습니다</p>
              <p className="text-sm text-gray-600 mt-2">
                모든 미션과 용돈 관리가 부모님과 공유됩니다.
              </p>
            </div>
          ) : (
            <div className="text-yellow-600">
              <p className="font-medium">⏳ 부모님의 승인을 기다리고 있습니다</p>
              <p className="text-sm text-gray-600 mt-2">
                부모님께서 연결 요청을 승인해주시면 이용할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}