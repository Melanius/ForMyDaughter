'use client'

import { useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { isParentRole } from '@/lib/utils/roleUtils'
import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { Profile } from '@/lib/types/profile'

interface UseFamilyEffectsProps {
  setConnectedChildren: (children: Profile[]) => void
  setIsParentWithChild: (isParent: boolean) => void
}

export function useFamilyEffects({
  setConnectedChildren,
  setIsParentWithChild
}: UseFamilyEffectsProps) {
  const { profile } = useAuth()

  // 가족 연결 상태 확인
  useEffect(() => {
    const checkFamilyConnection = async () => {
      if (!isParentRole(profile?.user_type)) return

      try {
        const supabase = createClient()
        const { data: children, error } = await supabase
          .from('profiles')
          .select('id, full_name, family_code')
          .eq('parent_id', profile?.id || '')
          .in('user_type', ['son', 'daughter', 'child'])
        
        if (!error && children && children.length > 0) {
          setConnectedChildren(children)
          setIsParentWithChild(true)
          logger.log('연결된 자녀 조회 완료', { count: children.length })
        } else {
          setConnectedChildren([])
          setIsParentWithChild(false)
        }
      } catch (error) {
        console.error('가족 연결 상태 확인 실패:', error)
        setIsParentWithChild(false)
      }
    }

    checkFamilyConnection()
  }, [profile, setConnectedChildren, setIsParentWithChild])
}