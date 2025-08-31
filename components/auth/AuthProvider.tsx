'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/supabase'
import missionSupabaseService from '@/lib/services/missionSupabase'
import { getTodayKST } from '@/lib/utils/dateUtils'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
      
      // 자녀 계정 로그인 시 데일리 미션 체크
      await checkDailyMissionsForChild(data)
      
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    }
  }

  const checkDailyMissionsForChild = async (profileData: Profile) => {
    // 자녀 계정이 아니면 체크하지 않음
    if (!profileData || profileData.user_type !== 'child') {
      return
    }

    try {
      console.log('🎯 자녀 계정 로그인 감지 - 데일리 미션 체크 시작')
      const today = getTodayKST()
      const todayMissions = await missionSupabaseService.getFamilyMissionInstances(today)
      const dailyMissions = todayMissions.filter(m => 
        m.missionType === 'daily'
      )
      
      if (dailyMissions.length === 0) {
        console.log('🚨 오늘의 데일리 미션이 없음 - 자동 생성 필요')
        const generatedCount = await missionSupabaseService.generateDailyMissions(today)
        console.log(`✨ ${generatedCount}개의 데일리 미션 자동 생성 완료`)
      } else {
        console.log(`✅ 오늘의 데일리 미션 ${dailyMissions.length}개 확인됨`)
      }
    } catch (error) {
      console.error('❌ 자녀 계정 데일리 미션 체크 실패:', error)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}