const axios = require('axios');

export default async function handler(req, res) {
    const { user_id, amount } = req.body;
    
    try {
        const response = await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/createInvoiceLink`, {
            title: "Пополнение баланса",
            description: "Покупка звезд",
            payload: user_id.toString(),
            currency: "XTR",
            prices: [{ label: "Звезды", amount: amount }]
        });
        
        // ВАЖНО: возвращаем именно строку, а не объект с полем result
        return res.status(200).json({ pay_url: response.data.result });
    } catch (error) {
        return res.status(500).json({ error: "Ошибка" });
    }
}
