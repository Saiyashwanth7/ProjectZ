// Attach event listeners for input, button, voice, and image upload
document.getElementById("message-input").addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault(); // Prevent newline on Enter key
        sendMessage();
    }
});

document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("voice-btn").addEventListener("click", startVoiceRecognition);
document.getElementById("image-input").addEventListener("change", sendImage);

// New: Clear chat functionality
document.getElementById("clear-chat").addEventListener("click", function() {
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML = `
        <div class="message bot-message welcome-message">
            <div class="message-content">
                <p>Hello! 👋 I'm Coral, your intelligent assistant. How can I help you today?</p>
            </div>
        </div>
    `;
});

// Function to send the user's message to the server
function sendMessage() {
    const messageInput = document.getElementById("message-input");
    const userMessage = messageInput.value.trim();
    const loadingIndicator = document.getElementById("loading");

    if (userMessage !== "") {
        // Add user's message to the chat
        addMessage(userMessage, "user-message");
        messageInput.value = ""; // Clear the input field
        loadingIndicator.style.display = "flex"; // Show loading

        // Send the user message to the Flask backend
        fetch('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userMessage })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            loadingIndicator.style.display = "none"; // Hide loading
            if (data.response) {
                addMessage(data.response, "bot-message");
            } else {
                addMessage("Sorry, I encountered an error. Please try again.", "bot-message");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadingIndicator.style.display = "none"; // Hide loading
            addMessage("Sorry, I encountered an error. Please try again.", "bot-message");
        });
    }
}

// Function to add a message to the chat box
function addMessage(content, className) {
    const chatBox = document.querySelector(".chat-box");
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", className);
    messageDiv.innerHTML = `<div class="message-content">${content}</div>`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
}

// Voice recognition using Web Speech API
function startVoiceRecognition() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        addMessage("Listening...", "bot-message");
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        addMessage(transcript, "user-message");

        // Send the voice transcript to the Flask backend
        fetch('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: transcript })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.response) {
                addMessage(data.response, "bot-message");
            } else {
                addMessage("Sorry, I encountered an error. Please try again.", "bot-message");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage("Sorry, I encountered an error. Please try again.", "bot-message");
        });
    };

    recognition.onerror = function(event) {
        addMessage("Voice recognition error. Please try again.", "bot-message");
    };

    recognition.start();
}

// Function to send an image to the server
function sendImage() {
    const imageInput = document.getElementById("image-input");
    const file = imageInput.files[0];
    const loadingIndicator = document.getElementById("loading");
    
    if (file) {
        const formData = new FormData();
        formData.append("image", file);
        loadingIndicator.style.display = "flex"; // Show loading

        fetch('/upload_image', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            loadingIndicator.style.display = "none"; // Hide loading
            if (data.tags && data.colors) {
                addMessage(`Tags: ${data.tags.join(', ')}`, "bot-message");
                addMessage(`Colors: ${data.colors.join(', ')}`, "bot-message");
            } else {
                addMessage("Sorry, I encountered an error processing the image. Please try again.", "bot-message");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            loadingIndicator.style.display = "none"; // Hide loading
            addMessage("Sorry, I encountered an error processing the image. Please try again.", "bot-message");
        });
    }
}
