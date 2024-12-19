const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const { v4: uuidv4 } = require('uuid'); 
const axios = require('axios');
const he = require('he');
const inactiveUsers = {}; 
const users = {};
const helmet = require('helmet');
const MongoStore = require('connect-mongo');
const Question = require('./models/Question');
const PORT = process.env.PORT || 3000;
const disconnectedUsers = {};
app.set('views', path.join(__dirname, '../client/views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../client/public')));
require('dotenv').config();
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const sanitizeHtml = require('sanitize-html');
const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST'],
    },
});
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(() => console.log('Connected')).catch(err => console.error(err));
const mongoUri = process.env.MONGO_URI;
app.set('trust proxy', 1); 
const sessionMiddleware = session({
    secret: 'your-secret-key', 
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({
        mongoUrl: process.env.MONGO_URI,
        ttl: 14 * 24 * 60,
        autoRemove: 'interval',
        autoRemoveInterval: 10,
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Only secure in production
        httpOnly: true, // Prevent client-side JS access
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // None for cross-origin
    },
});

app.use(sessionMiddleware);
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"], 
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'", 
                    "https://cdn.socket.io",
                    "https://cdn.jsdelivr.net" 
                ],
                connectSrc: [
                    "'self'",
                    "https://opentdb.com", 
                    "https://cdn.socket.io",
                    "https://trivl-production-testing-75a3ca2b8413.herokuapp.com/",
                    "https://trivl.io",
                    "https://cdn.jsdelivr.net"

                ],
                imgSrc: ["'self'", "data:", "https://avataaars.io/"], 
                fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", 
                    "https://fonts.googleapis.com",
                    "https://cdn.jsdelivr.net"
                ],
            },
        },
    })
);

io.use(sharedSession(sessionMiddleware, {
    autoSave: true, 
}));

io.engine.use((req, res, next) => {
    sessionMiddleware(req, res, next);
});

app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure) {
        return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
});

const triviaQuestions = [
    { question: 'What is the capital of France?', options: ['Paris', 'London', 'Berlin', 'Madrid'], answer: 'Paris' },
    { question: 'Which planet is closest to the sun?', options: ['Venus', 'Mars', 'Mercury', 'Earth'], answer: 'Mercury' },
    { question: 'Who wrote "Hamlet"?', options: ['Shakespeare', 'Dickens', 'Hemingway', 'Tolkien'], answer: 'Shakespeare' },
    { question: 'What is the largest mammal?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], answer: 'Blue Whale' },
    { question: 'What is the boiling point of water in Celsius?', options: ['90°C', '100°C', '110°C', '120°C'], answer: '100°C' },
    { question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: '7' },
    { question: 'What is the chemical symbol for gold?', options: ['Au', 'Ag', 'Fe', 'Pb'], answer: 'Au' },
    { question: 'Which country is known as the Land of the Rising Sun?', options: ['China', 'Japan', 'Thailand', 'India'], answer: 'Japan' },
    { question: 'What is the smallest prime number?', options: ['1', '2', '3', '5'], answer: '2' },
    { question: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Michelangelo', 'Da Vinci', 'Picasso'], answer: 'Da Vinci' },
    { question: 'What is the largest ocean?', options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'], answer: 'Pacific' },
    { question: 'What is the square root of 64?', options: ['6', '7', '8', '9'], answer: '8' },
    { question: 'Which gas do plants primarily absorb?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Helium'], answer: 'Carbon Dioxide' },
    { question: 'What is the hardest natural substance?', options: ['Gold', 'Diamond', 'Iron', 'Quartz'], answer: 'Diamond' },
    { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 'Mars' },
    { question: 'What is the capital of Italy?', options: ['Venice', 'Milan', 'Rome', 'Florence'], answer: 'Rome' },
    { question: 'How many strings does a standard guitar have?', options: ['4', '6', '8', '10'], answer: '6' },
    { question: 'What is the largest land animal?', options: ['Elephant', 'Rhinoceros', 'Giraffe', 'Bear'], answer: 'Elephant' },
    { question: 'Who discovered gravity?', options: ['Newton', 'Einstein', 'Galileo', 'Tesla'], answer: 'Newton' },
    { question: 'What is the freezing point of water in Celsius?', options: ['-5°C', '0°C', '5°C', '10°C'], answer: '0°C' },
    { question: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'], answer: 'Canberra' },
    { question: 'How many legs do spiders have?', options: ['6', '8', '10', '12'], answer: '8' },
    { question: 'Which element has the chemical symbol O?', options: ['Oxygen', 'Osmium', 'Gold', 'Silver'], answer: 'Oxygen' },
    { question: 'What is the tallest mountain in the world?', options: ['K2', 'Everest', 'Kilimanjaro', 'Denali'], answer: 'Everest' },
    { question: 'Who invented the telephone?', options: ['Bell', 'Edison', 'Tesla', 'Marconi'], answer: 'Bell' },
    { question: 'Which country won the FIFA World Cup in 2018?', options: ['Brazil', 'Germany', 'France', 'Spain'], answer: 'France' },
    { question: 'What is the chemical symbol for water?', options: ['H2O', 'HO2', 'O2H', 'OH'], answer: 'H2O' },
    { question: 'What is the largest planet in our solar system?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], answer: 'Jupiter' },
    { question: 'What is the capital of Spain?', options: ['Barcelona', 'Madrid', 'Seville', 'Valencia'], answer: 'Madrid' },
    { question: 'Which organ pumps blood in the human body?', options: ['Lungs', 'Heart', 'Liver', 'Brain'], answer: 'Heart' },
    { question: 'What is the speed of light?', options: ['300,000 km/s', '150,000 km/s', '200,000 km/s', '250,000 km/s'], answer: '300,000 km/s' },
    { question: 'What is the capital of Canada?', options: ['Toronto', 'Ottawa', 'Vancouver', 'Montreal'], answer: 'Ottawa' },
    { question: 'Who was the first President of the United States?', options: ['Lincoln', 'Jefferson', 'Washington', 'Adams'], answer: 'Washington' },
    { question: 'What is the primary ingredient in guacamole?', options: ['Tomato', 'Avocado', 'Lime', 'Pepper'], answer: 'Avocado' },
    { question: 'Which month has 28 days?', options: ['February', 'March', 'April', 'All of them'], answer: 'All of them' },
    { question: 'Which star is at the center of our solar system?', options: ['Sirius', 'Polaris', 'The Sun', 'Vega'], answer: 'The Sun' },
    { question: 'What is the currency of Japan?', options: ['Dollar', 'Yen', 'Euro', 'Won'], answer: 'Yen' },
    { question: 'What is the largest desert in the world?', options: ['Sahara', 'Gobi', 'Arctic', 'Antarctica'], answer: 'Antarctica' },
    { question: 'Which animal is known as the King of the Jungle?', options: ['Tiger', 'Lion', 'Elephant', 'Leopard'], answer: 'Lion' },
    { question: 'How many colors are in a rainbow?', options: ['5', '6', '7', '8'], answer: '7' },
    { question: 'Which country is famous for pizza?', options: ['France', 'Italy', 'Greece', 'Spain'], answer: 'Italy' },
    { question: 'Which continent is known as the Dark Continent?', options: ['Africa', 'Asia', 'South America', 'Australia'], answer: 'Africa' },
    { question: 'What is the smallest country in the world?', options: ['Monaco', 'Malta', 'Vatican City', 'Andorra'], answer: 'Vatican City' },
    { question: 'Which is the hottest planet in our solar system?', options: ['Mercury', 'Venus', 'Mars', 'Jupiter'], answer: 'Venus' },
    { question: 'What is the largest bone in the human body?', options: ['Femur', 'Tibia', 'Humerus', 'Skull'], answer: 'Femur' },
    { question: 'Which ocean is the deepest?', options: ['Indian', 'Atlantic', 'Pacific', 'Arctic'], answer: 'Pacific' },
    { question: 'What is the chemical symbol for sodium?', options: ['Na', 'S', 'So', 'N'], answer: 'Na' },
    { question: 'Who painted the Starry Night?', options: ['Van Gogh', 'Da Vinci', 'Picasso', 'Monet'], answer: 'Van Gogh' },
];

const fetchQuestionsFromDB = async (amount, category = 'any', difficulty = 'any') => {
    const filter = {};
    if (category !== 'any') {
        filter.category = category;
    }
    try {
        const size = Number(amount); 
        if (isNaN(size) || size <= 0) {
            throw new Error(`Invalid "amount" value: ${amount}. Must be a positive number.`);
        }

        let questions = [];

        if (difficulty === 'any') {
            const easySize = Math.floor(size * 0.6);
            const mediumSize = Math.floor(size * 0.3);
            const hardSize = size - (easySize + mediumSize);
            const [easyQuestions, mediumQuestions, hardQuestions] = await Promise.all([
                Question.aggregate([
                    { $match: { ...filter, difficulty: 'easy' } },
                    { $sample: { size: easySize } },
                ]),
                Question.aggregate([
                    { $match: { ...filter, difficulty: 'medium' } },
                    { $sample: { size: mediumSize } },
                ]),
                Question.aggregate([
                    { $match: { ...filter, difficulty: 'hard' } },
                    { $sample: { size: hardSize } },
                ]),
            ]);
            questions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];
        } else {
            questions = await Question.aggregate([
                { $match: { ...filter, difficulty } },
                { $sample: { size } },
            ]);
        }
        const uniqueQuestions = [];
        const seenQuestions = new Set();
        for (const question of questions) {
            if (!seenQuestions.has(question.question)) {
                uniqueQuestions.push(question);
                seenQuestions.add(question.question);
            }
        }
        const additionalSize = size - uniqueQuestions.length;
        if (additionalSize > 0) {
            const additionalQuestions = await Question.aggregate([
                { $match: { _id: { $nin: uniqueQuestions.map(q => q._id) } } },
                { $sample: { size: additionalSize } },
            ]);

            uniqueQuestions.push(...additionalQuestions);
        }
        return uniqueQuestions.map((item) => ({
            question: item.question,
            options: shuffleArray(item.options),
            answer: item.answer,
        }));
    } catch (error) {
        console.error('Error fetching questions from the database:', error);
        return [];
    }
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
const lobbies = []; 
const maxPlayersPerLobby = 8; 
io.on('connection', (socket) => {
    const username = sanitizeHtml(socket.request.session.username || '', {
        allowedTags: [],
        allowedAttributes: {},
    });

    if (!username) {
        console.error('Connection attempt without username.');
        socket.disconnect();
        return;
    }

    users[socket.id] = username;

    socket.on('join-game', (avatar, targetLobbyId) => {
        handleJoinGame(socket, avatar, targetLobbyId);
    });
    socket.on('submit-answer', (answer) => handleSubmitAnswer(socket, answer));
    socket.on('send-message', (message) => handleSendMessage(socket, message));
    socket.on('disconnect', () => handleDisconnect(socket));
    socket.on('start-game', ({ questionCount, selectedCategory, selectedDifficulty }) => {
        const lobby = lobbies.find((lobby) =>
            lobby.players.some((player) => player.socketId === socket.id && lobby.host === socket.id)
        );
    
        if (!lobby) {
            console.error("Start game failed: No lobby or you're not the host.");
            return;
        }
    
        if (lobby.players.length < 2) {
            socket.emit('error-message', 'You need at least 2 players to start the game.');
            return;
        }
    ``
        
        lobby.totalQuestions = questionCount;
        lobby.selectedDifficulty = selectedDifficulty;
        lobby.selectedCategory = selectedCategory;
        lobby.gameInProgress = true;
        sendQuestion(lobby);
        io.to(lobby.id).emit('game-started');
    });
    socket.on('update-settings', (newSettings) => {
        const lobby = lobbies.find((l) => l.players.some((p) => p.socketId === socket.id));
    
        if (lobby) {
            lobby.settings = { ...lobby.settings, ...newSettings };
            console.log(`Lobby ${lobby.id} updated settings:`, lobby.settings);
            io.to(lobby.id).emit('settings-updated', lobby.settings);
        }
    });
});

function updatePlayerList(lobby) {
    const players = lobby.players.map((player) => ({
        username: player.username,
        isHost: player.isHost,
    }));
    io.to(lobby.id).emit('update-player-list', players);
}

function handleJoinGame(socket, avatar, targetLobbyId = null) {
    const username = users[socket.id];
    if (!username) {
        console.error('Failed to join game: Username is undefined or invalid.');
        return;
    }

    
    let lobby = targetLobbyId
        ? lobbies.find((lobby) => lobby.id === targetLobbyId)
        : lobbies.find(
              (lobby) =>
                  lobby.players.length < maxPlayersPerLobby &&
                  !lobby.isCustom
                  
          );
    
    if (lobby && lobby.players.length >= maxPlayersPerLobby) {
        console.log(`Lobby ${lobby.id} is full. Cannot join.`);
        return;
    }
    if(lobby){
        console.log(`Lobby Length: `, lobby.players.length)
    }
    
    if (!lobby) {
        lobby = {
            id: targetLobbyId || `Lobby-${lobbies.length + 1}`,
            players: [],
            chatLog: [],
            scores: {},
            avatars: {},
            playersAnswered: {},
            leaderboard: {},
            currentQuestion: null,
            totalQuestions: 10,
            currentQuestionNumber: 0,
            gameInProgress: true,
            timeLeft: 15,
            mainTimerEnded: false,
            gameTimer: null,
            questionTimeout: null,
            isCustom: !!targetLobbyId, 
            triviaQuestions: [],
        };

        lobbies.push(lobby);
    }

    if (lobby.players.length >= maxPlayersPerLobby) {
        console.error(`Lobby ${lobby.id} is full. User ${username} cannot join.`);
        return;
    }

    if (lobby.players.some((player) => player.socketId === socket.id)) {
        console.log(`User ${username} is already in lobby: ${lobby.id}`);
        return;
    }

    const isHost = lobby.isCustom && lobby.players.length === 0;
    lobby.players.push({ socketId: socket.id, username, avatar, isHost });
    lobby.scores[socket.id] = lobby.scores[socket.id] || 0;
    lobby.avatars[socket.id] = avatar;
    updatePlayerList(lobby);
    socket.join(lobby.id);
    if(isHost){
            lobby.host = socket.id;
            socket.emit('sync-lobby', {
                currentQuestion: lobby.currentQuestion,
                timeLeft: lobby.timeLeft,
                currentQuestionNumber: lobby.currentQuestionNumber,
                totalQuestions: lobby.totalQuestions,
                chatLog: lobby.chatLog,
                scores: lobby.scores,
                gameInProgress: lobby.gameInProgress,
                avatars: lobby.avatars,
            });
            socket.emit('host-status', {isHost: true});
    }else{
        socket.emit('sync-lobby', {
            currentQuestion: lobby.currentQuestion,
            timeLeft: lobby.timeLeft,
            currentQuestionNumber: lobby.currentQuestionNumber,
            totalQuestions: lobby.totalQuestions,
            chatLog: lobby.chatLog,
            scores: lobby.scores,
            gameInProgress: lobby.gameInProgress,
            avatars: lobby.avatars,
        });
        socket.emit('host-status', {isHost: false});
        socket.emit('settings-updated', lobby.settings);
    }


    
    
    io.to(lobby.id).emit('received-message', {
        name: 'System',
        message: `${username} has joined ${lobby.id}!`,
        type: 'join',
    });

    broadcastLeaderboard(lobby);

    if (!lobby.isCustom && lobby.players.length === 1) {
        sendQuestion(lobby);
        io.to(lobby.id).emit('game-started');
    }
    resetInactivityTimer(socket);
}

function handleSubmitAnswer(socket, answer) {
    resetInactivityTimer(socket);
    const username = users[socket.id]; 
    if (!username) return;

    const lobby = lobbies.find((lobby) =>
        lobby.players.some((player) => player.socketId === socket.id)
    );

    if (!lobby) {
        console.log(`No lobby found for user: ${username}`);
        return;
    }

    if (lobby.playersAnswered[socket.id]) {
        console.log(`User ${username} already answered. Ignoring.`);
        return;
    }    
    const submittedAnswer = answer?.trim().toLowerCase();
    const correctAnswer = lobby.currentQuestion?.answer.trim().toLowerCase();
    const isCorrect = submittedAnswer === correctAnswer;
    const timeTaken = 15 - lobby.timeLeft;

    
    if (isCorrect) {
        const basePoints = 100;
        const bonusPoints = lobby.timeLeft * 10;
        const totalPoints = basePoints + bonusPoints;

        lobby.scores[socket.id] = (lobby.scores[socket.id] || 0) + totalPoints;
        lobby.playersAnswered[socket.id] = { answer, isCorrect, timeTaken, points: totalPoints };
    } else {
        
        lobby.playersAnswered[socket.id] = { answer, isCorrect, timeTaken, points: 0 };
    }

    
    const buttonStates = lobby.currentQuestion.options.map((option) => ({
        text: option,
        isCorrect: option === lobby.currentQuestion.answer,
        isSelected: option === answer,
    }));

    socket.emit('update-button-states', buttonStates);

    
    io.to(lobby.id).emit('received-message', {
        name: 'System',
        message: `${username} answered in ${timeTaken} seconds.`,
    });

    lobby.chatLog.push({ name: 'System', message: `${username} answered in ${timeTaken} seconds.`, type: 'answer' });
    broadcastLeaderboard(lobby);

    
    if (Object.keys(lobby.playersAnswered).length === lobby.players.length) {
        clearInterval(lobby.gameTimer); 
        endQuestion(lobby); 
    }
}

function handleDisconnect(socket) {
    const username = users[socket.id];
    if (!username) return;

    const lobby = lobbies.find((lobby) =>
        lobby.players.some((player) => player.socketId === socket.id)
    );

    if (lobby) {
        if (lobby.isCustom) {
            // Custom Game: Allow a 10-second grace period for reconnection
            disconnectedUsers[socket.id] = {
                timeout: setTimeout(() => {
                    // Remove the player if they don't reconnect within the grace period
                    lobby.players = lobby.players.filter(
                        (player) => player.socketId !== socket.id
                    );

                    const leaveMessage = `${username} has left the lobby!`;
                    lobby.chatLog.push({
                        name: 'System',
                        message: leaveMessage,
                        type: 'leave',
                    });

                    io.to(lobby.id).emit('received-message', {
                        name: 'System',
                        message: leaveMessage,
                        type: 'join',
                    });

                    // Handle host reassignment or lobby deletion
                    if (lobby.host === socket.id) {
                        if (lobby.players.length > 0) {
                            const newHost = lobby.players[0];
                            lobby.host = newHost.socketId;

                            console.log(`Host left. New host assigned: ${newHost.username}`);
                            io.to(lobby.id).emit('received-message', {
                                name: 'System',
                                message: `${username} has disconnected. ${newHost.username} has been promoted to leader`,
                                type: 'promoted',
                            });
                            lobby.chatLog.push({
                                name: 'System',
                                message: `${username} has disconnected. ${newHost.username} has been promoted to leader`,
                                type: 'promoted',
                            });

                            lobby.players.forEach((player) => {
                                const isHost = player.socketId === lobby.host;
                                io.to(player.socketId).emit('host-status', { isHost });
                            });
                        } else {
                            console.log(`Lobby ${lobby.id} is empty. Deleting the lobby.`);
                            clearLobbyTimers(lobby);
                            lobbies.splice(lobbies.indexOf(lobby), 1);
                        }
                    }

                    if (lobby.players.length === 0) {
                        clearLobbyTimers(lobby);
                        console.log(`Deleted empty lobby: ${lobby.id}`);
                        lobbies.splice(lobbies.indexOf(lobby), 1);
                    } else {
                        broadcastLeaderboard(lobby);
                    }

                    updatePlayerList(lobby);
                }, 10000), // 10 seconds for reconnection
                username: username,
                lobbyId: lobby.id,
            };

            console.log(`User ${username} disconnected. Waiting for reconnection in a custom game...`);
        } else {
            // Public Game: Disconnect immediately
            lobby.players = lobby.players.filter(
                (player) => player.socketId !== socket.id
            );

            const leaveMessage = `${username} has left the lobby!`;
            lobby.chatLog.push({
                name: 'System',
                message: leaveMessage,
                type: 'leave',
            });

            io.to(lobby.id).emit('received-message', {
                name: 'System',
                message: leaveMessage,
                type: 'join',
            });

            // Handle host reassignment or lobby deletion
            if (lobby.host === socket.id) {
                if (lobby.players.length > 0) {
                    const newHost = lobby.players[0];
                    lobby.host = newHost.socketId;

                    console.log(`Host left. New host assigned: ${newHost.username}`);
                    io.to(lobby.id).emit('received-message', {
                        name: 'System',
                        message: `${username} has disconnected. ${newHost.username} has been promoted to leader`,
                        type: 'promoted',
                    });
                    lobby.chatLog.push({
                        name: 'System',
                        message: `${username} has disconnected. ${newHost.username} has been promoted to leader`,
                        type: 'promoted',
                    });

                    lobby.players.forEach((player) => {
                        const isHost = player.socketId === lobby.host;
                        io.to(player.socketId).emit('host-status', { isHost });
                    });
                } else {
                    console.log(`Lobby ${lobby.id} is empty. Deleting the lobby.`);
                    clearLobbyTimers(lobby);
                    lobbies.splice(lobbies.indexOf(lobby), 1);
                }
            }

            if (lobby.players.length === 0) {
                clearLobbyTimers(lobby);
                console.log(`Deleted empty lobby: ${lobby.id}`);
                lobbies.splice(lobbies.indexOf(lobby), 1);
            } else {
                broadcastLeaderboard(lobby);
            }

            updatePlayerList(lobby);
        }
        if(socket.request.session){
            console.log(`Destroyed ${socket.request.session.username}'s username in session`);
            socket.request.session.username = null;
            socket.request.session.joinedCustomGame = null;
        }
    }
    delete users[socket.id];
}

function resetInactivityTimer(socket) {
    const username = users[socket.id];
    if (!username) return;
    const lobby = lobbies.find((lobby) =>
        lobby.players.some((player) => player.socketId === socket.id)
    );
    if (inactiveUsers[socket.id]) {
        clearTimeout(inactiveUsers[socket.id]);
    }
    if(lobby.isCustom && !lobby.gameInProgress){
        return;
    }
    inactiveUsers[socket.id] = setTimeout(() => {
        console.log(`User ${username} has been kicked for inactivity.`);
        socket.emit('inactive-kick', 'You have been disconnected due to inactivity.');
        handleDisconnect(socket); 
    }, 60000); // 60 seconds of inactivity
    
}


function handleSendMessage(socket, message) {
    resetInactivityTimer(socket);
    const username = users[socket.id];
    console.log('Sent message:', message);
    const lobby = lobbies.find((lobby) =>
        lobby.players.some((player) => player.socketId === socket.id)
    );

    if (!lobby) {
        console.error(`Send message failed: No lobby found for user: ${username}`);
        return;
    }

    const sanitizedMessage = sanitizeHtml(message, { allowedTags: [], allowedAttributes: {} });
    if (sanitizedMessage.trim() === '') return;

    const chatMessage = { name: username, message: sanitizedMessage, type: 'regular' };
    lobby.chatLog.push(chatMessage);
    io.to(lobby.id).emit('received-message', chatMessage);
}

function broadcastLeaderboard(lobby) {
    const updatedScores = lobby.players.map((player) => ({
        socketId: player.socketId, 
        username: player.username, 
        score: lobby.scores[player.socketId] || 0, 
    }));

    const updatedAvatars = lobby.players.reduce((acc, player) => {
        acc[player.socketId] = player.avatar; 
        return acc;
    }, {});

    io.to(lobby.id).emit('update-leaderboard', { updatedScores, updatedAvatars });
}

const sendQuestion = async (lobby) => {
    let questions = [1];
    if (!lobby) {
        console.error("sendQuestion called with undefined lobby");
        return;
    }

    if (lobby.gameTimer) {
        clearInterval(lobby.gameTimer);
    }

    if(lobby.currentQuestionNumber == 0){
        questions = await fetchQuestionsFromDB(
            lobby.totalQuestions,
            lobby.selectedCategory,
            lobby.selectedDifficulty
        );
        lobby.triviaQuestions = questions || triviaQuestions;
        
        if (!lobby.triviaQuestions || lobby.triviaQuestions.length === 0) {
            console.error("Failed to load trivia questions. Ending game.");
            io.to(lobby.id).emit('game-over', {
                winner: null,
                finalScores: [],
            });
            return;
        }
    }

    if (questions.length === 0) {
        
        io.to(lobby.id).emit('received-message', {
            name: 'System',
            message: "No questions available for the selected filters. Please try different settings.",
            type: 'leave'
        });
        console.error("Ending game due to insufficient questions.");
        return;
    }

    if (questions.length < lobby.totalQuestions) {
        
        io.to(lobby.id).emit('received-message', {
            name: 'System',
            message: `Only ${questions.length} questions are available for the selected filters. The game will proceed with these questions.`,
            type: 'leave'
        });
    }
    lobby.currentQuestionNumber++;
    lobby.timeLeft = 15;
    if (lobby.currentQuestionNumber > lobby.totalQuestions) {
        
        const sortedScores = lobby.players.map((player) => ({
            username: player.username,
            score: lobby.scores[player.socketId] || 0, 
        })).sort((a, b) => b.score - a.score); 

        const finalScores = sortedScores.map((player) => [player.username, player.score]);

        

        const winner = sortedScores.length ? sortedScores[0].username : null;

        io.to(lobby.id).emit('game-over', {
            winner,
            finalScores, 
        });

        resetGame(lobby);
        return;
    }

    const questionIndex = lobby.currentQuestionNumber - 1;
    const questionData = lobby.triviaQuestions[questionIndex];

    lobby.currentQuestion = questionData;

    io.to(lobby.id).emit('new-question', {
        question: lobby.currentQuestion.question,
        options: lobby.currentQuestion.options,
        questionNumber: lobby.currentQuestionNumber,
        totalQuestions: lobby.totalQuestions,
    });

    broadcastLeaderboard(lobby);

    lobby.gameTimer = setInterval(() => {
        lobby.timeLeft--;
        io.to(lobby.id).emit('update-timer', lobby.timeLeft);

        if (lobby.timeLeft <= 0) {
            clearInterval(lobby.gameTimer);
            endQuestion(lobby);
        }
    }, 1000);
};

function clearLobbyTimers(lobby) {
    if (lobby.gameTimer) {
        clearInterval(lobby.gameTimer);
        lobby.gameTimer = null;
    }
    if (lobby.questionTimeout) {
        clearTimeout(lobby.questionTimeout);
        lobby.questionTimeout = null;
    }
}

const endQuestion = (lobby) => {
    clearTimeout(lobby.questionTimeout);

    const playerScores = [];

    for (let player of lobby.players) {
        const username = player.username;

        if (lobby.playersAnswered[player.socketId]) {
            const { isCorrect, timeTaken, points } = lobby.playersAnswered[player.socketId];
            playerScores.push({
                username,
                isCorrect,
                timeTaken: timeTaken || 'No Answer',
                points: points || 0,
            });
        } else {
            playerScores.push({
                username,
                isCorrect: false,
                timeTaken: 'No Answer',
                points: 0,
            });
        }
    }

    
    playerScores.sort((a, b) => b.points - a.points);

    io.to(lobby.id).emit('question-ended', {
        correctAnswer: lobby.currentQuestion.answer,
        playerScores,
        transitionTime: 5,
    });

    
    lobby.playersAnswered = {};
    lobby.questionTimeout = setTimeout(() => {
        sendQuestion(lobby);
    }, 5000);
};

function resetGame(lobby) {
    if (!lobby) {
        console.error("resetGame called with undefined lobby");
        return;
    }

    console.log(`Resetting game for lobby: ${lobby.id}`);

    
    if (lobby.gameTimer) {
        clearInterval(lobby.gameTimer);
        lobby.gameTimer = null;
    }
    if (lobby.questionTimeout) {
        clearTimeout(lobby.questionTimeout);
        lobby.questionTimeout = null;
    }

    clearLobbyTimers(lobby);
    
    lobby.currentQuestion = null;
    lobby.currentQuestionNumber = 0;
    lobby.playersAnswered = {};
    lobby.timeLeft = 15;

    
    lobby.players.forEach((player) => {
        lobby.scores[player.socketId] = 0;
    });

    
    io.to(lobby.id).emit('reset-game', {
        message: "The game has been reset! A new round will start shortly...",
        scores: lobby.scores,
        chatLog: lobby.chatLog,
    });

    
    broadcastLeaderboard(lobby);

    if(!lobby.isCustom){
        setTimeout(() => {
            if(lobby.players.length > 0){
                console.log(`Starting a new game for lobby: ${lobby.id}`);
                sendQuestion(lobby);
            }else{
                return;
            }
            
        }, 5000); 
    }else{
        setTimeout(() => {
            lobby.players.forEach((player) => {
                const isHost = player.socketId === lobby.host;
                io.to(player.socketId).emit('host-status', { isHost });
            });
        io.to(lobby.id).emit('end-round')
        lobby.gameInProgress = false;
        updatePlayerList(lobby);
        }, 5000);
    }
    
}

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});

app.post('/game', (req, res) => {
    const { name, lobbyId } = req.body;

    if (!name || name.trim() === '') {
        console.log('Rejected: No username provided.');
        return res.redirect('/');
    }
    req.session.username = name.trim().substring(0, 12);
    req.session.validSession = true;
    if (lobbyId) {
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/');
            }
            res.redirect(`/game/${lobbyId}`);
        });
    } else {
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/');
            }
            res.redirect('/game');
        });
    }
});

app.get('/game', (req, res) => {
    if (!req.session.username) {
        console.log('No username found. Redirecting to home page.');
        return res.render('home', { username: null, lobbyId: null });
    }

    console.log(`Rendering public game for username: ${req.session.username}`);
    res.render('game', { username: req.session.username, lobbyId: null });
});

app.get('/game/:lobbyId', (req, res) => {
    const { lobbyId } = req.params;
    if (!req.session.validSession) {
        console.log(`Invalid session. Redirecting to main menu for lobby ID: ${lobbyId}`);
        req.session.username = null; 
        return res.render('home', { username: null, lobbyId });
    }

    if (!req.session.username) {
        console.log(`No username found. Rendering home page with lobby ID: ${lobbyId}`);
        req.session.joinedCustomGame = true;
        return res.render('home', { username: null, lobbyId });
    }
    const lobby = lobbies.find((l) => l.id === lobbyId);

    if (!lobby) {
        console.log(`Lobby ${lobbyId} not found. Redirecting to public game.`);
        return res.redirect('/'); 
    }
    console.log(`Rendering game page for lobby: ${lobbyId} with username: ${req.session.username}`);
    req.session.validSession = false;
    res.render('game', { username: req.session.username, lobbyId });
});

app.get('/home', (req,res) => {
    res.render('home', { username: req.session.username });
})

app.get('*', (req, res) => {
    res.redirect('home');
});

app.post('/create-custom-game', (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.redirect('/');
    }
    req.session.validSession = true;
    req.session.username = name.trim().substring(0, 12);
    
    const lobbyId = `Lobby-${uuidv4()}`;
    const lobby = {
        id: lobbyId,
        players: [],
        chatLog: [],
        scores: {},
        avatars: {},
        playersAnswered: {},
        leaderboard: {},
        gameInProgress: false,
        currentQuestion: null,
        currentQuestionNumber: 0,
        timeLeft: 15,
        mainTimerEnded: false,
        gameTimer: null,
        questionTimeout: null,
        isCustom: true,
    };

    lobbies.push(lobby);

    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.redirect('/');
        }
        res.redirect(`/game/${lobbyId}`);
    });
});




