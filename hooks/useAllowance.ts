'use client'

import { useState, useEffect, useCallback } from 'react'
import allowanceSupabaseService from '@/lib/services/allowanceSupabase'
import missionSupabaseService from '@/lib/services/missionSupabase'
import enhancedSyncService from '@/lib/services/enhancedSync'
import { Mission } from '@/lib/types/mission'
import { useAuth } from '@/components/auth/AuthProvider'

export function useAllowance() {
  const { profile } = useAuth()
  const [currentAllowance, setCurrentAllowance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBalance = useCallback(async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)
      
      console.log('💰 잔액 로딩 시작:', profile?.user_type, profile?.id)
      const balance = await allowanceSupabaseService.getCurrentBalance()
      console.log('💰 잔액 로딩 완료:', balance)
      setCurrentAllowance(balance)
    } catch (error) {
      console.error('용돈 잔액 로드 실패:', error)
      setError('용돈 정보를 불러오는데 실패했습니다.')
      setCurrentAllowance(0)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  const transferMissions = useCallback(async (missions: Mission[]) => {
    const pendingMissions = missions.filter(m => m.isCompleted && !m.isTransferred)
    
    if (pendingMissions.length === 0) {
      throw new Error('전달할 미션이 없습니다.')
    }

    const totalAmount = pendingMissions.reduce((sum, m) => sum + m.reward, 0)
    
    // 부모 확인
    if (!confirm(`${totalAmount.toLocaleString()}원을 자녀에게 지급하시겠습니까?`)) {
      return { success: false, message: '사용자가 취소했습니다.' }
    }

    try {
      const today = new Date().toISOString().split('T')[0]!
      const missionIds = pendingMissions.map(m => m.id)
      
      // 1. 미션 상태를 전달 완료로 업데이트
      await missionSupabaseService.transferMissions(missionIds)
      
      // 2. 각 미션의 원래 사용자(자녀)에게 거래 내역 추가
      for (const mission of pendingMissions) {
        if (!mission.userId) {
          console.error('미션에 userId가 없습니다:', mission)
          continue
        }
        
        await allowanceSupabaseService.addMissionIncomeForUser(
          mission.userId,
          mission.id, 
          mission.reward, 
          mission.title, 
          today
        )
      }

      // 3. 업데이트된 잔액 가져오기
      const updatedBalance = await allowanceSupabaseService.getCurrentBalance()
      setCurrentAllowance(updatedBalance)
      
      // localStorage 업데이트
      localStorage.setItem('currentAllowance', updatedBalance.toString())

      // 4. 자녀 계정에 잔액 업데이트 동기화 알림
      for (const mission of pendingMissions) {
        if (mission.userId) {
          // 각 자녀의 실제 업데이트된 잔액 조회
          try {
            const childBalance = await allowanceSupabaseService.getCurrentBalanceForUser(mission.userId)
            
            enhancedSyncService.notify({
              type: 'allowance_update',
              entityId: mission.userId,
              data: {
                current_balance: childBalance,
                mission_reward: mission.reward,
                mission_title: mission.title,
                transfer_completed: true
              },
              userId: mission.userId
            })
            
            console.log(`💰 자녀 ${mission.userId} 동기화 알림 전송 - 잔액: ${childBalance}`)
          } catch (syncError) {
            console.error('동기화 알림 실패:', syncError)
          }
        }
      }

      return { success: true, transferredAmount: totalAmount }
    } catch (error) {
      console.error('미션 전달 실패:', error)
      throw new Error('미션 전달에 실패했습니다.')
    }
  }, [])

  const undoTransfer = useCallback(async (missionId: string, reward: number) => {
    try {
      // Supabase 기반 미션 되돌리기
      await missionSupabaseService.uncompleteMission(missionId)
      
      // 미션 수입도 제거
      await allowanceSupabaseService.removeMissionIncome(missionId)

      // 현재 용돈에서 미션 보상 차감
      setCurrentAllowance(prev => prev - reward)
      
      return { success: true }
    } catch (error) {
      console.error('전달 되돌리기 실패:', error)
      throw new Error('전달 되돌리기에 실패했습니다.')
    }
  }, [])

  const updateBalance = useCallback((newBalance: number) => {
    setCurrentAllowance(newBalance)
    localStorage.setItem('currentAllowance', newBalance.toString())
  }, [])

  // 초기 로딩
  useEffect(() => {
    loadBalance()
  }, [loadBalance])

  // 실시간 동기화 구독 (자녀 계정용)
  useEffect(() => {
    if (!profile?.id) return

    const unsubscribe = enhancedSyncService.subscribe({
      onUpdate: async (payload) => {
        // 자신의 용돈 업데이트만 처리
        if (payload.type === 'allowance_update' && payload.userId === profile.id) {
          console.log('💰 용돈 실시간 업데이트 수신:', payload)
          
          if (payload.data) {
            const newBalance = (payload.data['current_balance'] as number) || (payload.data['balance'] as number)
            if (typeof newBalance === 'number') {
              setCurrentAllowance(newBalance)
              localStorage.setItem('currentAllowance', newBalance.toString())
              console.log('💰 용돈 잔액 실시간 업데이트:', newBalance)
            }
          }
        }
      }
    })

    return unsubscribe
  }, [profile?.id])

  // localStorage에서 초기값 로드
  useEffect(() => {
    const savedBalance = localStorage.getItem('currentAllowance')
    if (savedBalance && !loading) {
      setCurrentAllowance(parseInt(savedBalance, 10) || 0)
    }
  }, [loading])

  // 잔액 변경 시 localStorage 업데이트
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('currentAllowance', currentAllowance.toString())
    }
  }, [currentAllowance, loading])

  return {
    currentAllowance,
    loading,
    error,
    loadBalance,
    transferMissions,
    undoTransfer,
    updateBalance
  }
}