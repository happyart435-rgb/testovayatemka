import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    const update = req.body;

    // 1. Если пришла оплата Звездами
    if (update.message?.successful_payment) {
        const userId = update.message.from.id;
        const starsAmount = update.message.successful_payment.total_amount;
        
        await supabase.from('users').upsert({ user_id: userId, stars: starsAmount }, { onConflict: 'user_id' });
        return res.status(200).send('OK');
    }

    // 2. Если пришла оплата TON (твой старый код)
    if (update.status === 'paid') {
        const userId = update.payload;
        const sum = parseFloat(update.amount);
        await supabase.from('users').upsert({ user_id: userId, ton_balance: sum }, { onConflict: 'user_id' });
    }

    return res.status(200).send('OK');
}
