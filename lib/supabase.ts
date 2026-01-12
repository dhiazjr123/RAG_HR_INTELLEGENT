// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // set di Vercel
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // set di Vercel
);

// nama bucket di Supabase Storage kamu
export const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET ?? 'documents';
