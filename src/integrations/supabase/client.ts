import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://wnrfyhedlryufcwnvbma.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducmZ5aGVkbHJ5dWZjd252Ym1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMjAxNDgsImV4cCI6MjA3MDU5NjE0OH0.IyuUaTeRmVMW5aYZ6OtpFfHpqTOAqvj6KGm3Kt6nl4E";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
