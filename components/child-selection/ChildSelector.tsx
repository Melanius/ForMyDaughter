'use client'

import React from 'react'
import { useChildSelection } from '@/lib/contexts/ChildSelectionContext'

/**
 * 🧒 자녀 선택 탭 컴포넌트
 * 
 * 초등학생 친화적 디자인:
 * - 큰 버튼과 터치 친화적 UI
 * - 이모지와 색상으로 시각적 구분
 * - 부드러운 애니메이션 효과
 */
export default function ChildSelector() {
  const {
    availableChildren,
    selectedChildId,
    selectChild,
    isParent,
    loading,
    error
  } = useChildSelection()

  // 자녀 계정이거나 로딩 중이면 표시하지 않음
  if (!isParent || loading || availableChildren.length <= 1) {
    return null
  }

  // 오류 상태 표시
  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-red-600 text-sm font-medium">⚠️ {error}</p>
      </div>
    )
  }

  // 자녀가 없는 경우
  if (availableChildren.length === 0) {
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-blue-600 text-sm font-medium text-center">
          👨‍👩‍👧‍👦 등록된 자녀가 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center mb-3">
        <span className="text-lg">👨‍👩‍👧‍👦</span>
        <span className="ml-2 text-sm font-medium text-gray-700">자녀 선택</span>
      </div>

      {/* 자녀 선택 탭들 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {availableChildren.map((child, index) => {
          const isSelected = selectedChildId === child.id
          const colorClass = getChildColorClass(index)
          
          return (
            <button
              key={child.id}
              onClick={() => selectChild(child.id)}
              className={`
                flex-shrink-0 relative px-4 py-3 rounded-xl font-medium text-sm
                transition-all duration-300 transform
                min-w-[120px] text-center
                ${isSelected
                  ? `${colorClass.selected} shadow-lg scale-105`
                  : `${colorClass.unselected} hover:scale-102 hover:shadow-md`
                }
              `}
              style={{
                minHeight: '60px'
              }}
            >
              {/* 선택 표시 */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-current flex items-center justify-center">
                  <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                </div>
              )}

              {/* 자녀 정보 */}
              <div className="flex flex-col items-center">
                {/* 아바타 또는 이모지 */}
                <div className="mb-1">
                  {child.avatar ? (
                    <img 
                      src={child.avatar} 
                      alt={child.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">
                      {getChildEmoji(index)}
                    </span>
                  )}
                </div>
                
                {/* 이름 */}
                <div className="leading-tight">
                  <div className="font-bold">
                    {child.nickname || child.name}
                  </div>
                  {child.nickname && (
                    <div className="text-xs opacity-75 truncate max-w-[80px]">
                      {child.name}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 현재 선택된 자녀 표시 */}
      {selectedChildId && (
        <div className="mt-3 text-xs text-center text-gray-600">
          <span className="bg-gray-100 px-2 py-1 rounded-full">
            👀 {availableChildren.find(c => c.id === selectedChildId)?.nickname || 
                 availableChildren.find(c => c.id === selectedChildId)?.name}님의 정보를 보고 있어요
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * 자녀별 고유 색상 클래스 반환
 */
function getChildColorClass(index: number) {
  const colors = [
    {
      selected: 'bg-gradient-to-br from-pink-400 to-pink-500 text-white border-2 border-pink-300',
      unselected: 'bg-pink-50 text-pink-700 border-2 border-pink-200 hover:bg-pink-100'
    },
    {
      selected: 'bg-gradient-to-br from-blue-400 to-blue-500 text-white border-2 border-blue-300',
      unselected: 'bg-blue-50 text-blue-700 border-2 border-blue-200 hover:bg-blue-100'
    },
    {
      selected: 'bg-gradient-to-br from-green-400 to-green-500 text-white border-2 border-green-300',
      unselected: 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
    },
    {
      selected: 'bg-gradient-to-br from-purple-400 to-purple-500 text-white border-2 border-purple-300',
      unselected: 'bg-purple-50 text-purple-700 border-2 border-purple-200 hover:bg-purple-100'
    },
    {
      selected: 'bg-gradient-to-br from-orange-400 to-orange-500 text-white border-2 border-orange-300',
      unselected: 'bg-orange-50 text-orange-700 border-2 border-orange-200 hover:bg-orange-100'
    }
  ]
  
  return colors[index % colors.length]
}

/**
 * 자녀별 고유 이모지 반환
 */
function getChildEmoji(index: number): string {
  const emojis = ['👧', '👦', '🧒', '👶', '🧑']
  return emojis[index % emojis.length]
}

/**
 * 🎯 컴팩트 버전 자녀 선택기 (작은 공간용)
 */
export function CompactChildSelector() {
  const {
    availableChildren,
    selectedChildId,
    selectChild,
    isParent,
    loading
  } = useChildSelection()

  if (!isParent || loading || availableChildren.length <= 1) {
    return null
  }

  const selectedChild = availableChildren.find(c => c.id === selectedChildId)

  return (
    <div className="inline-flex">
      <select
        value={selectedChildId || ''}
        onChange={(e) => selectChild(e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableChildren.map((child, index) => (
          <option key={child.id} value={child.id}>
            {getChildEmoji(index)} {child.nickname || child.name}
          </option>
        ))}
      </select>
    </div>
  )
}