import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    const entries = await prisma.allowanceEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Error fetching allowance entries:', error)
    return NextResponse.json({ error: 'Failed to fetch allowance entries' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, type, amount, description, category } = body
    
    const result = await prisma.$transaction(async (tx) => {
      // Create allowance entry
      const entry = await tx.allowanceEntry.create({
        data: {
          userId,
          type,
          amount,
          description,
          category
        }
      })
      
      // Update user's current allowance
      if (type === 'SPENT') {
        await tx.user.update({
          where: { id: userId },
          data: {
            currentAllowance: {
              decrement: amount
            }
          }
        })
      } else if (type === 'EARNED') {
        await tx.user.update({
          where: { id: userId },
          data: {
            currentAllowance: {
              increment: amount
            }
          }
        })
      }
      
      return entry
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating allowance entry:', error)
    return NextResponse.json({ error: 'Failed to create allowance entry' }, { status: 500 })
  }
}