// В начало файла добавь инициализацию клиента
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('ТВОЙ_URL_SUPABASE', 'ТВОЙ_СЕРВИСНЫЙ_КЛЮЧ');

app.post('/api/crypto-webhook', async (req, res) => {
    // Получаем данные из присланного ботом уведомления
    // В CryptoPay структура данных выглядит так:
    const update = req.body;
    
    if (update.status === 'paid') {
        const userId = update.payload; // То, что ты передавал при создании инвойса
        const paidAmount = update.amount;

        try {
            // 1. Сначала берем текущий баланс
            const { data: user, error: fetchErr } = await supabase
                .from('users')
                .select('balance')
                .eq('user_id', userId)
                .single();

            if (fetchErr) throw fetchErr;

            // 2. Добавляем к текущему балансу пришедшую сумму
            const newBalance = parseFloat(user.balance) + parseFloat(paidAmount);

            // 3. Обновляем в базе
            await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('user_id', userId);

            console.log(`Баланс юзера ${userId} обновлен на ${paidAmount}`);
        } catch (err) {
            console.error("Ошибка обновления базы:", err);
            return res.status(500).send('Database Error');
        }
    }

    res.status(200).send('OK');
});
