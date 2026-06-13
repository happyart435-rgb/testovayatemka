import os, requests
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
    
    return jsonify(r.json()), r.status_code

@app.route('/api/create_stars_pay', methods=['POST'])
def create_stars_pay():
    data = request.get_json() or {}
    uid = str(data.get('user_id'))
    amount = int(data.get('amount', 0))
    
    # Telegram требует минимум 50 для инвойса
    if amount < 50:
        return jsonify({"ok": False, "description": "Min amount is 50"}), 400
    
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink"
    payload = {
        "title": "Stars Topup",
        "description": f"Пополнение {amount} звезд",
        "payload": uid,
        "currency": "XTR",
        "prices": [{"label": "Stars", "amount": amount}]
    }
    
    r = requests.post(url, json=payload)
    resp = r.json()
    
    # Если упало - пишем в логи Vercel причину
    if not resp.get('ok'):
        print(f"TELEGRAM API ERROR: {resp}")
        
    return jsonify(resp), r.status_code

@app.route('/api/crypto-webhook', methods=['POST'])
def crypto_webhook():
    return "OK", 200

@app.route('/api/stars-webhook', methods=['POST'])
def stars_webhook():
    return "OK", 200

if __name__ == '__main__': app.run()
