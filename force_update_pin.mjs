import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pgxfkxjltafnkuafkact.supabase.co', 'sb_publishable_RBGcYtaIBxfJ-tTzDuai2g_u_tYVb0P');

async function forceUpdatePin() {
    const targetLabel = 'Terminal Principal';
    const newPin = '19841984';

    console.log(`Attempting to update PIN for "${targetLabel}" to "${newPin}"...`);

    const { data, error, status, statusText } = await supabase
        .from('operator_access')
        .update({ pin: newPin })
        .eq('label', targetLabel)
        .select();

    if (error) {
        console.error('Update Error:', error.message);
        console.error('Status:', status, statusText);
        console.error('Details:', JSON.stringify(error, null, 2));
    } else if (!data || data.length === 0) {
        console.error('Update failed: No rows were updated. This usually means the record was not found or RLS policies blocked the update.');

        // Check if record exists
        const { data: exist } = await supabase.from('operator_access').select('*').eq('label', targetLabel);
        if (exist && exist.length > 0) {
            console.log('Record exists but was NOT updated. Check RLS policies.');
        } else {
            console.log('Record with label "' + targetLabel + '" NOT FOUND.');
        }
    } else {
        console.log('Update successful!');
        console.log('Updated Record:', JSON.stringify(data[0], null, 2));
    }
    process.exit(0);
}

forceUpdatePin();
