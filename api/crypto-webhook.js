import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Инициализация Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Разрешаем только POST запросы от CryptoBot
    if (req.method !== 'POST') {
        return res.status(200).json({ message: "Webhook is active. Send POST request from CryptoBot." });
    }

    try {
        // 1. ПРОВЕРКА ПОДПИСИ (Безопасность)
        const signature = req.headers['crypto-pay-api-signature'];
        const apiSecret = crypto.createHash('sha256').update(process.env.CRYPTO_BOT_TOKEN).digest();
        const check = crypto.createHmac('sha256', apiSecret).update(JSON.stringify(req.body)).digest('hex');
        
        console.log("Получен вебхук:", req.body);

        if (signature !== check) {
            console.error("ВНИМАНИЕ: Попытка неавторизованного доступа!");
            return res.status(401).send('Unauthorized');
        }

        const { status, payload, amount, asset } = req.body;

        // 2. Обработка успешного платежа
        if (status === 'paid' && asset === 'TON') {
            const userId = String(payload); 
            const sum = parseFloat(amount);
            
            console.log(`Процесс зачисления: ${sum} ${asset} для юзера ${userId}`);

            // Получаем текущий баланс юзера
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('ton_balance')
                .eq('user_id', userId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error("Ошибка поиска юзера:", fetchError);
                throw fetchError;
            }

            // Считаем новый баланс
            const currentBalance = user?.ton_balance || 0;
            const newBalance = currentBalance + sum;

            // Обновляем или создаем запись (upsert)
            const { error: updateError } = await supabase
                .from('users')
                .upsert({ 
                    user_id: userId, 
                    ton_balance: newBalance 
                }, { onConflict: 'user_id' });

            if (updateError) {
                console.error("Ошибка при обновлении баланса:", updateError);
                throw updateError;
            }
            
            console.log(`УСПЕХ! Баланс юзера ${userId} теперь: ${newBalance} TON`);
        }

        // ОТВЕТ ДЛЯ КРИПТОБОТА (Обязательно 200 OK)
        return res.status(200).send('OK');

    } catch (err) {
        console.error("Критическая ошибка вебхука:", err.message);
        // Возвращаем 200, чтобы CryptoBot не спамил повторными запросами при внутренних ошибках базы
        return res.status(200).send('Processed with error');
    }
}
