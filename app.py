from flask import Flask, render_template, request, jsonify
import os
import re
import time
import requests
import json
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

OLLAMA_URL = os.getenv('OLLAMA_URL')
OLLAMA_MODEL = 'gemma3:27b'
MESSAGES = []
SYSTEM_PROMPT = """
 You are a helpful assistant for text writing.
 Please do not use markdown or formatting like asteriks for bold text in your response as the webinterface rendering the messages cannot deal with it.
 The only formatting you are allowed to do is using line breaks to structure your answer into paragraphs, or using numbered or bulleted lists, which also need linebreaks to be added manually.
 Answer in the language that the user speaks to you, this will most likely be German or English.
 """

# How many past messages to include when building conversation history
MAX_HISTORY_MESSAGES = 99
# If True, redact privacy-flagged messages before sending to the model
REDACT_PRIVACY = False


ollama_llm = ChatOllama(base_url=OLLAMA_URL,model=OLLAMA_MODEL)

def call_ai_model(prompt: str) -> str:
    """Call the local Ollama model, including recent conversation history.

    We build a serialized prompt from the last `MAX_HISTORY_MESSAGES` in
    `MESSAGES`, optionally redacting messages flagged with `privacy`.
    The serialized prompt is passed as a single HumanMessage to
    `ollama_llm.generate` to keep compatibility with the ChatOllama API.
    """

    # Build conversation history (most recent last)
    history = MESSAGES[-MAX_HISTORY_MESSAGES:]

    parts = []
    # Optional system instruction (tweak as needed)
    parts.append(f"System: {SYSTEM_PROMPT}")

    for m in history:
        role = m.get('role', 'user')
        text = m.get('text', '')
        if REDACT_PRIVACY and m.get('privacy'):
            text = '[REDACTED]'
        # Normalize role names and append
        if role == 'user':
            parts.append(f"User: {text}")
        else:
            parts.append(f"Assistant: {text}")

    # Append the current prompt as the latest user message
    parts.append(f"User: {prompt}")
    parts.append("Assistant:")

    serialized = "\n".join(parts)

    # Call the ChatOllama generate API with a single conversation
    try:
        result = ollama_llm.generate([[HumanMessage(serialized)]])
    except Exception as e:
        # Graceful fallback: return an echo if generation fails
        return f"Error: Could not generate response: {e}"

    # Extract generated text from result structure
    gens = getattr(result, "generations", None)
    if gens and len(gens) > 0 and len(gens[0]) > 0:
        text = getattr(gens[0][0], "text", None)
        if text is not None:
            return text

    return ""


app = Flask(__name__)

@app.route('/')
def index():
    """Render the main chat UI.

    Returns:
        A rendered HTML page (`templates/index.html`).
    """
    return render_template('index.html')


@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Return the current conversation messages as JSON.

    This endpoint is used by the frontend to populate the chat history.
    Messages are returned in the order they were added.
    """
    return jsonify(MESSAGES)


@app.route('/api/messages', methods=['POST'])
def post_message():
    """Accept a user message, append it to the conversation, and return a reply.

    Expected JSON body: {"message": "..."}

    This function currently generates a placeholder reply by echoing the
    user's message. In a production integration, replace the echo logic with
    a call to an AI model (OpenAI, local LLM, etc.) and handle errors/timeouts.

    Returns:
        JSON of the assistant message and HTTP 201 on success,
        or JSON error with 400 if the input is invalid.
    """
    data = request.get_json() or {}
    message = data.get('message', '').strip()
    if not message:
        # Missing or empty message is a client error.
        return jsonify({'error': 'Message is required'}), 400

    # Basic privacy detection (example): flag if the message contains an
    # email address or a simple SSN-like pattern. This is a lightweight
    # placeholder — replace with a more robust policy/detection as needed.
    privacy_flag = False
    # simple email regex (very permissive)
    if re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", message):
        privacy_flag = True
    # simple SSN-like pattern (###-##-#### or #########)
    if re.search(r"\b\d{3}-?\d{2}-?\d{4}\b", message):
        privacy_flag = True

    # Record the user's message with a timestamp and optional privacy flag.
    user_msg = {'role': 'user', 'text': message, 'ts': time.time(), 'privacy': privacy_flag}
    MESSAGES.append(user_msg)

    

    reply_text = call_ai_model(message)
    # Propagate privacy flag to assistant message for UI indicator.
    ai_msg = {'role': 'assistant', 'text': reply_text, 'ts': time.time(), 'privacy': privacy_flag}
    MESSAGES.append(ai_msg)

    # Return the assistant message so the frontend can update optimistically.
    return jsonify(ai_msg), 201


@app.route('/api/save_conversation', methods=['POST'])
def save_conversation():
    """Save the current `MESSAGES` list to a timestamped JSON file and clear it.

    The file is written to an `archives/` directory located in the project root.
    Accepts an optional `conversation_id` in the JSON body to prefix the filename.
    Filename format: ID-[id]-YYYY-mm-dd-HH-MM-SS.json
    
    Returns 200 with the saved filename on success, or an error status on failure.
    """
    if not MESSAGES:
        return jsonify({'error': 'No messages to save'}), 400

    # Get optional conversation ID from request body
    data = request.get_json() or {}
    conversation_id = data.get('conversation_id', '').strip()

    # Ensure the archive directory exists
    archive_dir = os.path.join(os.getcwd(), 'archives')
    try:
        os.makedirs(archive_dir, exist_ok=True)
    except Exception as e:
        return jsonify({'error': f'Could not create archive directory: {e}'}), 500

    ts = datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    
    # Build filename with optional ID prefix
    if conversation_id:
        filename = os.path.join(archive_dir, f'ID-{conversation_id}-{ts}.json')
    else:
        filename = os.path.join(archive_dir, f'{ts}.json')

    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(MESSAGES, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return jsonify({'error': f'Failed to write archive file: {e}'}), 500

    # Clear conversation in memory
    MESSAGES.clear()

    return jsonify({'saved': filename}), 200


if __name__ == '__main__':
    # Start Flask development server. Set debug=False for production.
    app.run(debug=True)






