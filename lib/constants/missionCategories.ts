/**
 * 🎯 미션 카테고리 상수 정의
 * 
 * 부모 미션 생성과 자녀 미션 제안에서 공통으로 사용되는 
 * 카테고리 목록과 스타일링 정보를 관리합니다.
 */

export interface MissionCategory {
  value: string
  label: string
  icon: string
  color: string
  description: string
}

/**
 * 미션 카테고리 목록
 */
export const MISSION_CATEGORIES: MissionCategory[] = [
  {
    value: '집안일',
    label: '집안일',
    icon: '🏠',
    color: 'bg-green-100 text-green-700 border-green-200',
    description: '방 정리, 설거지, 청소 등'
  },
  {
    value: '공부',
    label: '공부',
    icon: '📚',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    description: '숙제, 복습, 문제집 풀기 등'
  },
  {
    value: '운동',
    label: '운동',
    icon: '⚽',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: '조깅, 줄넘기, 스포츠 등'
  },
  {
    value: '독서',
    label: '독서',
    icon: '📖',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    description: '책 읽기, 독서록 쓰기 등'
  },
  {
    value: '건강',
    label: '건강',
    icon: '💪',
    color: 'bg-red-100 text-red-700 border-red-200',
    description: '일찍 자기, 물 마시기 등'
  },
  {
    value: '예의',
    label: '예의',
    icon: '🙏',
    color: 'bg-pink-100 text-pink-700 border-pink-200',
    description: '인사하기, 고마움 표현하기 등'
  },
  {
    value: '기타',
    label: '기타',
    icon: '📝',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    description: '기타 다양한 활동들'
  }
]

/**
 * 카테고리 값으로 카테고리 정보 조회
 */
export const getMissionCategory = (value: string): MissionCategory | undefined => {
  return MISSION_CATEGORIES.find(category => category.value === value)
}

/**
 * 카테고리 아이콘 조회
 */
export const getCategoryIcon = (category: string): string => {
  const categoryInfo = getMissionCategory(category)
  return categoryInfo?.icon || '📝'
}

/**
 * 카테고리 스타일 조회
 */
export const getCategoryStyle = (category: string): string => {
  const categoryInfo = getMissionCategory(category)
  return categoryInfo?.color || 'bg-gray-100 text-gray-700 border-gray-200'
}

/**
 * 카테고리 목록 (값만)
 */
export const CATEGORY_VALUES = MISSION_CATEGORIES.map(cat => cat.value)

/**
 * 기본 카테고리
 */
export const DEFAULT_CATEGORY = '집안일'