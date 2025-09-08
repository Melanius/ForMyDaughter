/**
 * 🔐 입력 검증 유틸리티
 * 보안을 위한 데이터 검증 함수들
 */

// 이메일 검증
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 금액 검증 (양수, 최대값 제한)
export function isValidAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > 0 && amount <= 1000000
}

// 문자열 길이 검증
export function isValidLength(str: string, min: number = 1, max: number = 255): boolean {
  return typeof str === 'string' && str.length >= min && str.length <= max
}

// 사용자 이름 검증 (한글, 영문, 숫자, 공백 허용)
export function isValidName(name: string): boolean {
  if (!isValidLength(name, 1, 50)) return false
  const nameRegex = /^[가-힣a-zA-Z0-9\s]+$/
  return nameRegex.test(name)
}

// 카테고리 검증
export function isValidCategory(category: string, validCategories: string[]): boolean {
  return validCategories.includes(category)
}

// 날짜 형식 검증 (YYYY-MM-DD)
export function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0] === dateStr
}

// 사용자 타입 검증
export function isValidUserType(userType: string): userType is 'parent' | 'child' {
  return userType === 'parent' || userType === 'child'
}

// SQL 인젝션 방지를 위한 기본 검증
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return ''
  
  // 위험한 문자들 제거
  return str
    .replace(/[<>]/g, '') // HTML 태그 방지
    .replace(/['";]/g, '') // SQL 인젝션 기본 방지
    .trim()
}

// 환경변수 검증
export function validateEnvVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`환경변수 ${name}이 설정되지 않았습니다.`)
  }
  return value.trim()
}

// 객체 필수 필드 검증
export function validateRequiredFields<T extends Record<string, unknown>>(
  obj: T, 
  requiredFields: (keyof T)[]
): void {
  for (const field of requiredFields) {
    if (obj[field] == null || obj[field] === '') {
      throw new Error(`필수 필드 '${String(field)}'가 누락되었습니다.`)
    }
  }
}

// 숫자 범위 검증
export function isInRange(num: number, min: number, max: number): boolean {
  return Number.isFinite(num) && num >= min && num <= max
}

// 파일 크기 검증 (바이트 단위)
export function isValidFileSize(size: number, maxSize: number = 5 * 1024 * 1024): boolean {
  return Number.isFinite(size) && size > 0 && size <= maxSize
}

// 미션 제목 검증
export function isValidMissionTitle(title: string): boolean {
  return isValidLength(title, 1, 100) && !/[<>]/.test(title)
}

// 설명 검증
export function isValidDescription(description: string): boolean {
  return isValidLength(description, 0, 500) && !/[<>]/.test(description)
}