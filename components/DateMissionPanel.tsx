'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Gift, Plus, Edit2, Trash2 } from 'lucide-react'
import { MissionInstance } from '../lib/types/mission'
import missionService from '../lib/services/mission'

interface DateMissionPanelProps {
  selectedDate: string
  onDateChange?: () => void
}

export default function DateMissionPanel({ selectedDate, onDateChange }: DateMissionPanelProps) {
  const [missions, setMissions] = useState<MissionInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [editingMission, setEditingMission] = useState<string | null>(null)

  // 선택된 날짜의 미션 로드
  useEffect(() => {
    loadMissions()
  }, [selectedDate])

  const loadMissions = async () => {
    setLoading(true)
    try {
      let dateMissions = await missionService.getMissionsByDate(selectedDate)
      
      // 미래 날짜이고 미션이 없으면 데일리 미션 생성
      const today = new Date().toISOString().split('T')[0]
      if (selectedDate >= today && dateMissions.length === 0) {
        dateMissions = await missionService.generateDailyMissionsForDate(selectedDate)
      }
      
      setMissions(dateMissions)
    } catch (error) {
      console.error('Failed to load missions:', error)
    } finally {
      setLoading(false)
    }
  }

  // 미션 완료/미완료 토글
  const toggleMissionComplete = async (missionId: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await missionService.uncompleteMission(missionId)
      } else {
        await missionService.completeMission(missionId)
      }
      await loadMissions()
      onDateChange?.()
    } catch (error) {
      console.error('Failed to toggle mission:', error)
    }
  }

  // 미션 삭제
  const deleteMission = async (missionId: string) => {
    if (!confirm('이 미션을 삭제하시겠습니까?')) return
    
    try {
      await missionService.deleteMission(missionId)
      await loadMissions()
      onDateChange?.()
    } catch (error) {
      console.error('Failed to delete mission:', error)
    }
  }

  // 새 미션 추가 (간단한 형태)
  const addNewMission = async () => {
    const title = prompt('새 미션 제목을 입력하세요:')
    if (!title) return
    
    const rewardStr = prompt('보상 금액을 입력하세요:', '1000')
    const reward = parseInt(rewardStr || '1000')
    
    try {
      await missionService.createMission({
        templateId: null,
        date: selectedDate,
        title,
        description: '',
        reward,
        category: '기타',
        missionType: 'event',
        isCompleted: false
      })
      await loadMissions()
      onDateChange?.()
    } catch (error) {
      console.error('Failed to create mission:', error)
    }
  }

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const dateOnly = dateStr
    const todayStr = today.toISOString().split('T')[0]
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    if (dateOnly === todayStr) return '오늘'
    if (dateOnly === yesterdayStr) return '어제'
    if (dateOnly === tomorrowStr) return '내일'
    
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // 미션 타입 배지
  const getMissionTypeBadge = (missionType: string) => {
    if (missionType === 'daily') {
      return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">📅 데일리</span>
    }
    return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">⭐ 이벤트</span>
  }

  // 통계 계산
  const stats = {
    total: missions.length,
    completed: missions.filter(m => m.isCompleted).length,
    totalReward: missions.reduce((sum, m) => sum + m.reward, 0),
    earnedReward: missions.filter(m => m.isCompleted && !m.isTransferred).reduce((sum, m) => sum + m.reward, 0)
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">{formatDate(selectedDate)}</h3>
            <p className="text-sm text-gray-600">{selectedDate}</p>
          </div>
        </div>
        
      </div>

      {/* 통계 요약 */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">전체 미션</p>
            <p className="text-lg font-bold text-gray-800">{stats.total}개</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">완료 미션</p>
            <p className="text-lg font-bold text-green-600">{stats.completed}개</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">전체 보상</p>
            <p className="text-lg font-bold text-blue-600">{stats.totalReward.toLocaleString()}원</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">획득 보상</p>
            <p className="text-lg font-bold text-green-600">{stats.earnedReward.toLocaleString()}원</p>
          </div>
        </div>
      </div>

      {/* 미션 목록 */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-gray-600">미션을 불러오는 중...</p>
          </div>
        ) : missions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>이 날짜에는 미션이 없습니다.</p>
            <p className="text-sm mt-1">새 미션을 추가해보세요!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {missions.map((mission) => (
              <div
                key={mission.id}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  mission.isCompleted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* 완료 체크박스 */}
                    <button
                      onClick={() => toggleMissionComplete(mission.id, mission.isCompleted)}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        mission.isCompleted
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {mission.isCompleted && <span className="text-xs">✓</span>}
                    </button>
                    
                    {/* 미션 정보 */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className={`font-medium ${
                          mission.isCompleted ? 'line-through text-gray-600' : 'text-gray-800'
                        }`}>
                          {mission.title}
                        </h4>
                        {getMissionTypeBadge(mission.missionType)}
                      </div>
                      
                      {mission.description && (
                        <p className="text-sm text-gray-600 mb-2">{mission.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1 text-green-600">
                          <Gift className="w-4 h-4" />
                          <span>{mission.reward.toLocaleString()}원</span>
                        </div>
                        
                        {mission.completedAt && (
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(mission.completedAt).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} 완료</span>
                          </div>
                        )}
                        
                        {mission.isTransferred && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                            전달 완료
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div className="flex space-x-1 ml-4">
                    <button
                      onClick={() => deleteMission(mission.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="미션 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}