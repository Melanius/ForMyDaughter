// API utility functions for client-side data fetching

export interface User {
  id: string
  email: string
  name: string
  role: string
  currentAllowance: number
  missions: Mission[]
  allowanceEntries: AllowanceEntry[]
}

export interface Mission {
  id: string
  title: string
  description?: string
  reward: number
  userId: string
  isActive: boolean
  completions: MissionCompletion[]
}

export interface MissionCompletion {
  id: string
  missionId: string
  userId: string
  date: string
}

export interface AllowanceEntry {
  id: string
  userId: string
  type: 'EARNED' | 'SPENT'
  amount: number
  description: string
  category?: string
  createdAt: string
}

// Safe JSON response handler
async function safeJsonResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status} ${response.statusText}`)
  }

  const text = await response.text()
  if (!text) {
    throw new Error(`${errorMessage}: Empty response`)
  }

  try {
    return JSON.parse(text) as T
  } catch (error) {
    console.error('JSON parsing error:', error, 'Response text:', text.substring(0, 200))
    throw new Error(`${errorMessage}: Invalid JSON response`)
  }
}

// API functions
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  return safeJsonResponse<User>(response, 'Failed to fetch user')
}

export async function fetchMissions(): Promise<Mission[]> {
  const response = await fetch('/api/missions')
  return safeJsonResponse<Mission[]>(response, 'Failed to fetch missions')
}

export async function completeMission(missionId: string, userId: string): Promise<MissionCompletion> {
  const response = await fetch(`/api/missions/${missionId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })
  
  return safeJsonResponse<MissionCompletion>(response, 'Failed to complete mission')
}

export async function createMission(mission: Omit<Mission, 'id' | 'completions'>): Promise<Mission> {
  const response = await fetch('/api/missions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mission),
  })
  
  return safeJsonResponse<Mission>(response, 'Failed to create mission')
}

export async function fetchAllowanceEntries(userId: string): Promise<AllowanceEntry[]> {
  const response = await fetch(`/api/allowance?userId=${userId}`)
  return safeJsonResponse<AllowanceEntry[]>(response, 'Failed to fetch allowance entries')
}

export async function createAllowanceEntry(entry: Omit<AllowanceEntry, 'id' | 'createdAt'>): Promise<AllowanceEntry> {
  const response = await fetch('/api/allowance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  })
  
  return safeJsonResponse<AllowanceEntry>(response, 'Failed to create allowance entry')
}

export async function createUser(user: Omit<User, 'id' | 'currentAllowance' | 'missions' | 'allowanceEntries'>): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  })
  
  return safeJsonResponse<User>(response, 'Failed to create user')
}