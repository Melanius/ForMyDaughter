import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) {
    return client
  }
  
  client = createBrowserClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit'
      },
      global: {
        headers: {
          'x-application-name': 'kids-allowance-app',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    }
  )
  
  return client
}