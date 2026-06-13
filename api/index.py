import os
import requests
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)

# Инициализация
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
CRYPTO_PAY_TOKEN = os.environ.get("CRYPTO_PAY_TOKEN")
BOT_TOKEN = os.environ.get("BOT_TOKEN")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

@app.route('/api/create_pay', methods=['POST'])
def create_pay():
    data = request.get_json() or {}
    uid = str(data.get('user_id'))
    amount = float(data.get('amount', 0))
    
    r = requests.post("https://pay.crypt.bot/api/createInvoice", 
        json={"asset": "TON", "amount": f"{amount:.2f}", "payload": uid},
        headers={"Crypto-Pay-API-Token": CRYPTO_PAY_TOKEN})
    
    resp = r.json()
    if r.status_code == 200 and resp.get('ok'):
        return jsonify({"result": {"pay_url": resp['result']['pay_url']}}), 200
    return jsonify({"error": "Failed to create invoice"}), 400

@app.route('/api/create_stars_pay', methods=['POST'])
def create_stars_pay():
    data = request.get_json() or {}
    uid = str(data.get('user_id'))
    amount = int(data.get('amount', 0))
    
    if amount < 50:
        return jsonify({"ok": False, "description": "Минимум 50 звезд"}), 400
    
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink"
    unique_payload = f"{uid}_{uuid.uuid4().hex[:8]}"
    
    payload = {
        "title": "Пополнение баланса",
        "description": f"Покупка {amount} звезд",
        "payload": unique_payload,
        "currency": "XTR",
        "prices": [{"label": "Stars", "amount": amount}]
    }
    
    try:
        r = requests.post(url, json=payload)
        resp = r.json()
        
        if not resp.get('ok'):
            print(f"TELEGRAM API ERROR: {resp}")
            return jsonify({"ok": False, "description": resp.get('description', 'Telegram API Error')}), 400
            
        return jsonify({"result": {"url": resp['result']}}), 200
    except Exception as e:
        return jsonify({"ok": False, "description": str(e)}), 500

# Webhooks для обработки оплаты (сюда Telegram присылает уведомления)
@app.route('/api/crypto-webhook', methods=['POST'])
def crypto_webhook():
    # Здесь нужно проверять подпись (X-Crypto-Pay-Signature)
    return "OK", 200

@app.route('/api/stars-webhook', methods=['POST'])
def stars_webhook():
    # Telegram присылает сюда информацию об оплате
    # В идеале здесь нужно обновлять баланс в Supabase
    return "OK", 200

if __name__ == '__main__':
    app.run()
