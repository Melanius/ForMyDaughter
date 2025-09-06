/**
 * 🎁 정산 관련 타입 정의
 */

export interface PendingRewardMission {
  id: string;
  userId: string;
  childName: string;
  title: string;
  description?: string;
  reward: number;
  category: string;
  missionType: 'daily' | 'event';
  date: string;
  completedAt: string;
  daysSinceCompletion: number;
  priority: 'high' | 'normal'; // 3일 이상되면 high
}

export interface RewardSummary {
  totalPending: number;
  totalAmount: number;
  latestCompletion?: string;
  oldestCompletion?: string;
  urgentCount: number; // 3일 이상된 미션 수
}

export interface BatchRewardRequest {
  missionIds: string[];
  parentNote?: string;
}

export interface BatchRewardResponse {
  success: boolean;
  processedCount: number;
  totalAmount: number;
  message: string;
}

export interface RewardTransaction {
  id: string;
  userId: string;
  date: string;
  amount: number;
  type: 'income';
  category: '미션완료';
  description: string;
  createdAt: string;
}

// 정산 상태별 미션 그룹
export interface DateGroupedMissions {
  date: string;
  missions: PendingRewardMission[];
  totalAmount: number;
  childGroups: Record<string, PendingRewardMission[]>;
}

// 정산 센터 상태
export interface RewardCenterState {
  pendingMissions: PendingRewardMission[];
  selectedMissionIds: string[];
  groupedByDate: Record<string, DateGroupedMissions>;
  summary: RewardSummary;
  isLoading: boolean;
  error?: string;
}

// 정산 처리 결과
export interface RewardProcessResult {
  success: boolean;
  processedMissions: PendingRewardMission[];
  totalAmount: number;
  errors?: string[];
}

// 알림 관련
export interface RewardNotification {
  type: 'new_completion' | 'urgent_pending' | 'reward_processed';
  missionId?: string;
  childName?: string;
  title?: string;
  amount?: number;
  message: string;
  timestamp: string;
}