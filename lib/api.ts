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

// API functions
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch user')
  }
  return response.json()
}

export async function fetchMissions(): Promise<Mission[]> {
  const response = await fetch('/api/missions')
  if (!response.ok) {
    throw new Error('Failed to fetch missions')
  }
  return response.json()
}

export async function completeMission(missionId: string, userId: string): Promise<MissionCompletion> {
  const response = await fetch(`/api/missions/${missionId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to complete mission')
  }
  
  return response.json()
}

export async function createMission(mission: Omit<Mission, 'id' | 'completions'>): Promise<Mission> {
  const response = await fetch('/api/missions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mission),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create mission')
  }
  
  return response.json()
}

export async function fetchAllowanceEntries(userId: string): Promise<AllowanceEntry[]> {
  const response = await fetch(`/api/allowance?userId=${userId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch allowance entries')
  }
  return response.json()
}

export async function createAllowanceEntry(entry: Omit<AllowanceEntry, 'id' | 'createdAt'>): Promise<AllowanceEntry> {
  const response = await fetch('/api/allowance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create allowance entry')
  }
  
  return response.json()
}

export async function createUser(user: Omit<User, 'id' | 'currentAllowance' | 'missions' | 'allowanceEntries'>): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create user')
  }
  
  return response.json()
}