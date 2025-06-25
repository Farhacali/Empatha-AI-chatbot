// frontend/script.js
const socket = io('http://localhost:5000'); // Change this if your backend runs on another host

const messagesContainer = document.querySelector('.messages');
const input = document.createElement('input');
const sendBtn = document.createElement('button');

// Add basic chat input UI (if not already in your HTML)
input.type = 'text';
input.placeholder = 'Type your message...';
input.style.position = 'fixed';
input.style.bottom = '20px';
input.style.left = '340px';
input.style.width = '60%';
input.style.padding = '15px';
input.style.borderRadius = '10px';
input.style.border = 'none';
input.style.fontSize = '16px';
input.style.zIndex = 10;

sendBtn.innerText = 'Send';
sendBtn.style.position = 'fixed';
sendBtn.style.bottom = '20px';
sendBtn.style.right = '30px';
sendBtn.style.padding = '15px 25px';
sendBtn.style.background = '#764ba2';
sendBtn.style.color = '#fff';
sendBtn.style.border = 'none';
sendBtn.style.borderRadius = '10px';
sendBtn.style.cursor = 'pointer';
sendBtn.style.zIndex = 10;

document.body.appendChild(input);
document.body.appendChild(sendBtn);

const userId = '59b99db4cfa9a34dcd7885b6'; // Replace with actual user ID or dynamically assign

sendBtn.onclick = () => {
  const message = input.value.trim();
  if (message) {
    appendMessage('user', message);
    socket.emit('message', { message, userId });
    input.value = '';
    showTypingIndicator();
  }
};

socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('response', (data) => {
  removeTypingIndicator();
  appendMessage('ai', data.response, data.emotion, data.actions);
});

socket.on('reminder', (data) => {
  alert(`🔔 Reminder: ${data.message}`);
});

socket.on('error', (err) => {
  removeTypingIndicator();
  appendMessage('ai', 'Something went wrong. Please try again.');
  console.error(err);
});

function appendMessage(sender, text, emotion = null, actions = []) {
  const messageEl = document.createElement('div');
  messageEl.classList.add('message', sender);

  const tag = document.createElement('span');
  tag.classList.add('message-tag');
  if (emotion) tag.classList.add(`emotion-${emotion}`);
  tag.innerText = emotion || '';

  messageEl.innerText = text;
  messageEl.appendChild(tag);

  if (sender === 'ai' && actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.classList.add('actions-container');
    actions.forEach(act => {
      const a = document.createElement('div');
      a.classList.add('action-item');
      a.classList.add(act.success ? 'action-success' : 'action-error');
      a.innerText = `${act.action}: ${act.success ? '✅' : `❌ (${act.error})`}`;
      actionsEl.appendChild(a);
    });
    messageEl.appendChild(actionsEl);
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
  removeTypingIndicator();
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typing';
  typing.innerHTML = `
    <div>Empatha is thinking</div>
    <div class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  messagesContainer.appendChild(typing);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
  const existing = document.getElementById('typing');
  if (existing) existing.remove();
}
