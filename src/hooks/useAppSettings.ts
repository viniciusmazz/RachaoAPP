import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAppSettings = () => {
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log('useAppSettings: Fetching settings from groups table for slug: app-settings');
        const { data, error } = await supabase
          .from('groups')
          .select('settings')
          .eq('slug', 'app-settings')
          .maybeSingle();

        if (error) {
          console.error('useAppSettings: Supabase error:', error);
          throw error;
        }
        
        console.log('useAppSettings: Data received:', data);
        
        if (data && data.settings && typeof data.settings === 'object') {
          const settings = data.settings as Record<string, unknown>;
          if (settings.appLogo && typeof settings.appLogo === 'string') {
            console.log('useAppSettings: App logo found in DB, length:', settings.appLogo.length);
            setAppLogo(settings.appLogo);
          } else {
            console.log('useAppSettings: App logo field missing or not a string in settings:', settings);
          }
        } else {
          console.log('useAppSettings: No settings found for app-settings group');
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
