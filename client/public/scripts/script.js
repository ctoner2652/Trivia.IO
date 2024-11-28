import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';

const joinRoomButton = document.getElementById('room-button');

const messageInput = document.getElementById('message-input');

const roomInput = document.getElementById('room-input');
const form = document.getElementById('form');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    displayMessage(`You connected with ID: ${socket.id} `)
});
socket.on('recieved-message', message => {
    displayMessage(message);
})
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    const room = roomInput.value;
    if (message === '') return;
    displayMessage(message);
    console.log('Sending message:', message);
    socket.emit('send-message', message, room);

    messageInput.value = "";
})

joinRoomButton.addEventListener('click' , () => {
    const room = roomInput.value;
    socket.emit('join-room', room, message => {
        displayMessage(message);
    });
})

function displayMessage(message) {
    const div = document.createElement('div');
    div.textContent = message;
    document.getElementById('message-container').append(div);
}

