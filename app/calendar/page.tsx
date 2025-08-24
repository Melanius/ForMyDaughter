'use client'

import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Navigation from '@/components/ui/Navigation'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토']
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  
  // Get calendar data
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Sample mission completion data
  const completedDates = [5, 6, 7, 10, 12, 15, 18, 20, 22]
  const today = new Date().getDate()
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  const renderCalendarDays = () => {
    const days = []
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isCompleted = completedDates.includes(day)
      const isToday = day === today && month === new Date().getMonth()
      const isFuture = day > today && month === new Date().getMonth()
      
      days.push(
        <motion.div
          key={day}
          className={`relative h-12 w-12 mx-auto flex items-center justify-center rounded-lg cursor-pointer transition-all ${
            isToday 
              ? 'bg-primary text-white font-bold ring-2 ring-primary/50' 
              : isCompleted
              ? 'bg-success text-white'
              : isFuture
              ? 'bg-gray-100 text-gray-400'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-200'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-sm font-medium">{day}</span>
          {isCompleted && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
              <span className="text-xs text-white">⭐</span>
            </div>
          )}
        </motion.div>
      )
    }
    
    return days
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-secondary to-primary text-white p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <CalendarIcon size={28} />
            미션 달력
          </h1>
          <p className="text-white/90">달력에서 미션 완료 현황을 확인해요</p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Calendar Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Button variant="secondary" size="sm" onClick={prevMonth}>
                <ChevronLeft size={16} />
              </Button>
              
              <h2 className="text-xl font-bold text-gray-800">
                {year}년 {monthNames[month]}
              </h2>
              
              <Button variant="secondary" size="sm" onClick={nextMonth}>
                <ChevronRight size={16} />
              </Button>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {daysOfWeek.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {renderCalendarDays()}
            </div>
          </Card>
        </motion.div>

        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-r from-accent/10 to-success/10">
            <h3 className="text-lg font-bold text-gray-800 mb-3">오늘의 미션 현황</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-success">2</p>
                <p className="text-sm text-gray-600">완료</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">1</p>
                <p className="text-sm text-gray-600">남은 미션</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">1,000원</p>
                <p className="text-sm text-gray-600">오늘 획득</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Mission Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-3">범례</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span className="text-sm text-gray-600">오늘</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-success rounded relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">⭐</span>
                  </div>
                </div>
                <span className="text-sm text-gray-600">미션 완료</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-gray-100 rounded"></div>
                <span className="text-sm text-gray-600">예정된 날</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Add Mission Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button variant="primary" className="w-full py-4">
            <Plus size={20} />
            새 미션 추가하기
          </Button>
        </motion.div>
      </div>

      <Navigation />
    </div>
  )
}