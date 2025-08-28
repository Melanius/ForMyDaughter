'use client'

import { useState, useEffect, useCallback } from 'react'
import allowanceSupabaseService from '@/lib/services/allowanceSupabase'
import missionSupabaseService from '@/lib/services/missionSupabase'
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
      
      const balance = await allowanceSupabaseService.getCurrentBalance()
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
      const today = new Date().toISOString().split('T')[0]
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