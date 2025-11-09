A lightweight ChatGPT-like UI clone for a user experience case study.

Files:
- app.py - Flask server
- templates/index.html - Main UI
- static/css/style.css - Styles
- static/js/app.js - Frontend logic
- requirements.txt - Python dependencies

Run:
1. python3 -m venv venv
2. source venv/bin/activate
3. pip install -r requirements.txt
4. FLASK_APP=app.py flask run

Notes:
- This is a demo UI only; no real OpenAI integration included.
- Extend app.py to add backend AI calls or persistence.