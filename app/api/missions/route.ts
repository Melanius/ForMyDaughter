import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const missions = await prisma.mission.findMany({
      include: {
        completions: true,
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(missions)
  } catch (error) {
    console.error('Error fetching missions:', error)
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, reward, userId } = body
    
    const mission = await prisma.mission.create({
      data: {
        title,
        description,
        reward: reward || 500,
        userId
      }
    })
    
    return NextResponse.json(mission, { status: 201 })
  } catch (error) {
    console.error('Error creating mission:', error)
    return NextResponse.json({ error: 'Failed to create mission' }, { status: 500 })
  }
}