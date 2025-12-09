import { createClient } from '@supabase/supabase-js';

// W Vite zmienne środowiskowe muszą być pobierane BEZPOŚREDNIO (import.meta.env.NAZWA),
// aby kompilator mógł je podmienić podczas budowania. Dynamiczny dostęp (env[key]) nie działa w produkcji.

const getEnvVar = (key: string, value: string | undefined) => {
  if (!value || value === 'undefined') {
    return '';
  }
  return value;
};

// Pobieramy wartości wprost, używając rzutowania 'as any' by uniknąć błędów TS
const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', rawUrl);
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', rawKey);

// Sprawdzenie czy klucze są obecne
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.error('⛔ BRAK KLUCZY SUPABASE! Upewnij się, że ustawiłeś zmienne VITE_SUPABASE_URL oraz VITE_SUPABASE_ANON_KEY w pliku .env.local lub w panelu Netlify. Jeśli już to zrobiłeś, zrób "Trigger deploy" -> "Clear cache and deploy site".');
}

// Create client with fallback values to prevent instant crash
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co', 
  SUPABASE_ANON_KEY || 'placeholder'
);

export const uploadFile = async (file: File, bucket: 'models' | 'textures'): Promise<string | null> => {
  // Check if keys are present before attempting upload
  if (!isSupabaseConfigured) {
    alert("⛔ BŁĄD KONFIGURACJI: Aplikacja nie widzi kluczy Supabase.\n\nJeśli dodałeś zmienne w Netlify (Environment Variables), musisz PRZEBUDOWAĆ stronę, aby zadziałały.\n\nIdź do Netlify -> Deploys -> Trigger deploy -> Clear cache and deploy site.");
    return null;
  }

  try {
    // Sanitize filename: remove non-alphanumeric chars (keep dots/dashes), prepend timestamp
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}_${safeName}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      // Throw the raw error object to be handled by the catch block
      throw error;
    }

    if (!data) {
      throw new Error('Upload succeeded but no data returned.');
    }

    // Get Public URL
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    
    if (!publicData || !publicData.publicUrl) {
      throw new Error('Could not retrieve public URL.');
    }

    return publicData.publicUrl;
  } catch (error: any) {
    // Properly log the error object as a string
    console.error('Upload handling failed:', JSON.stringify(error, null, 2));
    
    const msg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    
    // Specyficzna obsługa błędu RLS (Row Level Security)
    if (msg.includes('row-level security') || msg.includes('violates row-level security policy') || (error.statusCode === '403')) {
        alert(
            `⛔ BŁĄD UPRAWNIEŃ SUPABASE (RLS)\n\n` +
            `Nie można wysłać pliku do bucketa "${bucket}".\n` +
            `Serwer odrzucił żądanie (403 Unauthorized).\n\n` +
            `JAK NAPRAWIĆ:\n` +
            `1. Wejdź na https://supabase.com/dashboard/project/jgvhulcorlpdlpehppxn\n` +
            `2. Przejdź do zakładki "Storage" -> "Policies".\n` +
            `3. Przy buckecie "${bucket}" kliknij "New Policy".\n` +
            `4. Wybierz "Get started quickly" -> "Give users access to all files" (INSERT, SELECT, UPDATE).\n` +
            `5. Kliknij "Review" i "Save".`
        );
    } else {
        alert(`Błąd podczas wysyłania pliku:\n${msg}`);
    }
    return null;
  }
};