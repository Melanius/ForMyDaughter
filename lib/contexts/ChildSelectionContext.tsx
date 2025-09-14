'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import familyCompatibilityService from '@/lib/services/familyCompatibilityService'
import { FamilyMemberWithProfile } from '@/lib/types/family'
import { isParentRole, isChildRole } from '../utils/roleUtils'

/**
 * 🧒 자녀 선택 컨텍스트 타입 정의
 */
export interface ChildInfo {
  id: string
  name: string
  nickname?: string
  avatar?: string
  role: 'father' | 'mother' | 'son' | 'daughter'
}

interface ChildSelectionContextType {
  // 선택된 자녀 정보
  selectedChildId: string | null
  availableChildren: ChildInfo[]
  
  // 현재 사용자 정보
  isParent: boolean
  currentUserId: string | null
  familyRole?: 'father' | 'mother' | 'child'
  
  // 액션
  selectChild: (childId: string) => void
  
  // 권한 정보
  permissions: {
    canView: boolean
    canManage: boolean
  }
  
  // 상태
  loading: boolean
  error: string | null
}

const ChildSelectionContext = createContext<ChildSelectionContextType | null>(null)

interface ChildSelectionProviderProps {
  children: ReactNode
}

/**
 * 🏠 자녀 선택 컨텍스트 프로바이더
 * 
 * 다중 자녀 지원을 위한 핵심 컨텍스트:
 * - 부모: 자녀 목록과 선택 기능 제공
 * - 자녀: 본인 정보만 제공 (선택 기능 없음)
 */
export function ChildSelectionProvider({ children }: ChildSelectionProviderProps) {
  const { user, profile } = useAuth()
  
  // 상태 관리
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [availableChildren, setAvailableChildren] = useState<ChildInfo[]>([])
  const [isParent, setIsParent] = useState(false)
  const [familyRole, setFamilyRole] = useState<'father' | 'mother' | 'child'>()
  const [permissions, setPermissions] = useState({ canView: false, canManage: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * 초기 데이터 로드 및 상태 설정
   */
  useEffect(() => {
    let mounted = true

    const initializeChildSelection = async () => {
      if (!user || !profile) {
        setLoading(false)
        return
      }

      try {
        setError(null)
        
        // familyCompatibilityService를 통해 가족 정보 조회
        const familyData = await familyCompatibilityService.getCurrentUserWithFamily()
        
        if (!mounted) return

        // 사용자 역할 설정
        const userRole = familyData.familyRole || (isParentRole(profile.user_type) ? 'father' : 'child')
        setFamilyRole(userRole)
        setIsParent(userRole === 'father' || userRole === 'mother')

        if (familyData.family && (userRole === 'father' || userRole === 'mother')) {
          // 부모인 경우: 자녀 목록 구성
          const children: ChildInfo[] = familyData.family.members
            .filter(member => isChildRole(member.role))
            .map(member => ({
              id: member.user_id,
              name: member.profile.full_name,
              nickname: member.nickname,
              avatar: member.profile.avatar_url,
              role: member.role
            }))

          setAvailableChildren(children)

          // 첫 번째 자녀를 기본 선택
          if (children.length > 0 && !selectedChildId) {
            setSelectedChildId(children[0].id)
          }

          // 권한 설정 (부모는 모든 권한)
          setPermissions({ canView: true, canManage: true })
        } else {
          // 자녀인 경우: 본인만 설정
          setAvailableChildren([])
          setSelectedChildId(null) // 자녀는 본인 ID를 useSelectedChild에서 반환
          
          // 권한 설정 (자녀는 본인 데이터만)
          setPermissions({ canView: true, canManage: false })
        }

        console.log('🧒 ChildSelectionProvider 초기화 완료:', {
          userRole,
          isParent: userRole === 'father' || userRole === 'mother',
          childrenCount: availableChildren.length,
          selectedChildId
        })

      } catch (err) {
        console.error('❌ ChildSelectionProvider 초기화 실패:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : '초기화 중 오류가 발생했습니다')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeChildSelection()

    return () => {
      mounted = false
    }
  }, [user, profile])

  /**
   * 자녀 선택 함수
   */
  const selectChild = async (childId: string) => {
    if (!isParent) {
      console.warn('⚠️ 자녀 계정은 다른 사용자를 선택할 수 없습니다')
      return
    }

    const targetChild = availableChildren.find(child => child.id === childId)
    if (!targetChild) {
      console.warn('⚠️ 유효하지 않은 자녀 ID:', childId)
      return
    }

    try {
      // 권한 검증
      const currentUserId = user?.id
      if (currentUserId) {
        const canView = await familyCompatibilityService.canViewMissions(currentUserId, childId)
        if (!canView) {
          setError('해당 자녀의 정보를 볼 권한이 없습니다')
          return
        }
      }

      setSelectedChildId(childId)
      setError(null)

      console.log('👶 자녀 선택 변경:', {
        childId,
        childName: targetChild.name,
        childNickname: targetChild.nickname
      })

    } catch (err) {
      console.error('❌ 자녀 선택 중 오류:', err)
      setError('자녀 선택 중 오류가 발생했습니다')
    }
  }

  const contextValue: ChildSelectionContextType = {
    selectedChildId,
    availableChildren,
    isParent,
    currentUserId: user?.id || null,
    familyRole,
    selectChild,
    permissions,
    loading,
    error
  }

  return (
    <ChildSelectionContext.Provider value={contextValue}>
      {children}
    </ChildSelectionContext.Provider>
  )
}

/**
 * 🎯 자녀 선택 컨텍스트 사용 훅
 */
export function useChildSelection(): ChildSelectionContextType {
  const context = useContext(ChildSelectionContext)
  
  if (!context) {
    throw new Error('useChildSelection은 ChildSelectionProvider 내에서만 사용할 수 있습니다')
  }
  
  return context
}

/**
 * 🎯 선택된 자녀 ID 반환 훅 (편의 함수)
 * 
 * 부모: 선택된 자녀 ID 반환
 * 자녀: 본인 ID 반환
 */
export function useSelectedChild(): string | null {
  const context = useChildSelection()
  const { user } = useAuth()

  if (context.loading) {
    return null
  }

  // 부모인 경우: 선택된 자녀 ID 반환
  if (context.isParent) {
    return context.selectedChildId
  }
  
  // 자녀인 경우: 본인 ID 반환
  return user?.id || null
}