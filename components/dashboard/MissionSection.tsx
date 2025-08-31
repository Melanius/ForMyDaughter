'use client'

import { useState } from 'react'
import { Mission } from '@/lib/types/mission'
import { AddMissionModal } from '../mission/AddMissionModal'
import { MissionCard } from '../mission/MissionCard'
import { DateSwipeNavigator } from '../navigation/DateSwipeNavigator'

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

export function MissionSection({
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
  return (
    <div>
      {/* 날짜 스와이프 네비게이터 */}
      <DateSwipeNavigator 
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        dateRange={{ past: 7, future: 7 }}
      />
      
      {/* 미션 추가 버튼 */}
      {userType === 'parent' && (
        <div className="flex justify-center mb-6">
          <button
            onClick={() => onShowAddModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors text-sm font-medium shadow-lg hover:shadow-xl"
          >
            ✚ 미션 추가
          </button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">미션을 불러오는 중...</p>
          </div>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-gray-400">미션: {missions.length}개</p>
            
            {missions.map(mission => (
              <MissionCard
                key={mission.id}
                mission={mission}
                userType={userType}
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
        <AddMissionModal
          onClose={onCloseModal}
          onAdd={onAddMission}
          editingMission={editingMission}
          defaultDate={selectedDate}
        />
      )}
    </div>
  )
}