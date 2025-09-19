/**
 * 🗑️ 미션 템플릿 삭제 확인 모달
 * 
 * 템플릿 삭제 시 오늘 생성된 미션도 함께 삭제할지 확인하는 모달
 */

'use client'

import React, { useState, useEffect } from 'react'
import { MissionTemplate } from '@/lib/types/mission'
import missionSupabaseService from '@/lib/services/missionSupabase'
import { getTodayKST } from '@/lib/utils/dateUtils'

interface TemplateDeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deleteToday: boolean) => void
  template: MissionTemplate | null
}

interface TodayMissionInfo {
  count: number
  missions: Array<{
    id: string
    child_name: string
    is_completed: boolean
  }>
}

export function TemplateDeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  template 
}: TemplateDeleteConfirmModalProps) {
  const [todayMissions, setTodayMissions] = useState<TodayMissionInfo>({ count: 0, missions: [] })
  const [loading, setLoading] = useState(true)
  const [deleteToday, setDeleteToday] = useState(false)

  useEffect(() => {
    if (isOpen && template) {
      loadTodayMissions()
    }
  }, [isOpen, template])

  const loadTodayMissions = async () => {
    if (!template) return

    setLoading(true)
    try {
      const today = getTodayKST()
      
      // 오늘 이 템플릿으로 생성된 미션들 조회
      const missions = await missionSupabaseService.getMissionsByTemplateAndDate(template.id, today)
      
      // 자녀 프로필 정보와 함께 포맷
      const missionsWithProfiles = await Promise.all(
        missions.map(async (mission) => {
          const profile = await missionSupabaseService.getChildProfile(mission.userId)
          return {
            id: mission.id,
            child_name: profile?.full_name || '알 수 없음',
            is_completed: mission.isCompleted
          }
        })
      )

      setTodayMissions({
        count: missions.length,
        missions: missionsWithProfiles
      })
    } catch (error) {
      console.error('오늘 미션 조회 실패:', error)
      setTodayMissions({ count: 0, missions: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    onConfirm(deleteToday)
    onClose()
  }

  const handleClose = () => {
    setDeleteToday(false)
    onClose()
  }

  if (!isOpen || !template) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🗑️</span>
            <h2 className="text-xl font-bold text-gray-800">템플릿 삭제</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* 템플릿 정보 */}
        <div className="bg-red-50 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <span className="text-red-600 text-lg mr-2">📝</span>
            <div>
              <p className="text-red-800 text-sm font-medium mb-1">삭제할 템플릿</p>
              <p className="text-red-700 font-bold">{template.title}</p>
              <p className="text-red-600 text-xs mt-1">{template.category}</p>
            </div>
          </div>
        </div>

        {/* 오늘 미션 정보 */}
        {loading ? (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              <span className="text-blue-700">오늘 생성된 미션 확인 중...</span>
            </div>
          </div>
        ) : todayMissions.count > 0 ? (
          <div className="bg-orange-50 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="text-orange-600 text-lg mr-2">📅</span>
              <div className="flex-1">
                <p className="text-orange-800 text-sm font-medium mb-2">
                  오늘 생성된 미션 {todayMissions.count}개
                </p>
                <div className="space-y-1">
                  {todayMissions.missions.map((mission) => (
                    <div key={mission.id} className="flex items-center text-xs text-orange-700">
                      <span className="mr-2">
                        {mission.is_completed ? '✅' : '⏳'}
                      </span>
                      <span>{mission.child_name}</span>
                      <span className="ml-auto text-orange-600">
                        {mission.is_completed ? '완료됨' : '진행중'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <span className="text-green-600 text-lg mr-2">✅</span>
              <p className="text-green-700 text-sm">
                오늘 생성된 미션이 없습니다
              </p>
            </div>
          </div>
        )}

        {/* 삭제 옵션 */}
        {todayMissions.count > 0 && (
          <div className="mb-4">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={deleteToday}
                onChange={(e) => setDeleteToday(e.target.checked)}
                className="mt-1 mr-3 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <div>
                <span className="text-gray-800 font-medium">
                  오늘 생성된 미션도 함께 삭제
                </span>
                <p className="text-gray-600 text-xs mt-1">
                  체크하면 오늘 생성된 {todayMissions.count}개 미션이 모두 삭제됩니다.
                  {todayMissions.missions.some(m => m.is_completed) && 
                    ' (완료된 미션도 포함됩니다)'
                  }
                </p>
              </div>
            </label>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <span className="text-yellow-600 text-base mr-2">⚠️</span>
            <div>
              <p className="text-yellow-800 text-xs font-medium mb-1">주의사항</p>
              <ul className="text-yellow-700 text-xs space-y-1">
                <li>• 템플릿 삭제는 되돌릴 수 없습니다</li>
                <li>• 과거 미션들은 그대로 유지됩니다</li>
                {deleteToday && todayMissions.count > 0 && (
                  <li className="text-red-600 font-medium">
                    • 오늘 미션 {todayMissions.count}개가 영구 삭제됩니다
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '확인 중...' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  )
}