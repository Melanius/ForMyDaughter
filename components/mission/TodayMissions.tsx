export function TodayMissions() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">📋 오늘의 미션</h2>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          + 미션 추가
        </button>
      </div>
      
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎯</div>
        <p className="text-gray-600 mb-4">아직 미션이 없어요</p>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors">
          첫 번째 미션 만들기
        </button>
      </div>
    </div>
  )
}