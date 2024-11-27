const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { instrument } = require('@socket.io/admin-ui');

// Set up views and static files
app.set('views', path.join(__dirname, '../client/views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../client/public')));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*', // Temporarily allowing all origins for debugging
        methods: ['GET', 'POST'],
    },
});

// Add the private network header manually
io.engine.on('initial_headers', (headers) => {
    headers['Access-Control-Allow-Private-Network'] = 'true';
});

// Enable Admin UI
instrument(io, {
    auth: false, // Disable authentication for local testing
});

// Handle Socket.IO events
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('send-message', (message, room) => {
        if (room === '') {
            socket.broadcast.emit('received-message', message);
        } else {
            socket.to(room).emit('received-message', message);
        }
    });

    socket.on('join-room', (room, cb) => {
        socket.join(room);
        cb(`Joined ${room}`);
    });
});

// Start the server
server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});

// Serve the home page
app.get('*', (req, res) => {
    res.render('home');
});
