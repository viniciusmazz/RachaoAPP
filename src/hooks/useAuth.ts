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
        
        // Comprehensive check for refresh token errors
        const isRefreshTokenError = 
          error.message.toLowerCase().includes('refresh_token_not_found') || 
          error.message.toLowerCase().includes('refresh token') || 
          error.message.toLowerCase().includes('invalid refresh token') ||
          error.message.toLowerCase().includes('not found') && error.message.toLowerCase().includes('token');

        if (isRefreshTokenError) {
          console.warn('Invalid refresh token detected, performing forceful session cleanup...');
          
          // Force sign out
          supabase.auth.signOut().catch(err => console.error('Error during signOut:', err));
          
          // Explicitly clear all possible Supabase keys from localStorage
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('supabase.auth.token') || key.startsWith('sb-') || key.includes('supabase'))) {
                localStorage.removeItem(key);
                i--; // Adjust index after removal
              }
            }
          } catch (e) {
            console.error('Error clearing localStorage:', e);
          }

          // Reset state
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          
          // Optionally reload if we're stuck in a loop, but let's try just clearing first
          return;
        }
      }
      
      if (mounted) {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }).catch(err => {
      console.error('Unexpected auth error during getSession:', err);
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