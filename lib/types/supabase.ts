export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          user_type: 'parent' | 'child'
          family_code: string | null
          parent_id: string | null
          avatar_url: string | null
          birthday: string | null
          phone: string | null
          nickname: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          user_type: 'parent' | 'child'
          family_code?: string | null
          parent_id?: string | null
          avatar_url?: string | null
          birthday?: string | null
          phone?: string | null
          nickname?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          user_type?: 'parent' | 'child'
          family_code?: string | null
          parent_id?: string | null
          avatar_url?: string | null
          birthday?: string | null
          phone?: string | null
          nickname?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      mission_templates: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          reward: number
          category: string
          mission_type: 'daily' | 'event'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          reward: number
          category: string
          mission_type: 'daily' | 'event'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          reward?: number
          category?: string
          mission_type?: 'daily' | 'event'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      mission_instances: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          date: string
          title: string
          description: string | null
          reward: number
          category: string
          mission_type: 'daily' | 'event'
          is_completed: boolean
          completed_at: string | null
          is_transferred: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          date: string
          title: string
          description?: string | null
          reward: number
          category: string
          mission_type: 'daily' | 'event'
          is_completed?: boolean
          completed_at?: string | null
          is_transferred?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          date?: string
          title?: string
          description?: string | null
          reward?: number
          category?: string
          mission_type?: 'daily' | 'event'
          is_completed?: boolean
          completed_at?: string | null
          is_transferred?: boolean
          created_at?: string
        }
      }
      allowance_transactions: {
        Row: {
          id: string
          user_id: string
          family_connection_id: string | null
          date: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          family_connection_id?: string | null
          date: string
          amount: number
          type: 'income' | 'expense'
          category: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          family_connection_id?: string | null
          date?: string
          amount?: number
          type?: 'income' | 'expense'
          category?: string
          description?: string | null
          created_at?: string
        }
      }
      allowance_balances: {
        Row: {
          id: string
          user_id: string
          date: string
          balance: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          balance: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          balance?: number
          created_at?: string
        }
      }
      family_connection_requests: {
        Row: {
          id: string
          parent_id: string
          child_id: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          parent_id: string
          child_id: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          responded_at?: string | null
        }
        Update: {
          id?: string
          parent_id?: string
          child_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          responded_at?: string | null
        }
      }
    }
  }
}

// 편의를 위한 타입 별칭
export type Profile = Database['public']['Tables']['profiles']['Row']
export type MissionTemplate = Database['public']['Tables']['mission_templates']['Row']
export type MissionInstance = Database['public']['Tables']['mission_instances']['Row']
export type AllowanceTransaction = Database['public']['Tables']['allowance_transactions']['Row']
export type AllowanceBalance = Database['public']['Tables']['allowance_balances']['Row']
export type FamilyConnectionRequest = Database['public']['Tables']['family_connection_requests']['Row']

// Insert 타입들
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type MissionTemplateInsert = Database['public']['Tables']['mission_templates']['Insert']
export type MissionInstanceInsert = Database['public']['Tables']['mission_instances']['Insert']
export type AllowanceTransactionInsert = Database['public']['Tables']['allowance_transactions']['Insert']
export type AllowanceBalanceInsert = Database['public']['Tables']['allowance_balances']['Insert']
export type FamilyConnectionRequestInsert = Database['public']['Tables']['family_connection_requests']['Insert']

// Update 타입들
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type MissionTemplateUpdate = Database['public']['Tables']['mission_templates']['Update']
export type MissionInstanceUpdate = Database['public']['Tables']['mission_instances']['Update']
export type AllowanceTransactionUpdate = Database['public']['Tables']['allowance_transactions']['Update']
export type AllowanceBalanceUpdate = Database['public']['Tables']['allowance_balances']['Update']
export type FamilyConnectionRequestUpdate = Database['public']['Tables']['family_connection_requests']['Update']