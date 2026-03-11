import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create client with anon key (same as frontend)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Test 1: Try to access profiles without authentication
    console.log('Testing unauthenticated access to profiles...')
    const { data: unauthProfiles, error: unauthError } = await supabase
      .from('profiles')
      .select('*')

    // Test 2: Try to access with invalid user
    console.log('Testing with fake authentication...')
    const supabaseWithFakeAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: 'Bearer fake-token'
        }
      }
    })
    
    const { data: fakeAuthProfiles, error: fakeAuthError } = await supabaseWithFakeAuth
      .from('profiles')  
      .select('*')

    return new Response(
      JSON.stringify({
        test_results: {
          unauthenticated_access: {
            data_count: unauthProfiles?.length || 0,
            error: unauthError?.message || null,
            success: !unauthError && (unauthProfiles?.length === 0)
          },
          fake_auth_access: {
            data_count: fakeAuthProfiles?.length || 0,
            error: fakeAuthError?.message || null,
            success: !fakeAuthError && (fakeAuthProfiles?.length === 0)
          },
          security_status: (!unauthError && (unauthProfiles?.length === 0)) && 
                          (!fakeAuthError && (fakeAuthProfiles?.length === 0)) ? 'SECURE' : 'VULNERABLE'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})