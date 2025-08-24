'use client'

import { motion } from 'framer-motion'
import { Star, Coins, Calendar, Trophy } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Navigation from '@/components/ui/Navigation'

export default function DashboardPage() {
  const todaysMissions = [
    { id: 1, title: '오늘 방청소는 완료했나요?', completed: false, reward: 500 },
    { id: 2, title: '숙제를 모두 끝냈나요?', completed: true, reward: 500 },
    { id: 3, title: '양치질을 2번 했나요?', completed: false, reward: 500 },
  ]

  const completedCount = todaysMissions.filter(m => m.completed).length
  const totalReward = completedCount * 500

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl font-bold mb-2">안녕하세요! 👋</h1>
          <p className="text-primary-100">오늘도 미션을 완료해볼까요?</p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Today's Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-accent/10 to-success/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">오늘의 진행률</h3>
                <p className="text-2xl font-bold text-primary">{completedCount}/{todaysMissions.length}</p>
                <p className="text-sm text-gray-600">획득 용돈: {totalReward.toLocaleString()}원</p>
              </div>
              <div className="relative">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none" stroke="#e5e7eb" strokeWidth="4"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none" stroke="#FF6B9D" strokeWidth="4"
                    strokeDasharray={`${(completedCount / todaysMissions.length) * 175.9} 175.9`}
                    className="transition-all duration-500"
                  />
                </svg>
                <Trophy className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary" size={24} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Current Allowance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-secondary/10 to-primary/10">
            <div className="flex items-center gap-4">
              <div className="bg-secondary/20 p-3 rounded-full">
                <Coins className="text-secondary" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">현재 용돈</h3>
                <p className="text-3xl font-bold text-secondary">7,500원</p>
                <p className="text-sm text-gray-600">오늘 +{totalReward.toLocaleString()}원</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Today's Missions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="text-accent" size={24} />
            오늘의 미션
          </h2>
          
          <div className="space-y-3">
            {todaysMissions.map((mission, index) => (
              <motion.div
                key={mission.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + (index * 0.1) }}
              >
                <Card className={`${mission.completed ? 'bg-gradient-to-r from-success/20 to-accent/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        mission.completed 
                          ? 'bg-success border-success text-white' 
                          : 'border-gray-300'
                      }`}>
                        {mission.completed && <span className="text-xs">✓</span>}
                      </div>
                      <div>
                        <p className={`font-medium ${mission.completed ? 'text-success line-through' : 'text-gray-800'}`}>
                          {mission.title}
                        </p>
                        <p className="text-sm text-gray-600">+{mission.reward.toLocaleString()}원</p>
                      </div>
                    </div>
                    
                    {!mission.completed && (
                      <Button size="sm" variant="primary">
                        완료하기
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Button variant="secondary" className="py-4">
              <Calendar size={20} />
              달력 보기
            </Button>
            <Button variant="warning" className="py-4">
              <Coins size={20} />
              용돈 기입장
            </Button>
          </div>
        </motion.div>
      </div>

      <Navigation />
    </div>
  )
}