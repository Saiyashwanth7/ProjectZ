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

// Function to parse and structure response
function parseResponse(response) {
    // Check if response is already an object, if not, wrap it
    const resp = typeof response === 'string' ? { content: response } : response;

    // Default structure
    const structure = {
        title: resp.title || '',
        content: resp.content || resp,
        sections: resp.sections || [],
        conclusion: resp.conclusion || '',
        note: resp.note || ''
    };

    return structure;
}

// Function to render structured response
function renderStructuredResponse(responseObj) {
    let responseHTML = '';

    // Title
    if (responseObj.title) {
        responseHTML += `<h3 class="response-title">${responseObj.title}</h3>`;
    }

    // Main content
    if (responseObj.content) {
        responseHTML += `<p class="response-content">${responseObj.content}</p>`;
    }

    // Sections
    if (responseObj.sections && responseObj.sections.length > 0) {
        responseHTML += '<div class="response-sections">';
        responseObj.sections.forEach((section, index) => {
            responseHTML += `
                <div class="response-section">
                    <h4 class="section-title">• ${section.title || `Section ${index + 1}`}</h4>
                    <p class="section-content">${section.content}</p>
                </div>
            `;
        });
        responseHTML += '</div>';
    }

    // Conclusion
    if (responseObj.conclusion) {
        responseHTML += `<p class="response-conclusion"><strong>In summary:</strong> ${responseObj.conclusion}</p>`;
    }

    // Note
    if (responseObj.note) {
        responseHTML += `<p class="response-note"><em>Note: ${responseObj.note}</em></p>`;
    }

    return responseHTML;
}

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
                const parsedResponse = parseResponse(data.response);
                const formattedResponse = renderStructuredResponse(parsedResponse);
                addMessage(formattedResponse, "bot-message");
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

// Rest of the code remains the same (voice recognition and image upload functions)
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
                const parsedResponse = parseResponse(data.response);
                const formattedResponse = renderStructuredResponse(parsedResponse);
                addMessage(formattedResponse, "bot-message");
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
                const imageResponse = {
                    title: 'Image Analysis',
                    content: 'I analyzed the uploaded image and found the following details:',
                    sections: [
                        {
                            title: 'Image Tags',
                            content: data.tags.join(', ')
                        },
                        {
                            title: 'Dominant Colors',
                            content: data.colors.join(', ')
                        }
                    ],
                    note: 'Image analysis is based on machine learning detection.'
                };
                
                const formattedResponse = renderStructuredResponse(imageResponse);
                addMessage(formattedResponse, "bot-message");
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