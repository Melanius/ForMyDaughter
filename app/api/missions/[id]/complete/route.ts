import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { userId } = await request.json()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check if mission is already completed today
    const existingCompletion = await prisma.missionCompletion.findFirst({
      where: {
        missionId: id,
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    })
    
    if (existingCompletion) {
      return NextResponse.json({ error: 'Mission already completed today' }, { status: 400 })
    }
    
    // Get mission details for reward amount
    const mission = await prisma.mission.findUnique({
      where: { id }
    })
    
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 })
    }
    
    // Create completion record and update user allowance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create mission completion
      const completion = await tx.missionCompletion.create({
        data: {
          missionId: id,
          userId,
          date: new Date()
        }
      })
      
      // Add allowance entry
      await tx.allowanceEntry.create({
        data: {
          userId,
          type: 'EARNED',
          amount: mission.reward,
          description: `미션 완료: ${mission.title}`,
          category: '미션'
        }
      })
      
      // Update user's current allowance
      await tx.user.update({
        where: { id: userId },
        data: {
          currentAllowance: {
            increment: mission.reward
          }
        }
      })
      
      return completion
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error completing mission:', error)
    return NextResponse.json({ error: 'Failed to complete mission' }, { status: 500 })
  }
}