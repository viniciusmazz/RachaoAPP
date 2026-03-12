import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAppSettings = () => {
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('settings')
          .eq('slug', 'app-settings')
          .maybeSingle();

        if (error) throw error;
        if (data && data.settings && (data.settings as any).appLogo) {
          setAppLogo((data.settings as any).appLogo);
        }
      } catch (error) {
        console.error('Error fetching app settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { appLogo, loading };
};
