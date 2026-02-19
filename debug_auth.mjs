import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://pgxfkxjltafnkuafkact.supabase.co', 'sb_publishable_RBGcYtaIBxfJ-tTzDuai2g_u_tYVb0P');

async function debugAuth() {
    try {
        console.log('--- Testing query as Anon ---');
        const pinToTest = '19841984';
        const { data, error } = await supabase
            .from('operator_access')
            .select('*')
            .eq('pin', pinToTest)
            .single();

        if (error) {
            console.error('Query Error:', error.message);
            console.error('Full error:', JSON.stringify(error, null, 2));
        } else if (!data) {
            console.log('No data found for PIN:', pinToTest);
        } else {
            console.log('Match found for PIN:', pinToTest);
            console.log('Data:', JSON.stringify(data, null, 2));
        }

        console.log('\n--- Listing all operators as Anon ---');
        const { data: all, error: allErr } = await supabase.from('operator_access').select('id, label, pin');
        if (allErr) {
            console.error('All Error:', allErr.message);
        } else {
            console.log('Visible operators:', JSON.stringify(all, null, 2));
        }

    } catch (err) {
        console.error('Script error:', err);
    } finally {
        process.exit(0);
    }
}

debugAuth();
