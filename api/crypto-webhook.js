import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(200).send('OK');

    const update = req.body;

    // 1. ЛОГИКА ДЛЯ TELEGRAM STARS
    if (update.message?.successful_payment) {
        const userId = update.message.from.id;
        const starsAmount = update.message.successful_payment.total_amount; // Сумма звезд

        try {
            const { data: user } = await supabase
                .from('users')
                .select('stars')
                .eq('user_id', userId)
                .single();

            await supabase
                .from('users')
                .upsert({ 
                    user_id: userId, 
                    stars: (user?.stars || 0) + starsAmount 
                }, { onConflict: 'user_id' });
            
            return res.status(200).send('OK');
        } catch (err) {
            console.error("Ошибка Stars:", err);
            return res.status(500).send('Error');
        }
    }

    // 2. ЛОГИКА ДЛЯ CRYPTOBOT (TON)
    if (update.status === 'paid') {
        const userId = update.payload;
        const sum = parseFloat(update.amount);

        try {
            const { data: user } = await supabase
                .from('users')
                .select('ton_balance')
                .eq('user_id', userId)
                .single();

            await supabase
                .from('users')
                .upsert({ 
                    user_id: userId, 
                    ton_balance: (user?.ton_balance || 0) + sum 
                }, { onConflict: 'user_id' });
        } catch (err) {
            console.error("Ошибка TON:", err);
        }
        return res.status(200).send('OK');
    }

    return res.status(200).send('OK');
}
