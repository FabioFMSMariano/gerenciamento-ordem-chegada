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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    const { data, error } = await supabase
        .from('operator_access')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Table Content:', JSON.stringify(data, null, 2));
    }
}

checkTable();
