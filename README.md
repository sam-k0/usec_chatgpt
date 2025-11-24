A lightweight ChatGPT-like UI clone for a user experience case study.

Files:
- app.py - Flask server
- templates/index.html - Main UI
- static/css/style.css - Styles
- static/js/app.js - Frontend logic
- requirements.txt - Python dependencies

You will need a .env file with:
OLLAMA_URL = 'https://...' # Your Ollama server URL

Run:
1. python3 -m venv venv
2. source venv/bin/activate
3. pip install -r requirements.txt
4. python app.py