import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function main() {
    console.log('--- Supabase Connection Test ---');
    console.log('URL:', supabaseUrl);
    console.log('Anon Key ends with:', supabaseAnonKey.substring(supabaseAnonKey.length - 10));

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('Attempting to fetch session/status...');
    const { data, error } = await supabase.from('_non_existent_table_').select('*').limit(1);

    // A 401/403 or even a "table not found" (404/400) from the API means we connected to the API.
    // If it's a network error, we'll see a fetch error.

    if (error) {
        console.log('Response received (may be an error, but confirms API connection):');
        console.log('Status:', error.code, error.message);
        if (error.message.includes('fetch')) {
            console.error('❌ Network/Fetch error. Check your internet or Supabase URL.');
        } else {
            console.log('✅ API Connection working (received specific Supabase error).');
        }
    } else {
        console.log('✅ Connection successful! (Table exists?)', data);
    }
}

main();
