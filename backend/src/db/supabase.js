import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables if not already loaded (e.g. in tests or local dev)
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables. Using mock DB.");
}

// Create a single supabase client for interacting with your database
// We use the Service Role Key on the backend to bypass RLS policies
export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey)
    : { 
        from: () => ({ 
            select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }), order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }), 
            insert: () => Promise.resolve({ error: null, select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }), 
            update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }), 
            delete: () => ({ eq: () => Promise.resolve({ error: null }) }) 
        }) 
    };
