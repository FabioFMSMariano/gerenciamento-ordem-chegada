import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pgxfkxjltafnkuafkact.supabase.co', 'sb_publishable_RBGcYtaIBxfJ-tTzDuai2g_u_tYVb0P');

async function updatePin() {
    try {
        console.log('Fetching operators...');
        const { data, error } = await supabase.from('operator_access').select('*');
        if (error) {
            console.error('Error fetching operators:', error);
            return;
        }
        console.log('Operators found:', JSON.stringify(data, null, 2));

        const terminal = data.find(o => o.label && o.label.toUpperCase().includes('PRINCIPAL'));
        if (!terminal) {
            console.log('Terminal Principal not found. Please verify the label.');
            return;
        }

        console.log(`Updating PIN for ${terminal.label} (ID: ${terminal.id})...`);
        const { error: updateError } = await supabase
            .from('operator_access')
            .update({ pin: '1984@1984' })
            .eq('id', terminal.id);

        if (updateError) {
            console.error('Error updating PIN:', updateError);
        } else {
            console.log('PIN updated successfully to 1984@1984');
        }
    } catch (err) {
        console.error('Script error:', err);
    } finally {
        process.exit(0);
    }
}

updatePin();
