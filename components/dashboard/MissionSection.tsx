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
  return (
    <div>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">미션을 불러오는 중...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <span className="text-sm font-medium text-gray-800">
                  오늘의 미션 <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-bold">{missions.length}</span>개
                </span>
              </div>
              <CompactDateNavigator 
                selectedDate={selectedDate}
                onDateChange={onDateChange}
              />
            </div>
            
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