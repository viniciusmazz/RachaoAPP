import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error.message);
        // If the refresh token is invalid, sign out and clear local storage
        if (error.message.includes('refresh_token_not_found') || 
            error.message.includes('refresh token') || 
            error.message.includes('Invalid Refresh Token')) {
          console.warn('Invalid refresh token detected, clearing session...');
          supabase.auth.signOut();
          
          // Explicitly clear any supabase auth keys from localStorage as a fallback
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase.auth.token') || key.startsWith('sb-')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
      
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }).catch(err => {
      console.error('Unexpected auth error:', err);
      if (mounted) setLoading(false);
    })

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user
  }
}