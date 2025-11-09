from flask import Flask, render_template, request, jsonify
import re
import time

app = Flask(__name__)

# Simple in-memory message store (cleared on restart)
# For a real application, replace with persistent storage (database).
MESSAGES = []


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

    # Generate a placeholder assistant response. Replace this block with an
    # actual AI call when integrating a model or external API.
    reply_text = f"Echo: {message}"
    # For demo purposes, propagate the privacy flag to the assistant note
    # so the UI can show the same indicator on the assistant reply if
    # necessary. In practice you may want different rules.
    ai_msg = {'role': 'assistant', 'text': reply_text, 'ts': time.time(), 'privacy': privacy_flag}
    MESSAGES.append(ai_msg)

    # Return the assistant message so the frontend can update optimistically.
    return jsonify(ai_msg), 201


if __name__ == '__main__':
    # Start Flask development server. Set debug=False for production.
    app.run(debug=True)
