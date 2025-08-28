'use client'

import { Mission } from '@/lib/types/mission'

interface WalletSectionProps {
  currentAllowance: number
  missions: Mission[]
  isParentWithChild: boolean
  userType?: string
  onTransferMissions: () => Promise<void>
}

export function WalletSection({
  currentAllowance,
  missions,
  isParentWithChild,
  userType,
  onTransferMissions
}: WalletSectionProps) {
  const pendingAmount = missions
    .filter(m => m.isCompleted && !m.isTransferred)
    .reduce((sum, m) => sum + m.reward, 0)

  const hasPendingMissions = missions.filter(m => m.isCompleted && !m.isTransferred).length > 0

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 text-center mb-6 sm:mb-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
        {isParentWithChild ? (
          <>자녀<span className="hidden sm:inline"> 지갑</span></>
        ) : (
          <>내<span className="hidden sm:inline"> 지갑</span></>
        )}
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-2xl sm:text-3xl font-bold text-green-600">
            {currentAllowance.toLocaleString()}원
          </p>
          <p className="text-sm sm:text-base text-gray-600">
            보유<span className="hidden sm:inline"> 금액</span>
          </p>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-2xl sm:text-3xl font-bold text-orange-600">
            {pendingAmount.toLocaleString()}원
          </p>
          <p className="text-sm sm:text-base text-gray-600">
            받을<span className="hidden sm:inline"> 금액</span>
          </p>
        </div>
      </div>
      
      {hasPendingMissions && (
        userType === 'parent' ? (
          <button
            onClick={onTransferMissions}
            className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-3 rounded-lg transition-colors font-medium text-sm sm:text-base"
          >
            용돈 전달 완료
          </button>
        ) : (
          <div className="bg-orange-100 border border-orange-300 text-orange-800 px-4 sm:px-6 py-3 rounded-lg text-center text-sm sm:text-base">
            <p className="font-medium">부모님 승인 대기중</p>
            <p className="text-xs sm:text-sm text-orange-600 mt-1">
              완료한 미션의 용돈을 받으려면 부모님의 승인이 필요해요
            </p>
          </div>
        )
      )}
    </div>
  )
}