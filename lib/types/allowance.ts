// 용돈 수입/지출 관리 타입 정의

export interface AllowanceTransaction {
  id: string
  type: 'income' | 'expense'  // 수입 | 지출
  amount: number             // 금액
  description: string        // 설명
  category: string          // 카테고리 (수입: 미션완료, 용돈, 선물 / 지출: 간식, 장난감, 문구류 등)
  date: string              // YYYY-MM-DD 형식
  createdAt: string         // ISO 형식
  missionId?: string        // 미션 완료로 인한 수입인 경우 미션 ID
}

export interface AllowanceBalance {
  id: string
  date: string              // YYYY-MM-DD 형식
  balance: number           // 해당 날짜 말 잔액
  totalIncome: number       // 해당 날짜까지의 총 수입
  totalExpense: number      // 해당 날짜까지의 총 지출
  dailyIncome: number       // 해당 날짜의 수입
  dailyExpense: number      // 해당 날짜의 지출
  lastUpdated: string       // ISO 형식
}

export interface AllowanceStatistics {
  currentBalance: number    // 현재 잔액
  totalIncome: number      // 총 수입
  totalExpense: number     // 총 지출
  monthlyIncome: number    // 이번 달 수입
  monthlyExpense: number   // 이번 달 지출
  topCategories: {         // 상위 지출 카테고리
    category: string
    amount: number
    percentage: number
  }[]
  recentTransactions: AllowanceTransaction[]  // 최근 거래 내역 (최대 10개)
}

// 카테고리 상수
export const INCOME_CATEGORIES = {
  MISSION: '미션완료',
  ALLOWANCE: '용돈',
  GIFT: '선물',
  BONUS: '보너스',
  OTHER: '기타수입'
} as const

export const EXPENSE_CATEGORIES = {
  SNACK: '간식',
  TOY: '장난감',
  BOOK: '도서',
  STATIONERY: '문구류',
  GAME: '게임',
  CLOTHES: '옷',
  SAVING: '저축',
  OTHER: '기타지출'
} as const

// 데이터베이스 설정 확장
export const ALLOWANCE_DB_CONFIG = {
  STORES: {
    TRANSACTIONS: 'allowanceTransactions',
    BALANCES: 'allowanceBalances'
  },
  INDEXES: {
    TRANSACTIONS_BY_DATE: 'by_date',
    TRANSACTIONS_BY_TYPE: 'by_type',
    TRANSACTIONS_BY_CATEGORY: 'by_category',
    BALANCES_BY_DATE: 'by_date'
  }
}