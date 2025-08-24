import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        missions: true,
        allowanceEntries: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        children: true,
        parent: true
      }
    })
    
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, role, parentId } = body
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'CHILD',
        parentId
      }
    })
    
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}