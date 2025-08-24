'use client'

import { motion } from 'framer-motion'
import { Coins, Plus, Minus, TrendingUp, Gift, Coffee, Book, Gamepad2 } from 'lucide-react'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Navigation from '@/components/ui/Navigation'

export default function AllowancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')

  const categories = [
    { icon: Coffee, label: '간식', color: 'bg-orange-100 text-orange-600' },
    { icon: Book, label: '책', color: 'bg-blue-100 text-blue-600' },
    { icon: Gamepad2, label: '게임', color: 'bg-purple-100 text-purple-600' },
    { icon: Gift, label: '선물', color: 'bg-pink-100 text-pink-600' },
  ]

  const recentEntries = [
    { id: 1, type: 'EARNED', amount: 1500, description: '오늘 미션 완료', date: '2024-08-22', category: '미션' },
    { id: 2, type: 'SPENT', amount: 2000, description: '과자 구매', date: '2024-08-21', category: '간식' },
    { id: 3, type: 'EARNED', amount: 1000, description: '어제 미션 완료', date: '2024-08-21', category: '미션' },
    { id: 4, type: 'SPENT', amount: 3000, description: '새 책 구매', date: '2024-08-20', category: '책' },
    { id: 5, type: 'EARNED', amount: 500, description: '숙제 완료', date: '2024-08-20', category: '미션' },
  ]

  const totalBalance = 7500
  const monthlyEarned = 8500
  const monthlySpent = 5000

  const handleAddEntry = () => {
    // TODO: Add API call to save entry
    console.log({ amount, description, category })
    setIsModalOpen(false)
    setAmount('')
    setDescription('')
    setCategory('')
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent to-secondary text-white p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Coins size={28} />
            용돈 기입장
          </h1>
          <p className="text-white/90">용돈 내역을 확인하고 기록해요</p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Balance Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-800 mb-2">현재 용돈</h2>
              <p className="text-4xl font-bold text-primary mb-4">
                {totalBalance.toLocaleString()}원
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-success/10 rounded-lg p-3">
                  <p className="text-success font-semibold">이번 달 수입</p>
                  <p className="text-lg font-bold text-success">+{monthlyEarned.toLocaleString()}원</p>
                </div>
                <div className="bg-warning/10 rounded-lg p-3">
                  <p className="text-warning font-semibold">이번 달 지출</p>
                  <p className="text-lg font-bold text-warning">-{monthlySpent.toLocaleString()}원</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              이번 달 통계
            </h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              {categories.map((cat, index) => {
                const Icon = cat.icon
                const spent = [500, 3000, 0, 1500][index] // Sample data
                return (
                  <div key={cat.label} className={`${cat.color} rounded-lg p-3`}>
                    <Icon size={20} className="mx-auto mb-1" />
                    <p className="text-xs font-medium">{cat.label}</p>
                    <p className="text-sm font-bold">{spent.toLocaleString()}원</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>

        {/* Add Entry Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button variant="primary" className="w-full py-4" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            용돈 사용 기록하기
          </Button>
        </motion.div>

        {/* Recent Entries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4">최근 내역</h3>
          <div className="space-y-3">
            {recentEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + (index * 0.1) }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        entry.type === 'EARNED' ? 'bg-success/20' : 'bg-warning/20'
                      }`}>
                        {entry.type === 'EARNED' ? (
                          <Plus className="text-success" size={20} />
                        ) : (
                          <Minus className="text-warning" size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{entry.description}</p>
                        <p className="text-sm text-gray-600">{entry.date} • {entry.category}</p>
                      </div>
                    </div>
                    <p className={`font-bold text-lg ${
                      entry.type === 'EARNED' ? 'text-success' : 'text-warning'
                    }`}>
                      {entry.type === 'EARNED' ? '+' : '-'}{entry.amount.toLocaleString()}원
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Add Entry Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="용돈 사용 기록">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">금액</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="얼마를 사용했나요?"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="무엇을 샀나요?"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.label}
                    onClick={() => setCategory(cat.label)}
                    className={`p-3 rounded-lg border transition-all ${
                      category === cat.label 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={20} className="mx-auto mb-1" />
                    <p className="text-sm font-medium">{cat.label}</p>
                  </button>
                )
              })}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              취소
            </Button>
            <Button variant="primary" onClick={handleAddEntry} className="flex-1">
              저장
            </Button>
          </div>
        </div>
      </Modal>

      <Navigation />
    </div>
  )
}