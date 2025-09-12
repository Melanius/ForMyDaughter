/**
 * 🛡️ Security Utilities
 * Functions for input sanitization, validation, and security best practices
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - Raw user input
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/\\/g, '&#x5C;')
    .replace(/&/g, '&amp;')
}

/**
 * Validate and sanitize mission title
 * @param title - Mission title input
 * @returns Validation result
 */
export function validateMissionTitle(title: string): {
  valid: boolean
  sanitized: string
  errors: string[]
} {
  const errors: string[] = []
  const sanitized = sanitizeInput(title)

  if (!sanitized || sanitized.length === 0) {
    errors.push('미션 제목은 필수입니다.')
  }

  if (sanitized.length > 100) {
    errors.push('미션 제목은 100자를 초과할 수 없습니다.')
  }

  if (sanitized.length < 2) {
    errors.push('미션 제목은 최소 2자 이상이어야 합니다.')
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors
  }
}

/**
 * Validate and sanitize mission description
 * @param description - Mission description input
 * @returns Validation result
 */
export function validateMissionDescription(description?: string): {
  valid: boolean
  sanitized: string
  errors: string[]
} {
  const errors: string[] = []
  const sanitized = description ? sanitizeInput(description) : ''

  if (sanitized.length > 500) {
    errors.push('미션 설명은 500자를 초과할 수 없습니다.')
  }

  return {
    valid: errors.length === 0,
    sanitized,
    errors
  }
}

/**
 * Validate reward amount
 * @param reward - Reward amount
 * @returns Validation result
 */
export function validateReward(reward: number): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (typeof reward !== 'number' || isNaN(reward)) {
    errors.push('보상은 숫자여야 합니다.')
  } else if (reward <= 0) {
    errors.push('보상은 0보다 커야 합니다.')
  } else if (reward > 100000) {
    errors.push('보상은 100,000원을 초과할 수 없습니다.')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate user ID format (UUID)
 * @param userId - User ID to validate
 * @returns Whether the ID is valid
 */
export function isValidUserId(userId: string): boolean {
  if (typeof userId !== 'string') return false
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(userId)
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param dateString - Date string to validate
 * @returns Whether the date format is valid
 */
export function isValidDateFormat(dateString: string): boolean {
  if (typeof dateString !== 'string') return false
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) return false
  
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0]
}

/**
 * Rate limiting helper for API endpoints
 */
export class RateLimit {
  private requests = new Map<string, { count: number; resetTime: number }>()

  /**
   * Check if request is within rate limit
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @param limit - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Whether request is allowed
   */
  public isAllowed(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now()
    const requestData = this.requests.get(identifier)

    if (!requestData || now > requestData.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }

    if (requestData.count >= limit) {
      return false
    }

    requestData.count++
    return true
  }

  /**
   * Clean up expired rate limit entries
   */
  public cleanup(): void {
    const now = Date.now()
    for (const [identifier, data] of this.requests) {
      if (now > data.resetTime) {
        this.requests.delete(identifier)
      }
    }
  }
}

/**
 * Global rate limiter instance
 */
export const rateLimiter = new RateLimit()

/**
 * Constants for security configuration
 */
export const SECURITY_CONFIG = {
  MAX_MISSION_TITLE_LENGTH: 100,
  MAX_MISSION_DESCRIPTION_LENGTH: 500,
  MAX_REWARD_AMOUNT: 100000,
  MIN_REWARD_AMOUNT: 1,
  RATE_LIMIT_REQUESTS_PER_MINUTE: 100,
  RATE_LIMIT_WINDOW_MS: 60000,
} as const