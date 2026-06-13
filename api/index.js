const { createClient } = require('@supabase/supabase-js');
// Замени на свои реальные ключи, если они еще не в переменных окружения
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;

        // Если пришла успешная оплата "Звездами" (Telegram Stars)
        if (update.message?.successful_payment) {
            const userId = update.message.from.id;
            const amount = update.message.successful_payment.total_amount; 

            try {
                // 1. Получаем текущий баланс пользователя
                const { data: user } = await supabase
                    .from('users')
                    .select('stars')
                    .eq('user_id', userId)
                    .single();

                // 2. Обновляем баланс в базе
                await supabase
                    .from('users')
                    .update({ stars: (user.stars || 0) + amount })
                    .eq('user_id', userId);

                return res.status(200).send('OK');
            } catch (err) {
                return res.status(500).send('Database Error');
            }
        }
    }
    res.status(200).send('Webhook Received');
}
