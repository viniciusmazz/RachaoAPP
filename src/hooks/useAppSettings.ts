import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAppSettings = () => {
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log('useAppSettings: Fetching settings from groups table...');
        const { data, error } = await supabase
          .from('groups')
          .select('settings')
          .eq('slug', 'app-settings')
          .maybeSingle();

        if (error) throw error;
        if (data && data.settings && (data.settings as any).appLogo) {
          console.log('useAppSettings: App logo found in DB, length:', (data.settings as any).appLogo.length);
          setAppLogo((data.settings as any).appLogo);
        } else {
          console.log('useAppSettings: App logo not found in DB');
        }
      } catch (error) {
        console.error('useAppSettings: Error fetching app settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { appLogo, loading };
};
