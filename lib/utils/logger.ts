/**
 * 🔧 개발 환경 로깅 유틸리티
 * 프로덕션에서 자동으로 로그가 제거되도록 구성
 */

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug'

interface Logger {
  log: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  info: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
}

const isDevelopment = process.env.NODE_ENV === 'development'

function createLogger(prefix: string = ''): Logger {
  const logWithPrefix = (level: LogLevel, message: string, ...args: any[]) => {
    if (isDevelopment) {
      const prefixedMessage = prefix ? `[${prefix}] ${message}` : message
      console[level](prefixedMessage, ...args)
    }
  }

  return {
    log: (message: string, ...args: any[]) => logWithPrefix('log', message, ...args),
    error: (message: string, ...args: any[]) => logWithPrefix('error', message, ...args),
    warn: (message: string, ...args: any[]) => logWithPrefix('warn', message, ...args),
    info: (message: string, ...args: any[]) => logWithPrefix('info', message, ...args),
    debug: (message: string, ...args: any[]) => logWithPrefix('debug', message, ...args),
  }
}

// 기본 로거
export const logger = createLogger()

// 특정 모듈용 로거 생성 함수
export const createModuleLogger = (moduleName: string) => createLogger(moduleName)

// 자주 사용하는 모듈별 로거들
export const authLogger = createLogger('AUTH')
export const missionLogger = createLogger('MISSION')
export const allowanceLogger = createLogger('ALLOWANCE')
export const supabaseLogger = createLogger('SUPABASE')