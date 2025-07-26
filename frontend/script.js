// Connects to the same origin where your app is hosted
/*const socket = io();

// Chat input and button creation
const messagesContainer = document.querySelector('.messages');
const input = document.createElement('input');
const sendBtn = document.createElement('button');

// Style the input
input.type = 'text';
input.placeholder = 'Type your message...';
Object.assign(input.style, {
  position: 'fixed',
  bottom: '20px',
  left: '340px',
  width: '60%',
  padding: '15px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '16px',
  zIndex: 10
});

// Style the send button
sendBtn.innerText = 'Send';
Object.assign(sendBtn.style, {
  position: 'fixed',
  bottom: '20px',
  right: '30px',
  padding: '15px 25px',
  background: '#764ba2',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  zIndex: 10
});

document.body.appendChild(input);
document.body.appendChild(sendBtn);

const userId = '59b99db4cfa9a34dcd7885b6'; // Replace or dynamically set

sendBtn.onclick = () => {
  const message = input.value.trim();
  if (!message) return;
  appendMessage('user', message);
  socket.emit('message', { message, userId });
  input.value = '';
  showTypingIndicator();
};

socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
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
  messageEl.className = `message ${sender}`;
  messageEl.innerHTML = `<div>${text}</div>`;

  if (emotion) {
    const tag = document.createElement('span');
    tag.className = `message-tag emotion-${emotion}`;
    tag.innerText = emotion;
    messageEl.appendChild(tag);
  }

  if (sender === 'ai' && actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'actions-container';
    actions.forEach(act => {
      const a = document.createElement('div');
      a.className = `action-item ${act.success ? 'action-success' : 'action-error'}`;
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
  typing.id = 'typing';
  typing.className = 'typing-indicator';
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
  const typing = document.getElementById('typing');
  if (typing) typing.remove();
}
