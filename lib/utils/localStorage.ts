/**
 * 🔧 Safe localStorage utilities
 * Provides safe localStorage operations with JSON handling
 */

import { safeJsonParse } from './errorHandler'

/**
 * Safely get item from localStorage with JSON parsing
 */
export function getLocalStorageItem<T>(key: string, fallback: T | null = null): T | null {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const item = localStorage.getItem(key)
    if (!item) {
      return fallback
    }

    const parseResult = safeJsonParse<T>(item, fallback)
    return parseResult.success ? parseResult.data : fallback
  } catch (error) {
    console.warn(`Failed to get localStorage item "${key}":`, error)
    return fallback
  }
}

/**
 * Safely set item to localStorage with JSON serialization
 */
export function setLocalStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const serializedValue = JSON.stringify(value)
    localStorage.setItem(key, serializedValue)
    return true
  } catch (error) {
    console.warn(`Failed to set localStorage item "${key}":`, error)
    return false
  }
}

/**
 * Safely remove item from localStorage
 */
export function removeLocalStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn(`Failed to remove localStorage item "${key}":`, error)
    return false
  }
}

/**
 * Safely clear all localStorage
 */
export function clearLocalStorage(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    localStorage.clear()
    return true
  } catch (error) {
    console.warn('Failed to clear localStorage:', error)
    return false
  }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const testKey = '__localStorage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get all localStorage keys
 */
export function getLocalStorageKeys(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    return Object.keys(localStorage)
  } catch (error) {
    console.warn('Failed to get localStorage keys:', error)
    return []
  }
}

/**
 * Get localStorage usage info
 */
export function getLocalStorageInfo(): {
  available: boolean
  keys: string[]
  estimatedSize: number
} {
  const available = isLocalStorageAvailable()
  const keys = getLocalStorageKeys()
  
  let estimatedSize = 0
  if (available) {
    try {
      keys.forEach(key => {
        const item = localStorage.getItem(key)
        if (item) {
          estimatedSize += key.length + item.length
        }
      })
    } catch (error) {
      console.warn('Failed to calculate localStorage size:', error)
    }
  }

  return {
    available,
    keys,
    estimatedSize
  }
}