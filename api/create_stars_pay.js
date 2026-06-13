const axios = require('axios');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { user_id, amount } = req.body;
    const BOT_TOKEN = process.env.BOT_TOKEN;

    try {
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
            title: "Пополнение баланса",
            description: "Покупка звезд в NowearSpin",
            payload: user_id.toString(),
            currency: "XTR",
            prices: [{ label: "Звезды", amount: amount }]
        });

        return res.status(200).json({ pay_url: response.data.result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Не удалось создать инвойс" });
    }
}
