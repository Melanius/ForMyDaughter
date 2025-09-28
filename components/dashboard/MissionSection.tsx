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
  isFirstLogin?: boolean  // 첫 로그인 여부 추가
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
  isFirstLogin,
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
  // 자녀 계정인지 확인
  const isChild = userType !== 'parent'

  return (
    <div>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">미션을 불러오는 중...</p>
          </div>
        ) : missions.length === 0 && isChild && !isFirstLogin ? (
          /* 자녀 계정 - 미션이 없을 때 제안 안내 */
          <>
            {/* 날짜 선택기 */}
            <div className="flex justify-center mb-6">
              <CompactDateNavigator 
                selectedDate={selectedDate}
                onDateChange={onDateChange}
              />
            </div>

            {/* 미션 제안 안내 */}
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎯</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                아직 미션이 없어요
              </h3>
              <p className="text-gray-600 mb-8 leading-relaxed max-w-md mx-auto">
                부모님께 미션을 제안해보세요!<br/>
                방 정리, 숙제하기, 설거지 돕기 등<br/>
                할 수 있는 일들을 제안할 수 있어요.
              </p>
              
              {/* 미션 제안 버튼 영역 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <span className="text-2xl">💡</span>
                  <span className="font-semibold text-blue-800">미션 제안하기</span>
                </div>
                <p className="text-blue-700 text-sm mb-4">
                  내가 할 수 있는 미션을 부모님께 제안해보세요
                </p>
                <button
                  onClick={() => {
                    // 미션 제안 기능 - 부모 컴포넌트에서 처리하거나 별도 페이지로 이동
                    window.location.href = '/mission-proposals'
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  미션 제안하러 가기 🚀
                </button>
              </div>
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