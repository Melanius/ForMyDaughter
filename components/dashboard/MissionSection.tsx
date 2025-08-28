'use client'

import { useState } from 'react'
import { Mission } from '@/lib/types/mission'
import { AddMissionModal } from '../mission/AddMissionModal'
import { MissionCard } from '../mission/MissionCard'

interface MissionSectionProps {
  missions: Mission[]
  loading: boolean
  selectedDate: string
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {selectedDate === new Date().toISOString().split('T')[0] ? (
              <>오늘<span className="hidden sm:inline">의 미션</span></>
            ) : (
              `${new Date(selectedDate).getMonth() + 1}월 ${new Date(selectedDate).getDate()}일`
            )}
          </h2>
          <span className="text-xs sm:text-sm text-gray-500">{selectedDate}</span>
        </div>
        <div className="flex gap-2">
          {userType === 'parent' && (
            <button
              onClick={() => onShowAddModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium flex-1 sm:flex-none"
            >
              추가
            </button>
          )}
        </div>
      </div>

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