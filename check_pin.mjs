import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pgxfkxjltafnkuafkact.supabase.co', 'sb_publishable_RBGcYtaIBxfJ-tTzDuai2g_u_tYVb0P');

async function checkPin() {
    try {
        const { data, error } = await supabase.from('operator_access').select('*').eq('label', 'Terminal Principal');
        if (error) {
            console.error('Error:', error);
            return;
        }
        if (data && data.length > 0) {
            const pin = data[0].pin;
            console.log('PIN VALUE:', pin);
            console.log('PIN LENGTH:', pin.length);
            console.log('IS EXACT MATCH:', pin === '1984@1984');
        } else {
            console.log('Terminal Principal not found');
        }
    } catch (err) {
        console.error('Diagnostic error:', err);
    } finally {
        process.exit(0);
    }
}

checkPin();
