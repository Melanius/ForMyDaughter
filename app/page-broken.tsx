'use client'

import { useState, useEffect } from 'react'

interface Mission {
  id: string
  title: string
  description?: string
  reward: number
  isCompleted: boolean
  completedAt?: string
}

export default function HomePage() {
  const [missions, setMissions] = useState<Mission[]>([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentAllowance, setCurrentAllowance] = useState(7500)

  // 클라이언트에서만 미션 데이터 로드
  useEffect(() => {
    const initialMissions: Mission[] = [
      {
        id: '1',
        title: '방 청소하기',
        description: '침실 정리정돈하고 먼지 털기',
        reward: 1000,
        isCompleted: false
      },
      {
        id: '2', 
        title: '숙제 완료하기',
        description: '오늘 낸 숙제 모두 끝내기',
        reward: 1500,
        isCompleted: true,
        completedAt: new Date().toISOString()
      }
    ]
    
    setMissions(initialMissions)
    setLoading(false)
    console.log('미션 데이터 로드됨:', initialMissions)
  }, [])

  const handleMissionComplete = (missionId: string) => {
    setMissions(prev =>
      prev.map(mission =>
        mission.id === missionId
          ? { ...mission, isCompleted: true, completedAt: new Date().toISOString() }
          : mission
      )
    )
    
    const mission = missions.find(m => m.id === missionId)
    if (mission) {
      setCurrentAllowance(prev => prev + mission.reward)
    }
  }

  const handleAddMission = (missionData: { title: string; description: string; reward: number }) => {
    const newMission: Mission = {
      id: Date.now().toString(),
      ...missionData,
      isCompleted: false
    }
    setMissions(prev => [newMission, ...prev])
    setIsAddModalOpen(false)
  }

  const handleEditMission = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission) {
      setEditingMission(mission)
      setIsEditModalOpen(true)
    }
  }

  const handleUpdateMission = (missionData: { title: string; description: string; reward: number }) => {
    if (!editingMission) return
    
    setMissions(prev =>
      prev.map(mission =>
        mission.id === editingMission.id
          ? { ...mission, ...missionData }
          : mission
      )
    )
    setIsEditModalOpen(false)
    setEditingMission(null)
  }

  const handleDeleteMission = (missionId: string) => {
    if (confirm('정말로 이 미션을 삭제하시겠습니까?')) {
      setMissions(prev => prev.filter(mission => mission.id !== missionId))
    }
  }

  const handleUndoComplete = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId)
    if (mission && mission.isCompleted) {
      setMissions(prev =>
        prev.map(mission =>
          mission.id === missionId
            ? { ...mission, isCompleted: false, completedAt: undefined }
            : mission
        )
      )
      
      // 용돈에서 보상 차감
      setCurrentAllowance(prev => prev - mission.reward)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold text-center text-gray-800 mb-4">
          🌟 우리 아이 용돈 관리 🌟
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          미션을 완료하고 용돈을 모으는 재미있는 여행을 시작해요!
        </p>
        
        {/* 오늘의 미션 섹션 */}
        <div className="mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📋 오늘의 미션</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + 미션 추가
              </button>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">⏳</div>
                  <p className="text-gray-600">미션을 불러오는 중...</p>
                </div>
              ) : (
                <>
                  {/* 미션 개수 표시 (디버깅용) */}
                  <p className="text-sm text-gray-400">현재 미션 개수: {missions.length}</p>
                  
                  {missions.map(mission => (
                    <div key={mission.id} className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                      mission.isCompleted 
                        ? 'bg-green-50 border-green-200' 
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
                            {mission.isCompleted && <span className="text-2xl">✅</span>}
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
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {!mission.isCompleted ? (
                            <>
                              <button
                                onClick={() => handleMissionComplete(mission.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                              >
                                완료
                              </button>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditMission(mission.id)}
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
                              </div>
                            </>
                          ) : (
                            <button
                              onClick={() => handleUndoComplete(mission.id)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {missions.length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🎯</div>
                      <p className="text-gray-600 mb-4">아직 미션이 없어요</p>
                      <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
                      >
                        첫 번째 미션 만들기
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">대시보드</h3>
            <p className="text-gray-600">오늘의 미션과 현재 용돈을 확인해요</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">미션 달력</h3>
            <p className="text-gray-600">달력에서 미션을 확인하고 완료해요</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">용돈 기입장</h3>
            <p className="text-gray-600">용돈 내역을 확인하고 기록해요</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">현재 상황</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold text-blue-600">15</p>
              <p className="text-gray-600">완료한 미션</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{currentAllowance.toLocaleString()}원</p>
              <p className="text-gray-600">현재 용돈</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">5일</p>
              <p className="text-gray-600">연속 완료</p>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <p className="text-gray-500">🎉 웹앱이 성공적으로 실행되었습니다! 🎉</p>
        </div>
      </div>
      
      {/* 미션 추가 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">새 미션 추가</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleAddMission({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                reward: Number(formData.get('reward'))
              })
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  미션 제목 *
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="예: 방 청소하기"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상세 설명
                </label>
                <textarea
                  name="description"
                  placeholder="미션에 대한 자세한 설명을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  보상 금액
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="reward"
                    defaultValue="500"
                    min="100"
                    step="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">원</span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  미션 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 미션 수정 모달 */}
      {isEditModalOpen && editingMission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">미션 수정</h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false)
                  setEditingMission(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleUpdateMission({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                reward: Number(formData.get('reward'))
              })
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  미션 제목 *
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingMission.title}
                  placeholder="예: 방 청소하기"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상세 설명
                </label>
                <textarea
                  name="description"
                  defaultValue={editingMission.description}
                  placeholder="미션에 대한 자세한 설명을 입력해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  보상 금액
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="reward"
                    defaultValue={editingMission.reward}
                    min="100"
                    step="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">원</span>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false)
                    setEditingMission(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  수정 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}