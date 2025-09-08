/**
 * 🧪 Debug API: 가족 데이터 조회
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 기존 profiles 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, user_type, parent_id, family_code')
      .limit(10)

    // 새로운 families 조회
    const { data: families } = await supabase
      .from('families')
      .select('*')
      .limit(10)

    // 새로운 family_members 조회
    const { data: familyMembers } = await supabase
      .from('family_members')
      .select('*')
      .limit(10)

    return NextResponse.json({
      legacy_profiles: profiles || [],
      new_families: families || [],
      new_family_members: familyMembers || [],
      stats: {
        profiles_count: profiles?.length || 0,
        families_count: families?.length || 0,
        members_count: familyMembers?.length || 0
      }
    })
  } catch (error) {
    console.error('Debug families API error:', error)
    return NextResponse.json({ error: 'Failed to query families' }, { status: 500 })
  }
}