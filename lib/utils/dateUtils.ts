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
  
  // Intl.DateTimeFormat을 사용하여 정확한 한국 시간 계산
  const kstFormatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul'
  })
  
  return kstFormatter.format(now) // YYYY-MM-DD 형식으로 반환
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
  const parts = dateString.split('-').map(Number)
  const [year, month, day] = parts
  return new Date(year!, (month! - 1), day!)
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

/**
 * 주어진 날짜에 일수를 더하거나 빼서 새로운 날짜를 반환 (한국 시간 기준)
 * @param dateString 기준 날짜 문자열 (YYYY-MM-DD)
 * @param days 더할 일수 (음수면 빼기)
 * @returns 계산된 날짜 문자열 (예: "2025-08-31")
 */
export function addDaysKST(dateString: string, days: number): string {
  const baseDate = parseKSTDate(dateString)
  const resultDate = new Date(baseDate)
  resultDate.setDate(resultDate.getDate() + days)
  
  return formatDateKST(resultDate)
}

/**
 * 주어진 날짜의 요일을 반환 (0: 일요일, 1: 월요일, ..., 6: 토요일)
 * @param dateString 날짜 문자열 (YYYY-MM-DD)
 * @returns 요일 숫자 (0-6)
 */
export function getDayOfWeek(dateString: string): number {
  const date = parseKSTDate(dateString)
  return date.getDay()
}

/**
 * 주어진 날짜가 평일인지 확인 (월-금)
 * @param dateString 날짜 문자열 (YYYY-MM-DD)
 * @returns 평일이면 true
 */
export function isWeekday(dateString: string): boolean {
  const dayOfWeek = getDayOfWeek(dateString)
  return dayOfWeek >= 1 && dayOfWeek <= 5
}

/**
 * 주어진 날짜가 주말인지 확인 (토-일)
 * @param dateString 날짜 문자열 (YYYY-MM-DD)
 * @returns 주말이면 true
 */
export function isWeekend(dateString: string): boolean {
  const dayOfWeek = getDayOfWeek(dateString)
  return dayOfWeek === 0 || dayOfWeek === 6
}

/**
 * 반복 패턴 타입 정의
 */
export type RecurringPattern = 
  | 'daily'        // 매일
  | 'weekdays'     // 평일만 (월-금)
  | 'weekends'     // 주말만 (토-일)
  | 'weekly_sun'   // 매주 일요일
  | 'weekly_mon'   // 매주 월요일
  | 'weekly_tue'   // 매주 화요일
  | 'weekly_wed'   // 매주 수요일
  | 'weekly_thu'   // 매주 목요일
  | 'weekly_fri'   // 매주 금요일
  | 'weekly_sat'   // 매주 토요일

/**
 * 반복 패턴에 따라 특정 날짜에 미션을 생성해야 하는지 확인
 * @param dateString 날짜 문자열 (YYYY-MM-DD)
 * @param pattern 반복 패턴
 * @returns 미션을 생성해야 하면 true
 */
export function shouldCreateMissionForDate(dateString: string, pattern: RecurringPattern): boolean {
  const dayOfWeek = getDayOfWeek(dateString)
  
  switch (pattern) {
    case 'daily':
      return true
    case 'weekdays':
      return isWeekday(dateString)
    case 'weekends':
      return isWeekend(dateString)
    case 'weekly_sun':
      return dayOfWeek === 0
    case 'weekly_mon':
      return dayOfWeek === 1
    case 'weekly_tue':
      return dayOfWeek === 2
    case 'weekly_wed':
      return dayOfWeek === 3
    case 'weekly_thu':
      return dayOfWeek === 4
    case 'weekly_fri':
      return dayOfWeek === 5
    case 'weekly_sat':
      return dayOfWeek === 6
    default:
      return true // 기본값은 매일
  }
}