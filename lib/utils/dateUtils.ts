/**
 * 날짜 유틸리티 함수들
 * 한국 시간대(KST, UTC+9)를 기준으로 날짜를 처리합니다.
 */

/**
 * 현재 한국 시간 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns 오늘 날짜 문자열 (예: "2025-08-30")
 */
export function getTodayKST(): string {
  const now = new Date()
  // 한국 시간대로 변환 (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
  const kstTime = new Date(now.getTime() + kstOffset)
  
  return kstTime.toISOString().split('T')[0]!
}

/**
 * 주어진 Date 객체를 한국 시간 기준으로 YYYY-MM-DD 형식으로 반환
 * @param date Date 객체
 * @returns 날짜 문자열 (예: "2025-08-30")
 */
export function formatDateKST(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
  const kstTime = new Date(date.getTime() + kstOffset)
  
  return kstTime.toISOString().split('T')[0]!
}

/**
 * YYYY-MM-DD 형식의 날짜 문자열을 Date 객체로 변환 (한국 시간 기준)
 * @param dateString 날짜 문자열 (예: "2025-08-30")
 * @returns Date 객체
 */
export function parseKSTDate(dateString: string): Date {
  // 로컬 시간으로 파싱하여 시간대 문제 방지
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * 현재 한국 시간 기준 ISO 문자열 반환
 * @returns ISO 날짜시간 문자열
 */
export function nowKST(): string {
  const now = new Date()
  const kstOffset = 9 * 60 * 60 * 1000 // 9시간을 밀리초로
  const kstTime = new Date(now.getTime() + kstOffset)
  
  return kstTime.toISOString()
}

/**
 * 어제 날짜를 한국 시간 기준으로 반환
 * @returns 어제 날짜 문자열 (예: "2025-08-29")
 */
export function getYesterdayKST(): string {
  const today = parseKSTDate(getTodayKST())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  return formatDateKST(yesterday)
}

/**
 * 내일 날짜를 한국 시간 기준으로 반환
 * @returns 내일 날짜 문자열 (예: "2025-08-31")
 */
export function getTomorrowKST(): string {
  const today = parseKSTDate(getTodayKST())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return formatDateKST(tomorrow)
}