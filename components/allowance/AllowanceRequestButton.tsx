'use client'

import { useState, useEffect } from 'react'
import { Wallet, ArrowRight, Coins, Gift, Clock } from 'lucide-react'
import settlementService from '@/lib/services/settlementService'
import celebrationService from '@/lib/services/celebrationService'
import { useAllowance } from '@/hooks/useAllowance'
import { Mission } from '@/lib/types/mission'
import { isParentRole } from '@/lib/utils/roleUtils'

interface AllowanceRequestButtonProps {
  userId: string
  parentId?: string
  userType: 'father' | 'mother' | 'son' | 'daughter'
  connectedChildren?: { id: string; full_name: string; family_code: string }[]
  onRequestSent?: (amount: number, missions: Mission[]) => void
}

export default function AllowanceRequestButton({
  userId,
  parentId,
  userType,
  connectedChildren = [],
  onRequestSent
}: AllowanceRequestButtonProps) {
  const { transferMissions } = useAllowance()
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAmount, setPendingAmount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [showDetails, setShowDetails] = useState(false)
  const [pendingMissions, setPendingMissions] = useState<Mission[]>([])
  const [hasChildRequest, setHasChildRequest] = useState(false)
  const [requestingChild, setRequestingChild] = useState<{ id: string; name: string } | null>(null)

  const isParent = isParentRole(userType)

  // 컴포넌트 마운트 시 미정산 용돈 조회
  const loadPendingAmount = async () => {
    try {
      if (isParent) {
        // 부모: 연결된 자녀들의 미정산 용돈 확인
        if (connectedChildren.length === 0) {
          setPendingAmount(0)
          setPendingCount(0)
          setHasChildRequest(false)
          setRequestingChild(null)
          return
        }

        // 각 자녀의 미정산 용돈 확인
        for (const child of connectedChildren) {
          const settlement = await settlementService.getAllPendingSettlements(child.id)
          if (settlement.totalCount > 0) {
            // 첫 번째로 발견된 미정산 용돈이 있는 자녀
            setPendingAmount(settlement.totalAmount)
            setPendingCount(settlement.totalCount)
            setPendingMissions(settlement.missions)
            setHasChildRequest(true)
            setRequestingChild({ id: child.id, name: child.full_name })
            console.log(`부모 계정: ${child.full_name} 자녀의 미정산 용돈 ${settlement.totalAmount}원 발견`)
            return
          }
        }

        // 모든 자녀가 미정산 용돈이 없음
        setPendingAmount(0)
        setPendingCount(0)
        setHasChildRequest(false)
        setRequestingChild(null)
      } else {
        // 자녀: 자신의 미정산 용돈 확인
        const settlement = await settlementService.getAllPendingSettlements(userId)
        setPendingAmount(settlement.totalAmount)
        setPendingCount(settlement.totalCount)
        setPendingMissions(settlement.missions)
        setHasChildRequest(false)
        setRequestingChild(null)
      }
    } catch (error) {
      console.error('미정산 용돈 조회 실패:', error)
    }
  }

  // 초기 로딩
  useEffect(() => {
    loadPendingAmount()
  }, [userId, connectedChildren, isParent])

  // 용돈 요청 처리 (자녀용)
  const handleRequestAllowance = async () => {
    if (isLoading) return

    setIsLoading(true)
    
    try {
      const result = await settlementService.requestManualSettlement(userId)
      
      if (result.success) {
        // 부모에게 용돈 전달 알림 전송
        if (parentId) {
          try {
            await celebrationService.sendCelebrationNotification(
              parentId,
              result.totalAmount,
              result.totalCount
            )
            
            // 성공 알림
            alert(`✨ ${result.message}`)
            
            // 콜백 실행
            onRequestSent?.(result.totalAmount, result.missions)
            
            // 상태 초기화 대신 부모가 전달할 수 있도록 상태 유지
            // setPendingAmount(0)
            // setPendingCount(0)
            
            // 요청 완료 상태로 변경
            setHasChildRequest(true)
          } catch (notificationError) {
            console.error('부모 알림 전송 실패:', notificationError)
            alert('용돈 요청은 완료되었지만 부모님 알림 전송에 실패했습니다.')
          }
        } else {
          alert(result.message)
          onRequestSent?.(result.totalAmount, result.missions)
        }
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('용돈 요청 처리 실패:', error)
      alert('용돈 요청 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  // 용돈 전달 완료 처리 (부모용)
  const handleTransferComplete = async () => {
    if (isLoading || pendingMissions.length === 0) return

    setIsLoading(true)
    
    try {
      const result = await transferMissions(pendingMissions)
      
      if (result.success) {
        // 성공 알림
        alert(`✅ ${result.transferredAmount.toLocaleString()}원 용돈 전달 완료!`)
        
        // 콜백 실행
        onRequestSent?.(result.transferredAmount, pendingMissions)
        
        // 상태 초기화
        setPendingAmount(0)
        setPendingCount(0)
        setPendingMissions([])
        setHasChildRequest(false)
      }
    } catch (error) {
      console.error('용돈 전달 실패:', error)
      alert('용돈 전달에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  // 표시 조건 확인
  if (isParent) {
    // 부모: 자녀 요청이 있을 때만 표시
    if (!hasChildRequest) {
      return null
    }
  } else {
    // 자녀: 미정산 용돈이 있을 때만 표시
    if (pendingCount === 0) {
      return null
    }
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100 p-4 mb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-full">
            {isParent ? <Clock className="w-5 h-5 text-purple-600" /> : <Coins className="w-5 h-5 text-purple-600" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {isParent ? `${requestingChild?.name || '자녀'} 용돈 요청` : '받을 수 있는 용돈'}
            </h3>
            <p className="text-sm text-gray-600">
              {isParent ? '전달 대기 중' : `완료한 미션 ${pendingCount}개`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-purple-600 hover:text-purple-700 transition-colors"
        >
          {showDetails ? '숨기기' : '자세히'}
        </button>
      </div>

      {/* 금액 표시 */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-purple-600 mb-1">
          {pendingAmount.toLocaleString()}원
        </div>
        <p className="text-sm text-gray-600">
          {isParent ? '전달할 용돈 금액' : '지금까지 완료한 미션 보상'}
        </p>
      </div>

      {/* 상세 정보 */}
      {showDetails && (
        <div className="bg-white rounded-lg p-3 mb-4 border border-purple-100">
          <p className="text-sm text-gray-600 mb-2">
            💡 <strong>언제 용돈을 받을 수 있나요?</strong>
          </p>
          <ul className="text-xs text-gray-500 space-y-1 ml-4">
            <li>• 하루의 모든 미션을 완료하면 자동으로 부모님께 알림이 가요</li>
            <li>• 일부만 완료했다면 아래 버튼으로 용돈을 요청할 수 있어요</li>
            <li>• 이전에 받지 못한 용돈도 함께 받을 수 있어요</li>
          </ul>
        </div>
      )}

      {/* 액션 버튼 */}
      {isParent ? (
        <>
          {/* 부모용 - 용돈 전달 완료 버튼 */}
          <button
            onClick={handleTransferComplete}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transform hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                전달 중...
              </>
            ) : (
              <>
                <Gift className="w-5 h-5" />
                용돈 전달 완료
              </>
            )}
          </button>

          {/* 부모용 안내 메시지 */}
          <p className="text-xs text-center text-gray-500 mt-2">
            자녀에게 용돈을 전달합니다
          </p>
        </>
      ) : (
        <>
          {/* 자녀용 - 용돈 요청 버튼 */}
          <button
            onClick={handleRequestAllowance}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                요청 중...
              </>
            ) : (
              <>
                <Gift className="w-5 h-5" />
                부모님께 용돈 요청하기
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* 자녀용 안내 메시지 */}
          <p className="text-xs text-center text-gray-500 mt-2">
            요청하면 부모님 계정에 알림이 전달돼요
          </p>
        </>
      )}
    </div>
  )
}