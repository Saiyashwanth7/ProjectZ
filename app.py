from flask import Flask, render_template, request, jsonify
import cohere
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import cv2

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Load your Cohere API key from the environment variable
co = cohere.Client(os.getenv("COHERE_API_KEY"))

# Initialize a list to store chat history
chat_history = []

# Setup image upload folder
app.config['UPLOAD_FOLDER'] = 'uploads'

@app.route('/')
def home():
    global chat_history 
    chat_history = []
    return render_template('view.html')

# Define the /api route to handle POST requests
@app.route("/api", methods=["POST"])
def api():
    global chat_history  # Access the global chat_history variable

    # Get the message from the POST request
    user_message = request.json.get("message")

    # Add the user message to the chat history
    chat_history.append(f"You: {user_message}")

    # Create context for the model from chat history
    context = "\n".join(chat_history)

    try:
        # Send the context to Cohere's API and receive the response
        response = co.generate(
            model="command",
            prompt=context + "\nAssistant:",
            temperature=0.3,
            max_tokens=10000
        )

        # Extract the response content
        response_message = response.generations[0].text.strip()

        # Add the assistant response to the chat history
        chat_history.append(f"Assistant: {response_message}")

        return jsonify({"response": response_message})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"response": "Failed to generate response!"}), 500

# Endpoint to handle image upload
# Endpoint to handle image upload and processing
@app.route('/upload_image', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({"response": "No image uploaded!"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"response": "No selected file!"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    # Read and process the image
    image = cv2.imread(file_path)
    if image is None:
        return jsonify({"response": "Failed to read image!"}), 400

    # Simple image processing (detect edges using OpenCV)
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray_image, 100, 200)

    # Save the processed image
    processed_image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + filename)
    cv2.imwrite(processed_image_path, edges)

    return jsonify({"response": f"Image processed! Edges detected and saved as {processed_image_path}"})


if __name__ == '__main__':
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(debug=True)