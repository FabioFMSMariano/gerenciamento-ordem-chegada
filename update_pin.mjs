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
        if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
    }
} catch (err) {
    console.error('Error reading .env.local:', err.message);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePin() {
    const targetLabel = process.argv[2] || 'TERMINAL';
    const newPin = process.argv[3] || '1984@1984';

    try {
        console.log(`Searching for operator matching: "${targetLabel}"...`);
        const { data, error } = await supabase.from('operator_access').select('*');
        if (error) throw error;

        const target = data.find(o => o.label && o.label.toUpperCase().includes(targetLabel.toUpperCase()));

        if (!target) {
            console.error(`Operator "${targetLabel}" not found.`);
            console.log('Available operators:', data.map(o => o.label).join(', '));
            return;
        }

        console.log(`Updating PIN for ${target.label} (ID: ${target.id}) to "${newPin}"...`);
        const { error: updateError } = await supabase
            .from('operator_access')
            .update({ pin: newPin })
            .eq('id', target.id);

        if (updateError) {
            console.error('Update failed:', updateError.message);
        } else {
            console.log('PIN updated successfully!');
        }
    } catch (err) {
        console.error('Script error:', err.message);
    } finally {
        process.exit(0);
    }
}

updatePin();
