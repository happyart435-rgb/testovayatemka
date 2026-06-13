import os
import requests
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
application = app  # Это нужно для Vercel
CORS(app)

# Инициализация Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
CRYPTO_PAY_TOKEN = os.environ.get("CRYPTO_PAY_TOKEN")
BOT_TOKEN = os.environ.get("BOT_TOKEN")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL else None

def update_user_balance(uid, amount, currency='stars'):
    if not supabase: return
    user = supabase.table('users').select("*").eq('user_id', uid).execute()
    
    if user.data:
        current = user.data[0]
        if currency == 'stars':
            new_val = int(current.get('stars', 0)) + amount
            supabase.table('users').update({"stars": new_val}).eq('user_id', uid).execute()
        else: # TON
            new_val = float(current.get('balance', 0.0)) + float(amount)
            # ИСПРАВЛЕНА СКОБКА ТУТ:
            supabase.table('users').update({"balance": round(new_val, 2)}).eq('user_id', uid).execute()

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
        return jsonify({"result": {"pay_url": resp['result']['bot_invoice_url']}}), 200
    return jsonify({"error": "Failed"}), 400

@app.route('/api/create_stars_pay', methods=['POST'])
def create_stars_pay():
    data = request.get_json() or {}
    uid = str(data.get('user_id'))
    amount = int(data.get('amount', 0))
    if amount < 50: return jsonify({"ok": False}), 400
    
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/createInvoiceLink"
    payload = {
        "title": "Пополнение",
        "description": f"Покупка {amount} звезд",
        "payload": f"{uid}_{uuid.uuid4().hex[:8]}",
        "currency": "XTR",
        "prices": [{"label": "Stars", "amount": amount}]
    }
    r = requests.post(url, json=payload).json()
    if not r.get('ok'): return jsonify({"ok": False}), 400
    return jsonify({"result": {"url": r['result']}}), 200

@app.route('/api/stars-webhook', methods=['POST'])
def stars_webhook():
    update = request.get_json()
    if update and 'message' in update and 'successful_payment' in update['message']:
        pay = update['message']['successful_payment']
        uid = pay['invoice_payload'].split('_')[0]
        update_user_balance(uid, pay['total_amount'], 'stars')
    return "OK", 200
