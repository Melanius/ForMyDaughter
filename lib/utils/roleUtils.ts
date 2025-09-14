/**
 * 사용자 역할 유틸리티 함수들
 * 4가지 역할 시스템(father/mother/son/daughter) 지원
 */

export type UserRole = 'father' | 'mother' | 'son' | 'daughter'
export type LegacyUserRole = 'parent' | 'child' // 이전 버전 호환성

/**
 * 부모 역할인지 확인
 * @param userType - 사용자 타입
 * @returns 부모 역할 여부
 */
export const isParentRole = (userType: string | null | undefined): boolean => {
  if (!userType) return false
  
  // 새로운 4가지 역할 시스템
  if (['father', 'mother'].includes(userType)) {
    return true
  }
  
  // 이전 시스템 호환성 (DB 마이그레이션 완료 시 제거 예정)
  if (userType === 'parent') {
    console.warn('⚠️ 이전 방식 parent 발견! DB 마이그레이션 필요:', userType)
    return true
  }
  
  return false
}

/**
 * 자녀 역할인지 확인
 * @param userType - 사용자 타입  
 * @returns 자녀 역할 여부
 */
export const isChildRole = (userType: string | null | undefined): boolean => {
  if (!userType) return false
  
  // 새로운 4가지 역할 시스템
  if (['son', 'daughter'].includes(userType)) {
    return true
  }
  
  // 이전 시스템 호환성 (DB 마이그레이션 완료 시 제거 예정)
  if (userType === 'child') {
    console.warn('⚠️ 이전 방식 child 발견! DB 마이그레이션 필요:', userType)
    return true
  }
  
  return false
}

/**
 * 아버지 역할인지 확인
 * @param userType - 사용자 타입
 * @returns 아버지 역할 여부
 */
export const isFatherRole = (userType: string | null | undefined): boolean => {
  return userType === 'father'
}

/**
 * 어머니 역할인지 확인
 * @param userType - 사용자 타입
 * @returns 어머니 역할 여부
 */
export const isMotherRole = (userType: string | null | undefined): boolean => {
  return userType === 'mother'
}

/**
 * 아들 역할인지 확인
 * @param userType - 사용자 타입
 * @returns 아들 역할 여부
 */
export const isSonRole = (userType: string | null | undefined): boolean => {
  return userType === 'son'
}

/**
 * 딸 역할인지 확인
 * @param userType - 사용자 타입
 * @returns 딸 역할 여부
 */
export const isDaughterRole = (userType: string | null | undefined): boolean => {
  return userType === 'daughter'
}

/**
 * 유효한 역할인지 확인
 * @param userType - 사용자 타입
 * @returns 유효한 역할 여부
 */
export const isValidRole = (userType: string | null | undefined): boolean => {
  if (!userType) return false
  return ['father', 'mother', 'son', 'daughter'].includes(userType)
}

/**
 * 역할별 한국어 텍스트 반환
 * @param userType - 사용자 타입
 * @returns 한국어 역할명
 */
export const getRoleText = (userType: string | null | undefined): string => {
  switch (userType) {
    case 'father': return '아빠'
    case 'mother': return '엄마'  
    case 'son': return '아들'
    case 'daughter': return '딸'
    
    // 이전 시스템 호환성 (제거 예정)
    case 'parent': 
      console.warn('⚠️ 이전 방식 parent 발견! DB 마이그레이션 필요')
      return '부모'
    case 'child':
      console.warn('⚠️ 이전 방식 child 발견! DB 마이그레이션 필요')
      return '자녀'
      
    default: return '가족'
  }
}

/**
 * 역할별 이모지 반환
 * @param userType - 사용자 타입
 * @returns 역할 이모지
 */
export const getRoleEmoji = (userType: string | null | undefined): string => {
  switch (userType) {
    case 'father': return '👨'
    case 'mother': return '👩'
    case 'son': return '👦'
    case 'daughter': return '👧'
    
    // 이전 시스템 호환성 (제거 예정)
    case 'parent': return '👨‍👩‍👧‍👦'
    case 'child': return '🧒'
      
    default: return '👤'
  }
}