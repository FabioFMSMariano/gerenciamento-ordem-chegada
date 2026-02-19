import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pgxfkxjltafnkuafkact.supabase.co', 'sb_publishable_RBGcYtaIBxfJ-tTzDuai2g_u_tYVb0P');

async function updatePin() {
    try {
        const { error } = await supabase
            .from('operator_access')
            .update({ pin: '19841984' })
            .eq('label', 'Terminal Principal');

        if (error) {
            console.error('Error updating PIN:', error);
        } else {
            console.log('PIN updated successfully to 19841984');
        }
    } catch (err) {
        console.error('Script error:', err);
    } finally {
        process.exit(0);
    }
}

updatePin();
