'use client'

import { useState } from 'react'

interface Mission {
  id: string
  title: string
  description?: string
  reward: number
  isCompleted: boolean
}

interface MissionCardProps {
  mission: Mission
  onComplete: (missionId: string) => void
  onEdit: (mission: Mission) => void
  onDelete: (missionId: string) => void
}

export function MissionCard({ mission, onComplete, onEdit, onDelete }: MissionCardProps) {
  const [isCompleting, setIsCompleting] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    await onComplete(mission.id)
    setIsCompleting(false)
  }

  return (
    <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${
      mission.isCompleted 
        ? 'bg-green-50 border-green-200 opacity-75' 
        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`text-lg font-semibold ${
              mission.isCompleted ? 'text-green-800 line-through' : 'text-gray-800'
            }`}>
              {mission.title}
            </h3>
            {mission.isCompleted && (
              <span className="text-2xl">✅</span>
            )}
          </div>
          
          {mission.description && (
            <p className="text-gray-600 text-sm mb-3">{mission.description}</p>
          )}
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-yellow-500">💰</span>
              <span className="font-semibold text-green-600">{mission.reward.toLocaleString()}원</span>
            </div>
            
            <div className="text-xs text-gray-500">
              {mission.isCompleted ? '완료됨' : '미완료'}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 ml-4">
          {!mission.isCompleted && (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              {isCompleting ? '처리중...' : '완료'}
            </button>
          )}
          
          <button
            onClick={() => onEdit(mission)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
          >
            수정
          </button>
          
          <button
            onClick={() => onDelete(mission.id)}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}