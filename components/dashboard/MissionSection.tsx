'use client'

import { useState, memo, lazy, Suspense } from 'react'
import { Mission } from '@/lib/types/mission'
import { MissionCard } from '../mission/MissionCard'
import { CompactDateNavigator } from '../navigation/CompactDateNavigator'

const AddMissionModal = lazy(() => import('../mission/AddMissionModal').then(module => ({ default: module.AddMissionModal })))

interface MissionSectionProps {
  missions: Mission[]
  loading: boolean
  selectedDate: string
  onDateChange: (date: string) => void
  userType?: string
  showAddModal: boolean
  editingMission: Mission | null
  onShowAddModal: (show: boolean) => void
  onAddMission: (mission: { 
    title: string
    description: string
    reward: number
    category?: string
    missionType?: string
    date?: string 
  }) => void
  onEditMission: (mission: Mission) => void
  onDeleteMission: (missionId: string) => void
  onMissionComplete: (missionId: string) => void
  onUndoComplete: (missionId: string) => void
  onUndoTransfer: (missionId: string) => void
  onCloseModal: () => void
}

export const MissionSection = memo(function MissionSection({
  missions,
  loading,
  selectedDate,
  onDateChange,
  userType,
  showAddModal,
  editingMission,
  onShowAddModal,
  onAddMission,
  onEditMission,
  onDeleteMission,
  onMissionComplete,
  onUndoComplete,
  onUndoTransfer,
  onCloseModal
}: MissionSectionProps) {
  // 자녀 계정에서 받을 수 있는 총 용돈 계산
  const totalReceivableAmount = userType !== 'parent' ? 
    missions
      .filter(mission => mission.isCompleted && !mission.isTransferred)
      .reduce((total, mission) => total + mission.reward, 0) : 0

  // 모든 미션이 완료되었는지 확인 (자녀용)
  const isChild = userType !== 'parent'
  const allMissionsCompleted = isChild && missions.length > 0 && missions.every(mission => mission.isCompleted)
  const completedMissionsCount = missions.filter(mission => mission.isCompleted).length
  const totalReward = missions.reduce((total, mission) => total + mission.reward, 0)

  return (
    <div>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">미션을 불러오는 중...</p>
          </div>
        ) : allMissionsCompleted ? (
          /* 자녀용 - 모든 미션 완료 시 심플화된 UI */
          <>
            {/* 날짜 선택기 - 간소화 */}
            <div className="flex justify-center mb-6">
              <CompactDateNavigator 
                selectedDate={selectedDate}
                onDateChange={onDateChange}
              />
            </div>

            {/* 축하 메시지 */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">모든 미션 완료!</h2>
              <p className="text-gray-600 mb-4">오늘의 {missions.length}개 미션을 모두 완성했어요!</p>
              
              {/* 완료 요약 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-lg max-w-md mx-auto">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-700">{completedMissionsCount}개</div>
                    <div className="text-sm text-green-600">완료한 미션</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700">{totalReward.toLocaleString()}원</div>
                    <div className="text-sm text-green-600">총 보상</div>
                  </div>
                </div>
                
                {totalReceivableAmount > 0 && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="text-xs text-green-600 mb-1">받을 수 있는 용돈</div>
                    <div className="text-xl font-bold text-green-700">{totalReceivableAmount.toLocaleString()}원</div>
                  </div>
                )}
              </div>
            </div>

            {/* 미션 목록 접기/펼치기 버튼 */}
            <div className="text-center">
              <button
                onClick={() => {
                  // 상세 보기를 위한 상태 토글 로직은 부모 컴포넌트에서 처리
                  // 여기서는 간단히 스크롤을 아래로 이동
                  window.scrollTo({ top: window.scrollY + 300, behavior: 'smooth' })
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                완료한 미션 목록 보기 ▼
              </button>
            </div>
          </>
        ) : (
          /* 일반 미션 표시 UI */
          <>
            {/* 미션 카운트 섹션 */}
            <div className="flex items-center justify-center mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <span className="text-sm font-medium text-gray-800">
                  오늘의 미션 <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-bold">{missions.length}</span>개
                </span>
              </div>
            </div>
            
            {/* 날짜 선택기 섹션 - 중앙 배치 */}
            <div className="flex justify-center mb-4">
              <CompactDateNavigator 
                selectedDate={selectedDate}
                onDateChange={onDateChange}
              />
            </div>

            {/* 불필요한 용돈 표시 제거됨 - 용돈 정보는 AllowanceRequestButton에서 처리 */}
            
            {missions.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                userType={userType || 'child'}
                onComplete={() => onMissionComplete(mission.id)}
                onUndoComplete={() => onUndoComplete(mission.id)}
                onEdit={() => onEditMission(mission)}
                onDelete={() => onDeleteMission(mission.id)}
                onUndoTransfer={() => onUndoTransfer(mission.id)}
              />
            ))}
          </>
        )}
      </div>

      {showAddModal && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
              <p>로딩 중...</p>
            </div>
          </div>
        }>
          <AddMissionModal
            onClose={onCloseModal}
            onAdd={onAddMission}
            editingMission={editingMission}
            defaultDate={selectedDate}
          />
        </Suspense>
      )}
    </div>
  )
})