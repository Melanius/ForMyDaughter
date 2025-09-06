/**
 * 🎁 정산 센터 페이지
 * 완료된 미션의 용돈 전달을 관리하는 페이지
 */

import { Metadata } from 'next'
import { RewardCenter } from '@/components/reward/RewardCenter'

export const metadata: Metadata = {
  title: '정산 센터 | Kids Allowance',
  description: '완료된 미션의 용돈을 전달해주세요',
}

export default function RewardCenterPage() {
  return <RewardCenter />
}