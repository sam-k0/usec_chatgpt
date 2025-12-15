A lightweight ChatGPT-like UI clone for a user experience case study.

Files:
- app.py - Flask server
- templates/index.html - Main UI
- static/css/style.css - Styles
- static/js/app.js - Frontend logic
- requirements.txt - Python dependencies

# Install

1. Make sure you have a venv selected (tested with Python 3.12).
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the root directory with your Ollama server URL (contact me for access):

   ```
   OLLAMA_URL = 'https://ollama.PLACEHOLDERDOMAIN.XXX'
   ```
4. Run from terminal:

   ```bash
   python app.py
   ```
5. Open your browser and navigate to `http://127.0.0.1:5000` (Will be shown in terminal output).


# Usage

- Every time the app is stopped, the conversation history is lost.
- To save conversations, use the "Chat speichern" button, and input the participants' ID when prompted.
- Saved conversations are stored in the `archives` directory.