'use client'

import { useState, useEffect } from 'react'
import { AddMissionModal } from '../components/mission/AddMissionModal'
import { TemplateManager } from '../components/mission/TemplateManager'
import MonthlyCalendar from '../components/MonthlyCalendar'
import DateMissionPanel from '../components/DateMissionPanel'
import { MissionInstance } from '../lib/types/mission'
import MigrationService from '../lib/services/migration'
import missionService from '../lib/services/mission'
import allowanceService from '../lib/services/allowance'

// 기존 Mission 인터페이스 유지 (하위 호환성)
interface Mission {
  id: string
  title: string
  description?: string
  reward: number
  isCompleted: boolean
  completedAt?: string
  isTransferred?: boolean
  category?: string
  missionType?: string
}

export default function HomePage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAllowance, setCurrentAllowance] = useState(7500)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [showCalendar, setShowCalendar] = useState(false)
  const [activeTab, setActiveTab] = useState<'missions' | 'templates'>('missions')

  useEffect(() => {
    const initializeData = async () => {
      try {
        // 1. 마이그레이션 확인 및 실행
        if (await MigrationService.needsMigration()) {
          console.log('🔄 Starting migration from localStorage to IndexedDB...')
          const migrationSuccess = await MigrationService.migrateData()
          
          if (migrationSuccess) {
            console.log('✅ Migration completed successfully')
          } else {
            console.error('❌ Migration failed, falling back to localStorage')
          }
        }

        // 2. 기본 템플릿 확인 및 생성
        if (MigrationService.isMigrationCompleted()) {
          await missionService.ensureTemplatesExist()
        }

        // 3. 선택된 날짜의 미션 로드
        let dateMissions: MissionInstance[] = []
        const today = new Date().toISOString().split('T')[0]

        if (MigrationService.isMigrationCompleted()) {
          // 새로운 데이터베이스에서 로드
          dateMissions = await missionService.getMissionsByDate(selectedDate)
          
          // 미전 날짜이고 미션이 없으면 데일리 미션 자동 생성
          if (selectedDate >= today && dateMissions.length === 0) {
            console.log(`📅 No missions found for ${selectedDate}, generating daily missions...`)
            dateMissions = await missionService.generateDailyMissionsForDate(selectedDate)
          }
        } else {
          // 기존 localStorage 방식 사용 (폴백)
          console.log('📦 Using localStorage fallback')
          const savedMissions = localStorage.getItem('missions')
          
          if (savedMissions) {
            const parsedMissions = JSON.parse(savedMissions)
            // 기존 미션들은 오늘 날짜만 보여줌 (localStorage는 날짜 구분 없음)
            if (selectedDate === today) {
              dateMissions = parsedMissions.map((mission: Mission) => ({
                ...mission,
                date: selectedDate,
                templateId: null,
                missionType: mission.missionType === '이벤트' ? 'event' : 'daily',
                category: mission.category || '기타'
              }))
            }
          } else if (selectedDate === today) {
            // 기본 미션 생성
            const initialMissions: MissionInstance[] = [
              {
                id: '1',
                templateId: null,
                date: selectedDate,
                title: '방 청소하기',
                description: '침실 정리정돈하고 먼지 털기',
                reward: 1000,
                isCompleted: false,
                category: '집안일',
                missionType: 'daily'
              },
              {
                id: '2', 
                templateId: null,
                date: selectedDate,
                title: '숙제 완료하기',
                description: '오늘 낸 숙제 모두 끝내기',
                reward: 1500,
                isCompleted: false,
                category: '공부',
                missionType: 'daily'
              }
            ]
            dateMissions = initialMissions
            localStorage.setItem('missions', JSON.stringify(initialMissions))
          }
        }

        // 4. Mission 형태로 변환 (기존 UI 호환성을 위해)
        const compatibleMissions: Mission[] = dateMissions.map(instance => ({
          id: instance.id,
          title: instance.title,
          description: instance.description,
          reward: instance.reward,
          isCompleted: instance.isCompleted,
          completedAt: instance.completedAt,
          isTransferred: instance.isTransferred,
          category: instance.category,
          missionType: instance.missionType === 'daily' ? '데일리' : '이벤트'
        }))

        setMissions(compatibleMissions)

        // 5. 용돈 정보 로드 - 용돈 서비스에서 현재 잔액 가져오기
        try {
          const currentBalance = await allowanceService.getCurrentBalance()
          setCurrentAllowance(currentBalance)
          // localStorage와 동기화
          localStorage.setItem('currentAllowance', currentBalance.toString())
        } catch (error) {
          console.error('Failed to load current balance:', error)
          // 에러 시 기존 localStorage 값 사용
          const savedAllowance = localStorage.getItem('currentAllowance')
          if (savedAllowance) {
            setCurrentAllowance(parseInt(savedAllowance))
          } else {
            setCurrentAllowance(7500)
            localStorage.setItem('currentAllowance', '7500')
          }
        }

      } catch (error) {
        console.error('Failed to initialize data:', error)
        // 에러 발생 시 기본값으로 설정
        setMissions([])
        setCurrentAllowance(7500)
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [selectedDate])

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('missions', JSON.stringify(missions))
    }
  }, [missions, loading])

  useEffect(() => {
    if (!loading) {
      localStorage.setItem('currentAllowance', currentAllowance.toString())
    }
  }, [currentAllowance, loading])

  const handleMissionComplete = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission && !mission.isCompleted) {
      try {
        if (MigrationService.isMigrationCompleted()) {
          // 새로운 데이터베이스 사용
          await missionService.completeMission(missionId)
        }
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(mission =>
            mission.id === missionId
              ? { ...mission, isCompleted: true, completedAt: new Date().toISOString() }
              : mission
          )
        )
      } catch (error) {
        console.error('Failed to complete mission:', error)
      }
    }
  }

  const handleUndoComplete = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission && mission.isCompleted && !mission.isTransferred) {
      try {
        if (MigrationService.isMigrationCompleted()) {
          // 새로운 데이터베이스 사용
          await missionService.uncompleteMission(missionId)
          
          // 미션과 연결된 용돈 수입 내역 삭제
          await allowanceService.removeMissionIncome(missionId)
        }
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(mission =>
            mission.id === missionId
              ? { ...mission, isCompleted: false, completedAt: undefined }
              : mission
          )
        )
      } catch (error) {
        console.error('Failed to uncomplete mission:', error)
      }
    }
  }

  const handleDeleteMission = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission?.isTransferred) return
    
    if (confirm('정말로 이 미션을 삭제하시겠습니까?')) {
      try {
        if (MigrationService.isMigrationCompleted()) {
          // 새로운 데이터베이스 사용
          await missionService.deleteMission(missionId)
        }
        
        // UI 상태 업데이트
        setMissions(prev => prev.filter(mission => mission.id !== missionId))
      } catch (error) {
        console.error('Failed to delete mission:', error)
      }
    }
  }

  const handleEditMission = (mission: Mission) => {
    if (mission.isTransferred) return
    setEditingMission(mission)
    setShowAddModal(true)
  }

  const handleAddMission = async (newMission: { title: string; description: string; reward: number; category?: string; missionType?: string; date?: string }) => {
    try {      
      if (editingMission) {
        // 미션 수정
        if (MigrationService.isMigrationCompleted()) {
          await missionService.updateMission(editingMission.id, {
            title: newMission.title,
            description: newMission.description,
            reward: newMission.reward,
            category: newMission.category,
            missionType: newMission.missionType === '이벤트' ? 'event' : 'daily'
          })
        }
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(mission =>
            mission.id === editingMission.id
              ? { 
                  ...mission, 
                  title: newMission.title, 
                  description: newMission.description, 
                  reward: newMission.reward,
                  category: newMission.category,
                  missionType: newMission.missionType
                }
              : mission
          )
        )
        setEditingMission(null)
      } else {
        // 새 미션 추가
        let missionId: string
        
        if (MigrationService.isMigrationCompleted()) {
          // 새로운 데이터베이스 사용
          const createdId = await missionService.createMission({
            templateId: null, // 일회성 미션
            date: newMission.date || selectedDate,
            title: newMission.title,
            description: newMission.description,
            reward: newMission.reward,
            category: newMission.category || '기타',
            missionType: newMission.missionType === '이벤트' ? 'event' : 'daily',
            isCompleted: false
          })
          missionId = createdId || Date.now().toString()
        } else {
          missionId = Date.now().toString()
        }

        // UI 상태 업데이트
        const mission: Mission = {
          id: missionId,
          title: newMission.title,
          description: newMission.description,
          reward: newMission.reward,
          category: newMission.category,
          missionType: newMission.missionType,
          isCompleted: false
        }
        setMissions(prev => [...prev, mission])
      }
      
      setShowAddModal(false)
    } catch (error) {
      console.error('Failed to add/edit mission:', error)
      setShowAddModal(false)
    }
  }

  const handleCloseModal = () => {
    setShowAddModal(false)
    setEditingMission(null)
  }

  const handleUndoTransfer = async (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission && mission.isTransferred) {
      try {
        if (MigrationService.isMigrationCompleted()) {
          // 새로운 데이터베이스 사용
          await missionService.undoTransfer(missionId)
        }

        // 현재 용돈에서 미션 보상 차감
        setCurrentAllowance(prev => prev - mission.reward)
        
        // UI 상태 업데이트
        setMissions(prev =>
          prev.map(m =>
            m.id === missionId
              ? { ...m, isTransferred: false }
              : m
          )
        )
      } catch (error) {
        console.error('Failed to undo transfer:', error)
      }
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center text-gray-800 mb-4">
          우리 아이 용돈 관리
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          미션을 완료하고 용돈을 모으는 재미있는 여행을 시작해요!
        </p>
        
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* 탭 네비게이션 */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('missions')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'missions'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📅 미션 관리
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'templates'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🔧 템플릿 관리
              </button>
            </div>

            {activeTab === 'missions' ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {selectedDate === new Date().toISOString().split('T')[0] ? '오늘의 미션' : 
                       `${new Date(selectedDate).getMonth() + 1}월 ${new Date(selectedDate).getDate()}일 미션`}
                    </h2>
                    <span className="text-sm text-gray-500">{selectedDate}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      {showCalendar ? '목록 보기' : '달력 보기'}
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      미션 추가
                    </button>
                  </div>
                </div>
            
            {showCalendar ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyCalendar 
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                />
                <DateMissionPanel 
                  selectedDate={selectedDate}
                  onDateChange={() => {
                    // 날짜 변경 시 미션 목록 새로고침
                    const initializeData = async () => {
                      setLoading(true)
                      try {
                        let dateMissions: MissionInstance[] = []
                        if (MigrationService.isMigrationCompleted()) {
                          dateMissions = await missionService.getMissionsByDate(selectedDate)
                          const today = new Date().toISOString().split('T')[0]
                          if (selectedDate >= today && dateMissions.length === 0) {
                            dateMissions = await missionService.generateDailyMissionsForDate(selectedDate)
                          }
                        }
                        const compatibleMissions: Mission[] = dateMissions.map(instance => ({
                          id: instance.id,
                          title: instance.title,
                          description: instance.description,
                          reward: instance.reward,
                          isCompleted: instance.isCompleted,
                          completedAt: instance.completedAt,
                          isTransferred: instance.isTransferred,
                          category: instance.category,
                          missionType: instance.missionType === 'daily' ? '데일리' : '이벤트'
                        }))
                        setMissions(compatibleMissions)
                      } catch (error) {
                        console.error('Failed to refresh missions:', error)
                      } finally {
                        setLoading(false)
                      }
                    }
                    initializeData()
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">미션을 불러오는 중...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">현재 미션 개수: {missions.length}</p>
                  
                  {missions.map(mission => (
                    <div key={mission.id} className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      mission.isCompleted 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className={`text-lg font-semibold ${
                              mission.isCompleted ? 'text-green-800 line-through' : 'text-gray-800'
                            }`}>
                              {mission.title}
                            </h3>
                            {mission.missionType && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                mission.missionType === '데일리' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {mission.missionType === '데일리' ? '📅 데일리' : '⭐ 이벤트'}
                              </span>
                            )}
                            {mission.category && (
                              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                {mission.category}
                              </span>
                            )}
                            {mission.isCompleted && <span className="text-2xl">✅</span>}
                          </div>
                          {mission.description && (
                            <p className="text-gray-600 text-sm mb-3">{mission.description}</p>
                          )}
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-green-600">{mission.reward.toLocaleString()}원</span>
                            <span className="text-xs text-gray-500">
                              {mission.isCompleted ? '완료됨' : '미완료'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {!mission.isCompleted ? (
                            <>
                              <button
                                onClick={() => handleMissionComplete(mission.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                              >
                                완료
                              </button>
                              <button
                                onClick={() => handleEditMission(mission)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors text-xs"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteMission(mission.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors text-xs"
                              >
                                삭제
                              </button>
                            </>
                          ) : mission.isTransferred ? (
                            <div className="text-center">
                              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded mb-2">전달 완료</div>
                              <button
                                onClick={() => handleUndoTransfer(mission.id)}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors text-xs"
                              >
                                되돌리기
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleUndoComplete(mission.id)}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleEditMission(mission)}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors text-xs"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => handleDeleteMission(mission.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors text-xs"
                              >
                                삭제
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    ))}
                  </>
                )}
              </div>
              </div>
            ) : (
              <TemplateManager />
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8 text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">현재 상황</h2>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-3xl font-bold text-green-600">{currentAllowance.toLocaleString()}원</p>
              <p className="text-gray-600">현재 용돈</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600">{missions.filter(m => m.isCompleted && !m.isTransferred).reduce((sum, m) => sum + m.reward, 0).toLocaleString()}원</p>
              <p className="text-gray-600">받을 용돈</p>
            </div>
          </div>
          {missions.filter(m => m.isCompleted && !m.isTransferred).length > 0 && (
            <button
              onClick={async () => {
                try {
                  const pendingMissions = missions.filter(m => m.isCompleted && !m.isTransferred)
                  const pendingReward = pendingMissions.reduce((sum, m) => sum + m.reward, 0)
                  const today = new Date().toISOString().split('T')[0]
                  
                  if (MigrationService.isMigrationCompleted()) {
                    // 새로운 데이터베이스 사용
                    const missionIds = pendingMissions.map(m => m.id)
                    await missionService.transferMissions(missionIds)
                    
                    // 각 미션에 대해 용돈 내역에 수입 추가
                    for (const mission of pendingMissions) {
                      await allowanceService.addMissionIncome(
                        mission.id, 
                        mission.reward, 
                        mission.title, 
                        today
                      )
                    }
                  }

                  // UI 상태 업데이트 - 용돈 서비스에서 현재 잔액 다시 가져오기
                  const updatedBalance = await allowanceService.getCurrentBalance()
                  setCurrentAllowance(updatedBalance)
                  localStorage.setItem('currentAllowance', updatedBalance.toString())
                  
                  setMissions(prev => prev.map(m => 
                    m.isCompleted && !m.isTransferred 
                      ? { ...m, isTransferred: true }
                      : m
                  ))
                } catch (error) {
                  console.error('Failed to transfer missions:', error)
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              용돈 전달 완료
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">이번 주 목표</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">완료한 미션</span>
                <span className="font-semibold">{missions.filter(m => m.isCompleted).length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">남은 미션</span>
                <span className="font-semibold">{missions.filter(m => !m.isCompleted).length}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">이번 주 획득 용돈</span>
                <span className="font-semibold text-green-600">
                  {missions.filter(m => m.isCompleted).reduce((sum, m) => sum + m.reward, 0).toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">달력</h3>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{new Date().getDate()}</p>
              <p className="text-gray-600">{new Date().toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })}</p>
              <p className="text-sm text-gray-500 mt-2">
                {new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-500">웹앱이 성공적으로 실행되었습니다!</p>
        </div>
      </div>
      
      {showAddModal && (
        <AddMissionModal
          onClose={handleCloseModal}
          onAdd={handleAddMission}
          editingMission={editingMission}
          defaultDate={selectedDate}
        />
      )}
    </div>
  )
}