'use client'

import { useState, useCallback } from 'react'
import { Mission } from '@/lib/types/common'
import { Profile } from '@/lib/types/profile'
import { Notification } from '@/lib/types/notification'

interface CelebrationData {
  amount: number
  missionCount: number
}

export interface AppState {
  // 모달 상태
  showAddModal: boolean
  showActionModal: boolean
  showProposalForm: boolean
  showProposalManager: boolean
  showProposalNotification: boolean
  showRejectionNotification: boolean
  showCelebrationModal: boolean
  
  // 선택된 아이템들
  selectedChildId: string | null
  selectedMission: Mission | null
  editingMission: Mission | null
  currentRejectionNotification: Notification | null
  
  // 가족 관련 상태
  connectedChildren: Profile[]
  isParentWithChild: boolean
  
  // 축하 데이터
  celebrationData: CelebrationData | null
}

const initialState: AppState = {
  showAddModal: false,
  showActionModal: false,
  showProposalForm: false,
  showProposalManager: false,
  showProposalNotification: false,
  showRejectionNotification: false,
  showCelebrationModal: false,
  selectedChildId: null,
  selectedMission: null,
  editingMission: null,
  currentRejectionNotification: null,
  connectedChildren: [],
  isParentWithChild: false,
  celebrationData: null
}

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState)

  // 모달 제어 함수들
  const openAddModal = useCallback(() => {
    setState(prev => ({ ...prev, showAddModal: true }))
  }, [])

  const closeAddModal = useCallback(() => {
    setState(prev => ({ ...prev, showAddModal: false }))
  }, [])

  const openActionModal = useCallback((mission: Mission) => {
    setState(prev => ({ 
      ...prev, 
      showActionModal: true, 
      selectedMission: mission 
    }))
  }, [])

  const closeActionModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showActionModal: false, 
      selectedMission: null 
    }))
  }, [])

  const openProposalForm = useCallback(() => {
    setState(prev => ({ ...prev, showProposalForm: true }))
  }, [])

  const closeProposalForm = useCallback(() => {
    setState(prev => ({ ...prev, showProposalForm: false }))
  }, [])

  const openProposalManager = useCallback(() => {
    setState(prev => ({ ...prev, showProposalManager: true }))
  }, [])

  const closeProposalManager = useCallback(() => {
    setState(prev => ({ ...prev, showProposalManager: false }))
  }, [])

  const openProposalNotification = useCallback(() => {
    setState(prev => ({ ...prev, showProposalNotification: true }))
  }, [])

  const closeProposalNotification = useCallback(() => {
    setState(prev => ({ ...prev, showProposalNotification: false }))
  }, [])

  const openRejectionNotification = useCallback((notification: Notification) => {
    setState(prev => ({ 
      ...prev, 
      showRejectionNotification: true,
      currentRejectionNotification: notification
    }))
  }, [])

  const closeRejectionNotification = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showRejectionNotification: false,
      currentRejectionNotification: null
    }))
  }, [])

  const openCelebrationModal = useCallback((data: CelebrationData) => {
    setState(prev => ({ 
      ...prev, 
      showCelebrationModal: true,
      celebrationData: data
    }))
  }, [])

  const closeCelebrationModal = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      showCelebrationModal: false,
      celebrationData: null
    }))
  }, [])

  // 선택 관련 함수들
  const selectChild = useCallback((childId: string | null) => {
    setState(prev => ({ ...prev, selectedChildId: childId }))
  }, [])

  const setEditingMission = useCallback((mission: Mission | null) => {
    setState(prev => ({ ...prev, editingMission: mission }))
  }, [])

  // 가족 관련 함수들
  const setConnectedChildren = useCallback((children: Profile[]) => {
    setState(prev => ({ ...prev, connectedChildren: children }))
  }, [])

  const setIsParentWithChild = useCallback((isParent: boolean) => {
    setState(prev => ({ ...prev, isParentWithChild: isParent }))
  }, [])

  // 모든 모달 초기화
  const resetAllModals = useCallback(() => {
    setState(prev => ({
      ...prev,
      showAddModal: false,
      showActionModal: false,
      showProposalForm: false,
      showProposalManager: false,
      showProposalNotification: false,
      showRejectionNotification: false,
      showCelebrationModal: false,
      selectedMission: null,
      editingMission: null,
      currentRejectionNotification: null,
      celebrationData: null
    }))
  }, [])

  return {
    // 상태
    ...state,
    
    // 모달 제어 함수들
    openAddModal,
    closeAddModal,
    openActionModal,
    closeActionModal,
    openProposalForm,
    closeProposalForm,
    openProposalManager,
    closeProposalManager,
    openProposalNotification,
    closeProposalNotification,
    openRejectionNotification,
    closeRejectionNotification,
    openCelebrationModal,
    closeCelebrationModal,
    
    // 선택 관련 함수들
    selectChild,
    setEditingMission,
    
    // 가족 관련 함수들
    setConnectedChildren,
    setIsParentWithChild,
    
    // 유틸리티 함수들
    resetAllModals
  }
}