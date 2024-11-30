const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { instrument } = require('@socket.io/admin-ui');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const users = {};
// Set up views and static files
app.set('views', path.join(__dirname, '../client/views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../client/public')));
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*', // Temporarily allowing all origins for debugging
        methods: ['GET', 'POST'],
    },
});

const sessionMiddleware = session({
    secret: 'your-secret-key', // Replace with a secure secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Use `secure: true` in production with HTTPS
});

// Use the session middleware in Express
app.use(sessionMiddleware);

// Share the session with Socket.IO
io.use(sharedSession(sessionMiddleware, {
    autoSave: true, // Automatically save session changes
}));

io.engine.use((req, res, next) => {
    sessionMiddleware(req, res, next);
});

const triviaQuestions = [
    { question: 'What is the capital of France?', options: ['Paris', 'London', 'Berlin', 'Madrid'], answer: 'Paris' },
    { question: 'Which planet is closest to the sun?', options: ['Venus', 'Mars', 'Mercury', 'Earth'], answer: 'Mercury' },
    { question: 'Who wrote "Hamlet"?', options: ['Shakespeare', 'Dickens', 'Hemingway', 'Tolkien'], answer: 'Shakespeare' },
];

let currentQuestionIndex = 0;
let gameTimer = null;

// Handle Socket.IO events
io.on('connection', (socket) => {
    console.log('Session on connection:', socket.request.session);

    if (currentQuestionIndex === 0) {
        startGame();
    }
    const username = socket.request.session.username;
    if (!username) {
        console.log('Connection without username, disconnecting socket');
        socket.disconnect();
        return;
    }
    users[socket.id] = username;
    socket.on('get-username', (cb) => {
        cb(username);
    })
    
    socket.on('submit-answer', (answer) => {
        const currentQuestion = triviaQuestions[currentQuestionIndex];
        const isCorrect = answer === currentQuestion.answer;
        console.log(`Player ${socket.id} answered ${answer}: ${isCorrect ? 'Correct' : 'Incorrect'}`);
    });
    socket.on('send-message', (message) => {
        const name = users[socket.id];
        console.log(`${name}: ${message}`);
        socket.broadcast.emit('received-message', { name, message });
    });
});

const startGame = () => {
    sendQuestion();
};

const sendQuestion = () => {
    if (currentQuestionIndex >= triviaQuestions.length) {
        console.log('Game over!');
        io.emit('game-over');
        return;
    }

    const currentQuestion = triviaQuestions[currentQuestionIndex];
    io.emit('new-question', currentQuestion);

    let timeLeft = 15;
    gameTimer = setInterval(() => {
        timeLeft--;
        io.emit('update-timer', timeLeft);

        if (timeLeft <= 0) {
            clearInterval(gameTimer);
            io.emit('question-ended', {
                correctAnswer: currentQuestion.answer,
            });

            // Move to the next question after a 5-second pause
            setTimeout(() => {
                currentQuestionIndex++;
                sendQuestion();
            }, 5000);
        }
    }, 1000);
};
// Start the server
server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});



app.post('/game', (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.redirect('/');
    }

    req.session.username = name.trim();
    console.log('Session after setting username:', req.session); // Debugging log
    // Save the session before redirecting
    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.redirect('/');
        }
        res.redirect('/game');
    });
});


app.get('/game', (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.redirect('/');
    }

    res.render('game', { username });
});


app.get('*', (req, res) => {
    res.render('home');
});