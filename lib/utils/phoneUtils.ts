/**
 * 전화번호 포맷팅 유틸리티
 */

/**
 * 숫자만 추출 (11자리로 제한)
 * @param phone - 입력된 전화번호
 * @returns 숫자만 추출된 문자열 (최대 11자리)
 */
export const extractNumbers = (phone: string): string => {
  const numbers = phone.replace(/\D/g, '') // 숫자가 아닌 모든 문자 제거
  return numbers.slice(0, 11) // 최대 11자리로 제한
}

/**
 * 전화번호 자동 포맷팅
 * @param phone - 입력된 전화번호
 * @returns 포맷팅된 전화번호 (000-0000-0000 형식)
 */
export const formatPhoneNumber = (phone: string): string => {
  const numbers = extractNumbers(phone)
  
  if (numbers.length === 0) return ''
  
  if (numbers.length <= 3) {
    return numbers
  } else if (numbers.length <= 7) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  } else if (numbers.length <= 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }
  
  // 11자리 초과 시 11자리로 잘라서 포맷팅
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
}

/**
 * 전화번호 유효성 검사
 * @param phone - 검사할 전화번호
 * @returns 유효한 전화번호인지 여부
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const numbers = extractNumbers(phone)
  return numbers.length === 11 && numbers.startsWith('010')
}

/**
 * 전화번호를 DB 저장용 포맷으로 변환
 * @param phone - 입력된 전화번호
 * @returns DB 저장용 포맷 (000-0000-0000 또는 null)
 */
export const formatPhoneForDB = (phone: string): string | null => {
  const numbers = extractNumbers(phone)
  
  if (numbers.length === 0) return null
  if (numbers.length !== 11) return null
  
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
}

/**
 * 입력 이벤트 핸들러 - 실시간 포맷팅
 * @param e - 입력 이벤트
 * @param setValue - state setter 함수
 */
export const handlePhoneInput = (
  e: React.ChangeEvent<HTMLInputElement>, 
  setValue: (value: string) => void
) => {
  const formatted = formatPhoneNumber(e.target.value)
  setValue(formatted)
}

/**
 * 전화번호 표시용 포맷팅 (이미 포맷된 번호 처리)
 * @param phone - 전화번호
 * @returns 표시용 포맷팅된 전화번호
 */
export const displayPhoneNumber = (phone: string | null): string => {
  if (!phone) return ''
  
  // 이미 포맷된 번호라면 그대로 반환
  if (phone.includes('-')) return phone
  
  // 포맷되지 않은 번호라면 포맷팅 후 반환
  return formatPhoneNumber(phone)
}