/**
 * 🛡️ Enhanced Error Handling Utility
 * Provides consistent error handling patterns across the application
 */

import { logger } from './logger'

export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
  originalError?: Error
  timestamp: string
}

export class CustomError extends Error {
  code: string
  details?: Record<string, unknown>
  originalError?: Error
  timestamp: string

  constructor(
    code: string, 
    message: string, 
    details?: Record<string, unknown>, 
    originalError?: Error
  ) {
    super(message)
    this.name = 'CustomError'
    this.code = code
    this.details = details
    this.originalError = originalError
    this.timestamp = new Date().toISOString()
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      originalError: this.originalError,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Error codes for different types of errors
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',

  // Mission errors
  MISSION_NOT_FOUND: 'MISSION_NOT_FOUND',
  MISSION_ALREADY_COMPLETED: 'MISSION_ALREADY_COMPLETED',
  MISSION_CREATE_FAILED: 'MISSION_CREATE_FAILED',

  // Database errors
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_VALIDATION_ERROR: 'DB_VALIDATION_ERROR',

  // API errors
  API_REQUEST_FAILED: 'API_REQUEST_FAILED',
  API_INVALID_REQUEST: 'API_INVALID_REQUEST',
  API_RATE_LIMITED: 'API_RATE_LIMITED',

  // General errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

/**
 * Safe error handler with logging
 */
export function handleError(
  error: unknown,
  context: string = 'Unknown',
  fallbackMessage: string = '알 수 없는 오류가 발생했습니다.'
): AppError {
  logger.error(`Error in ${context}:`, error)

  if (error instanceof CustomError) {
    return error.toJSON()
  }

  if (error instanceof Error) {
    return {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message || fallbackMessage,
      details: { context, stack: error.stack },
      originalError: error,
      timestamp: new Date().toISOString(),
    }
  }

  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: typeof error === 'string' ? error : fallbackMessage,
    details: { context, error },
    timestamp: new Date().toISOString(),
  }
}

/**
 * Async error handler with consistent error formatting
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackMessage?: string
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: handleError(error, context, fallbackMessage) 
    }
  }
}

/**
 * Validation helper functions
 */
export const validation = {
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  isRequired: (value: unknown): boolean => {
    return value !== null && value !== undefined && value !== ''
  },

  isPositiveNumber: (value: number): boolean => {
    return typeof value === 'number' && value > 0 && !isNaN(value)
  },

  isValidDate: (date: string): boolean => {
    const parsedDate = new Date(date)
    return !isNaN(parsedDate.getTime())
  },

  isValidUserId: (userId: string): boolean => {
    return typeof userId === 'string' && userId.length > 0 && userId.trim() === userId
  },

  validateMissionData: (data: {
    title: string
    reward: number
    userId?: string
  }): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!validation.isRequired(data.title)) {
      errors.push('미션 제목은 필수입니다.')
    }

    if (!validation.isPositiveNumber(data.reward)) {
      errors.push('보상은 0보다 큰 숫자여야 합니다.')
    }

    if (data.userId && !validation.isValidUserId(data.userId)) {
      errors.push('유효하지 않은 사용자 ID입니다.')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  fallback: T | null = null
): { success: true; data: T } | { success: false; error: AppError; data: T | null } {
  if (!jsonString) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Empty or null JSON string',
        timestamp: new Date().toISOString()
      },
      data: fallback
    }
  }

  try {
    const data = JSON.parse(jsonString) as T
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: handleError(error, 'JSON parsing', 'Invalid JSON format'),
      data: fallback
    }
  }
}

/**
 * User-friendly error messages
 */
export function getErrorMessage(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.AUTH_REQUIRED:
      return '로그인이 필요합니다.'
    case ERROR_CODES.AUTH_INVALID:
      return '잘못된 인증 정보입니다.'
    case ERROR_CODES.MISSION_NOT_FOUND:
      return '미션을 찾을 수 없습니다.'
    case ERROR_CODES.MISSION_ALREADY_COMPLETED:
      return '이미 완료된 미션입니다.'
    case ERROR_CODES.DB_CONNECTION_ERROR:
      return '데이터베이스 연결에 실패했습니다.'
    case ERROR_CODES.NETWORK_ERROR:
      return '네트워크 연결을 확인해주세요.'
    default:
      return error.message || '알 수 없는 오류가 발생했습니다.'
  }
}