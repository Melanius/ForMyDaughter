import { 
  MissionTemplate, 
  MissionInstance, 
  DateSummary, 
  UserSettings, 
  DB_CONFIG 
} from '../types/mission'
import { 
  AllowanceTransaction, 
  AllowanceBalance, 
  ALLOWANCE_DB_CONFIG 
} from '../types/allowance'

class DatabaseService {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor() {
    this.initializeDB()
  }

  private async initializeDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise
    }

    // 서버 사이드에서는 IndexedDB를 사용할 수 없음 (에러 대신 무시)
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB is not available in server environment')
      return // 서버 사이드에서는 초기화 건너뛰기
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Mission Templates Store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.MISSION_TEMPLATES)) {
          const templatesStore = db.createObjectStore(DB_CONFIG.STORES.MISSION_TEMPLATES, { keyPath: 'id' })
          templatesStore.createIndex('by_active', 'isActive')
        }

        // Mission Instances Store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.MISSION_INSTANCES)) {
          const instancesStore = db.createObjectStore(DB_CONFIG.STORES.MISSION_INSTANCES, { keyPath: 'id' })
          instancesStore.createIndex(DB_CONFIG.INDEXES.INSTANCES_BY_DATE, 'date')
          instancesStore.createIndex(DB_CONFIG.INDEXES.INSTANCES_BY_TEMPLATE, 'templateId')
        }

        // Date Summaries Store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.DATE_SUMMARIES)) {
          const summariesStore = db.createObjectStore(DB_CONFIG.STORES.DATE_SUMMARIES, { keyPath: 'date' })
          summariesStore.createIndex(DB_CONFIG.INDEXES.SUMMARIES_BY_DATE, 'date')
        }

        // User Settings Store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.USER_SETTINGS)) {
          db.createObjectStore(DB_CONFIG.STORES.USER_SETTINGS, { keyPath: 'id' })
        }

        // Allowance Transactions Store
        if (!db.objectStoreNames.contains(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS)) {
          const transactionsStore = db.createObjectStore(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, { keyPath: 'id' })
          transactionsStore.createIndex(ALLOWANCE_DB_CONFIG.INDEXES.TRANSACTIONS_BY_DATE, 'date')
          transactionsStore.createIndex(ALLOWANCE_DB_CONFIG.INDEXES.TRANSACTIONS_BY_TYPE, 'type')
          transactionsStore.createIndex(ALLOWANCE_DB_CONFIG.INDEXES.TRANSACTIONS_BY_CATEGORY, 'category')
        }

        // Allowance Balances Store
        if (!db.objectStoreNames.contains(ALLOWANCE_DB_CONFIG.STORES.BALANCES)) {
          const balancesStore = db.createObjectStore(ALLOWANCE_DB_CONFIG.STORES.BALANCES, { keyPath: 'date' })
          balancesStore.createIndex(ALLOWANCE_DB_CONFIG.INDEXES.BALANCES_BY_DATE, 'date')
        }
      }
    })

    return this.dbPromise
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }
    return await this.initializeDB()
  }

  // Generic CRUD operations
  private async add<T>(storeName: string, data: T): Promise<string> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.add(data)

      request.onsuccess = () => resolve(request.result as string)
      request.onerror = () => reject(request.error)
    })
  }

  private async update<T>(storeName: string, data: T): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.put(data)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  private async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = index.getAll(value)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  private async delete(storeName: string, key: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(key)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Mission Template operations
  async createTemplate(template: Omit<MissionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = new Date().toISOString()
    const newTemplate: MissionTemplate = {
      id: `template_${Date.now()}`,
      ...template,
      createdAt: now,
      updatedAt: now
    }
    await this.add(DB_CONFIG.STORES.MISSION_TEMPLATES, newTemplate)
    return newTemplate.id
  }

  async updateTemplate(id: string, updates: Partial<MissionTemplate>): Promise<void> {
    const existing = await this.get<MissionTemplate>(DB_CONFIG.STORES.MISSION_TEMPLATES, id)
    if (!existing) throw new Error('Template not found')

    const updated: MissionTemplate = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    await this.update(DB_CONFIG.STORES.MISSION_TEMPLATES, updated)
  }

  async getTemplate(id: string): Promise<MissionTemplate | null> {
    return await this.get<MissionTemplate>(DB_CONFIG.STORES.MISSION_TEMPLATES, id)
  }

  async getAllTemplates(): Promise<MissionTemplate[]> {
    return await this.getAll<MissionTemplate>(DB_CONFIG.STORES.MISSION_TEMPLATES)
  }

  async getActiveTemplates(): Promise<MissionTemplate[]> {
    return await this.getByIndex<MissionTemplate>(DB_CONFIG.STORES.MISSION_TEMPLATES, 'by_active', true)
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.delete(DB_CONFIG.STORES.MISSION_TEMPLATES, id)
  }

  // Mission Instance operations
  async createInstance(instance: Omit<MissionInstance, 'id'>): Promise<string> {
    const newInstance: MissionInstance = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...instance
    }
    await this.add(DB_CONFIG.STORES.MISSION_INSTANCES, newInstance)
    return newInstance.id
  }

  async updateInstance(id: string, updates: Partial<MissionInstance>): Promise<void> {
    const existing = await this.get<MissionInstance>(DB_CONFIG.STORES.MISSION_INSTANCES, id)
    if (!existing) throw new Error('Instance not found')

    const updated: MissionInstance = {
      ...existing,
      ...updates
    }
    await this.update(DB_CONFIG.STORES.MISSION_INSTANCES, updated)
  }

  async getInstance(id: string): Promise<MissionInstance | null> {
    return await this.get<MissionInstance>(DB_CONFIG.STORES.MISSION_INSTANCES, id)
  }

  async getMissionsByDate(date: string): Promise<MissionInstance[]> {
    return await this.getByIndex<MissionInstance>(DB_CONFIG.STORES.MISSION_INSTANCES, DB_CONFIG.INDEXES.INSTANCES_BY_DATE, date)
  }

  async getMissionsByTemplate(templateId: string): Promise<MissionInstance[]> {
    return await this.getByIndex<MissionInstance>(DB_CONFIG.STORES.MISSION_INSTANCES, DB_CONFIG.INDEXES.INSTANCES_BY_TEMPLATE, templateId)
  }

  async getAllInstances(): Promise<MissionInstance[]> {
    return await this.getAll<MissionInstance>(DB_CONFIG.STORES.MISSION_INSTANCES)
  }

  async deleteInstance(id: string): Promise<void> {
    await this.delete(DB_CONFIG.STORES.MISSION_INSTANCES, id)
  }

  // Date Summary operations
  async updateDateSummary(summary: DateSummary): Promise<void> {
    await this.update(DB_CONFIG.STORES.DATE_SUMMARIES, summary)
  }

  async getDateSummary(date: string): Promise<DateSummary | null> {
    return await this.get<DateSummary>(DB_CONFIG.STORES.DATE_SUMMARIES, date)
  }

  async getDateSummariesInRange(startDate: string, endDate: string): Promise<DateSummary[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DB_CONFIG.STORES.DATE_SUMMARIES], 'readonly')
      const store = transaction.objectStore(DB_CONFIG.STORES.DATE_SUMMARIES)
      const index = store.index(DB_CONFIG.INDEXES.SUMMARIES_BY_DATE)
      const range = IDBKeyRange.bound(startDate, endDate)
      const request = index.getAll(range)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // User Settings operations
  async updateUserSettings(settings: UserSettings): Promise<void> {
    await this.update(DB_CONFIG.STORES.USER_SETTINGS, settings)
  }

  async getUserSettings(): Promise<UserSettings | null> {
    return await this.get<UserSettings>(DB_CONFIG.STORES.USER_SETTINGS, 'default')
  }

  // Allowance Transaction operations
  async createTransaction(transaction: Omit<AllowanceTransaction, 'id' | 'createdAt'>): Promise<string> {
    const newTransaction: AllowanceTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...transaction,
      createdAt: new Date().toISOString()
    }
    await this.add(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, newTransaction)
    return newTransaction.id
  }

  async updateTransaction(id: string, updates: Partial<AllowanceTransaction>): Promise<void> {
    const existing = await this.get<AllowanceTransaction>(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, id)
    if (!existing) throw new Error('Transaction not found')

    const updated: AllowanceTransaction = {
      ...existing,
      ...updates
    }
    await this.update(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, updated)
  }

  async getTransaction(id: string): Promise<AllowanceTransaction | null> {
    return await this.get<AllowanceTransaction>(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, id)
  }

  async getTransactionsByDate(date: string): Promise<AllowanceTransaction[]> {
    return await this.getByIndex<AllowanceTransaction>(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, ALLOWANCE_DB_CONFIG.INDEXES.TRANSACTIONS_BY_DATE, date)
  }

  async getTransactionsByType(type: 'income' | 'expense'): Promise<AllowanceTransaction[]> {
    return await this.getByIndex<AllowanceTransaction>(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, ALLOWANCE_DB_CONFIG.INDEXES.TRANSACTIONS_BY_TYPE, type)
  }

  async getTransactionsByCategory(category: string): Promise<AllowanceTransaction[]> {
    return await this.getByIndex<AllowanceTransaction>(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, ALLOWANCE_DB_CONFIG.INDEXES.TRANSACTIONS_BY_CATEGORY, category)
  }

  async getAllTransactions(): Promise<AllowanceTransaction[]> {
    return await this.getAll<AllowanceTransaction>(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS)
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.delete(ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS, id)
  }

  // Allowance Balance operations
  async updateBalance(balance: AllowanceBalance): Promise<void> {
    await this.update(ALLOWANCE_DB_CONFIG.STORES.BALANCES, balance)
  }

  async getBalance(date: string): Promise<AllowanceBalance | null> {
    return await this.get<AllowanceBalance>(ALLOWANCE_DB_CONFIG.STORES.BALANCES, date)
  }

  async getBalancesInRange(startDate: string, endDate: string): Promise<AllowanceBalance[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ALLOWANCE_DB_CONFIG.STORES.BALANCES], 'readonly')
      const store = transaction.objectStore(ALLOWANCE_DB_CONFIG.STORES.BALANCES)
      const index = store.index(ALLOWANCE_DB_CONFIG.INDEXES.BALANCES_BY_DATE)
      const range = IDBKeyRange.bound(startDate, endDate)
      const request = index.getAll(range)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  // Utility functions
  async clearAllData(): Promise<void> {
    const db = await this.getDB()
    const storeNames = [
      DB_CONFIG.STORES.MISSION_TEMPLATES,
      DB_CONFIG.STORES.MISSION_INSTANCES,
      DB_CONFIG.STORES.DATE_SUMMARIES,
      DB_CONFIG.STORES.USER_SETTINGS,
      ALLOWANCE_DB_CONFIG.STORES.TRANSACTIONS,
      ALLOWANCE_DB_CONFIG.STORES.BALANCES
    ]

    for (const storeName of storeNames) {
      const transaction = db.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }
}

// 싱글톤 인스턴스
export const databaseService = new DatabaseService()
export default databaseService