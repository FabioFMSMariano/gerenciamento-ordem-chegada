import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env.local');

let supabaseUrl = '';
let supabaseKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
        if (line.startsWith('VITE_SUPABASE_URL=')) {
            supabaseUrl = line.split('=')[1].trim();
        }
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
            supabaseKey = line.split('=')[1].trim();
        }
    }
} catch (err) {
    console.error('Error reading .env.local:', err.message);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLabel() {
    console.log('--- Diagnostic Update ---');

    // 1. First, let's find the exact record
    const { data: records, error: fetchError } = await supabase
        .from('operator_access')
        .select('*')
        .ilike('label', '%Terminal%Principal%');

    if (fetchError) {
        console.error('Fetch error:', fetchError.message);
        return;
    }

    if (!records || records.length === 0) {
        console.log('No record found matching "%Terminal%Principal%"');
        return;
    }

    console.log('Record found:', JSON.stringify(records[0], null, 2));
    const recordId = records[0].id;

    // 2. Attempt update by ID
    console.log(`Attempting to update record ID: ${recordId}...`);
    const { data: updated, error: updateError } = await supabase
        .from('operator_access')
        .update({ label: 'BEMOL TORRES' })
        .eq('id', recordId)
        .select();

    if (updateError) {
        console.error('Update error:', updateError.message);
    } else if (updated && updated.length > 0) {
        console.log('SUCCESS! Updated record:', JSON.stringify(updated[0], null, 2));
    } else {
        console.log('Update failed: No rows returned. This strictly confirms RLS blocks the update or the record disappeared.');
    }
}

updateLabel();
