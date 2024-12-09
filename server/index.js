const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const users = {};
const disconnectedUsers = {};
app.set('views', path.join(__dirname, '../client/views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../client/public')));
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const sanitizeHtml = require('sanitize-html');
const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST'],
    },
});

let totalQuestions = 1;
const sessionMiddleware = session({
    secret: 'your-secret-key', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }, 
});

app.use(sessionMiddleware);


io.use(sharedSession(sessionMiddleware, {
    autoSave: true, 
}));

io.engine.use((req, res, next) => {
    sessionMiddleware(req, res, next);
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

const lobbies = []; // Array to store public lobbies
const maxPlayersPerLobby = 2; // Max players per lobby
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

    socket.on('join-game', (avatar) => {
        handleJoinGame(socket, avatar);
    });
    socket.on('request-sync', () => handleRequestSync(socket));
    socket.on('submit-answer', (answer) => handleSubmitAnswer(socket, answer));
    socket.on('send-message', (message) => handleSendMessage(socket, message));
    socket.on('disconnect', () => handleDisconnect(socket));
    socket.on('reconnect', () => handleReconnect(socket));
});


function handleJoinGame(socket, avatar) {
    const username = users[socket.id];
    if (!username) {
        console.error('Failed to join game: Username is undefined or invalid.');
        return;
    }

    // Ensure no duplicate socket IDs in any lobby
    let lobby = lobbies.find((lobby) =>
        lobby.players.some((player) => player.socketId === socket.id)
    );

    // Check for username conflict in existing lobbies
    const usernameConflict = lobbies.some((lobby) =>
        lobby.players.some((player) => player.username === username)
    );

    if (!lobby) {
        if (usernameConflict) {
            // Create a new lobby if username conflicts
            lobby = {
                id: `Lobby-${lobbies.length + 1}`,
                players: [],
                chatLog: [],
                scores: {},
                avatars: {},
                playersAnswered: {},
                leaderboard: {},
                currentQuestion: null,
                currentQuestionNumber: 0,
                timeLeft: 15,
                mainTimerEnded: false,
                gameTimer: null,
                questionTimeout: null,
            };
            lobbies.push(lobby);
            console.log(`Created new lobby due to username conflict: ${lobby.id}`);
        } else {
            // Try to join an open lobby
            lobby = lobbies.find((lobby) => lobby.players.length < maxPlayersPerLobby);
            if (!lobby) {
                // Create a new lobby if none are open
                lobby = {
                    id: `Lobby-${lobbies.length + 1}`,
                    players: [],
                    chatLog: [],
                    scores: {},
                    avatars: {},
                    playersAnswered: {},
                    leaderboard: {},
                    currentQuestion: null,
                    currentQuestionNumber: 0,
                    timeLeft: 15,
                    mainTimerEnded: false,
                    gameTimer: null,
                    questionTimeout: null,
                };
                lobbies.push(lobby);
                console.log('Created new lobby:', lobby.id);
            }
        }
    }

    // Add the player to the lobby
    lobby.players.push({ socketId: socket.id, username, avatar });
    lobby.scores[socket.id] = lobby.scores[socket.id] || 0;
    lobby.avatars[socket.id] = avatar;
    console.log(`${username} joined lobby: ${lobby.id}`);
    socket.join(lobby.id);

    // Sync the joining player with the current lobby state
    socket.emit('sync-lobby', {
        currentQuestion: lobby.currentQuestion,
        timeLeft: lobby.timeLeft,
        currentQuestionNumber: lobby.currentQuestionNumber,
        totalQuestions,
        chatLog: lobby.chatLog,
        scores: lobby.scores,
        avatars: lobby.avatars,
    });

    // Notify other players in the lobby
    const joinMessage = `${username} has joined ${lobby.id}!`;
    lobby.chatLog.push({ name: 'System', message: joinMessage, type: 'join' });
    io.to(lobby.id).emit('received-message', {
        name: 'System',
        message: joinMessage,
        type: 'join',
    });

    // Broadcast updated leaderboard immediately
    broadcastLeaderboard(lobby);

    // Start the game if it's the first player in the lobby
    if (lobby.players.length === 1) {
        sendQuestion(lobby);
    }
}

function handleRequestSync(socket) {
    const username = users[socket.id];
    if (!username) return;

    const lobby = lobbies.find((lobby) =>
        lobby.players.some((player) => player.socketId === socket.id)
    );

    if (!lobby) {
        console.error(`No lobby found for user: ${username}`);
        return;
    }

    // Sync leaderboard and avatars specific to this lobby
    const syncedScores = lobby.players.reduce((acc, player) => {
        acc[player.username] = lobby.scores[player.username] || 0;
        return acc;
    }, {});

    const syncedAvatars = lobby.players.reduce((acc, player) => {
        acc[player.username] = player.avatar;
        return acc;
    }, {});

    socket.emit('update-leaderboard', syncedScores, syncedAvatars);

    // Sync chat log specific to this lobby
    socket.emit('sync-chat', lobby.chatLog);
}

function handleSubmitAnswer(socket, answer) {
    const username = users[socket.id]; // Get username tied to socket ID
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

    // Debugging: Log the current question and answer
    console.log('Submitted Answer:', answer);
    console.log('Correct Answer:', lobby.currentQuestion?.answer);

    // Ensure both the submitted answer and the correct answer are trimmed and case-insensitive
    const submittedAnswer = answer?.trim().toLowerCase();
    const correctAnswer = lobby.currentQuestion?.answer.trim().toLowerCase();
    const isCorrect = submittedAnswer === correctAnswer;

    console.log(`Is Correct: ${isCorrect}`); // Debug: Check if the comparison works as expected

    const timeTaken = 15 - lobby.timeLeft;

    // Update scores and mark the user as answered
    if (isCorrect) {
        const basePoints = 100;
        const bonusPoints = lobby.timeLeft * 10;
        const totalPoints = basePoints + bonusPoints;

        lobby.scores[socket.id] = (lobby.scores[socket.id] || 0) + totalPoints;
        lobby.playersAnswered[socket.id] = { answer, isCorrect, timeTaken, points: totalPoints };
    } else {
        // Mark player as answered with 0 points for incorrect answer
        lobby.playersAnswered[socket.id] = { answer, isCorrect, timeTaken, points: 0 };
    }

    // Update button states and emit to client
    const buttonStates = lobby.currentQuestion.options.map((option) => ({
        text: option,
        isCorrect: option === lobby.currentQuestion.answer,
        isSelected: option === answer,
    }));

    socket.emit('update-button-states', buttonStates);

    // Emit system message for the answer
    io.to(lobby.id).emit('received-message', {
        name: 'System',
        message: `${username} answered in ${timeTaken} seconds.`,
    });

    lobby.chatLog.push({ name: 'System', message: `${username} answered in ${timeTaken} seconds.`, type: 'answer' });
    broadcastLeaderboard(lobby);

    // Check if all players have answered
    if (Object.keys(lobby.playersAnswered).length === lobby.players.length) {
        console.log(`All players have answered in lobby ${lobby.id}. Stopping the timer.`);
        clearInterval(lobby.gameTimer); // Stop the timer immediately
        endQuestion(lobby); // Proceed to end the question
    }
}







function handleDisconnect(socket) {
    const username = users[socket.id];
    if (!username) return;


    const lobby = lobbies.find((lobby) =>
        lobby.players.some((player) => player.socketId === socket.id)
    );

    if (lobby) {
        // Remove the player from the lobby
        lobby.players = lobby.players.filter(
            (player) => player.username !== username
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
        // If the lobby is empty, remove it
        if (lobby.players.length === 0) {
            clearLobbyTimers(lobby);
            console.log(`Deleted empty lobby: ${lobby.id}`);
            lobbies.splice(lobbies.indexOf(lobby), 1);
        } else {
            // Otherwise, update the leaderboard
            broadcastLeaderboard(lobby);
        }
    }

    // Remove the user from the users list
    delete users[socket.id];
}



function handleSendMessage(socket, message) {
    const username = users[socket.id];
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

function handleReconnect(socket) {
    const username = socket.request.session.username;
    if (disconnectedUsers[username]) {
        clearTimeout(disconnectedUsers[username].timeout);
        delete disconnectedUsers[username];
        console.log(`User ${username} successfully reconnected.`);

        const lobby = lobbies.find((lobby) =>
            lobby.players.some((player) => player.username === username)
        );

        if (lobby) {
            console.log(`${username} rejoined lobby: ${lobby.id}`);
            socket.join(lobby.id);

            // Sync full lobby state with the reconnected user
            socket.emit('sync-lobby', {
                chatLog: lobby.chatLog,
                scores: lobby.scores,
                avatars: lobby.avatars,
                currentQuestion: lobby.currentQuestion,
                timeLeft: lobby.timeLeft,
                currentQuestionNumber: lobby.currentQuestionNumber,
                totalQuestions: totalQuestions,
            });

            // Broadcast the leaderboard to reinitialize CSS
            broadcastLeaderboard(lobby);

            // If a timer is running, reinitialize it for the client
            if (lobby.timeLeft > 0) {
                socket.emit('update-timer', lobby.timeLeft);
            }
        } else {
            console.error(`No lobby found for reconnected user: ${username}`);
        }
    }
}


function broadcastLeaderboard(lobby) {
    const updatedScores = lobby.players.reduce((acc, player) => {
        const { socketId, username } = player;
        acc[username] = lobby.scores[socketId] || 0; // Use socketId for scores
        return acc;
    }, {});

    const updatedAvatars = lobby.players.reduce((acc, player) => {
        acc[player.username] = player.avatar; // Use username for avatars
        return acc;
    }, {});

    io.to(lobby.id).emit('update-leaderboard', updatedScores, updatedAvatars);
}


const sendQuestion = (lobby) => {
    if (!lobby) {
        console.error("sendQuestion called with undefined lobby");
        return;
    }

    if (lobby.gameTimer) {
        clearInterval(lobby.gameTimer);
    }
    lobby.currentQuestionNumber++;
    lobby.timeLeft = 15;

    if (lobby.currentQuestionNumber > totalQuestions) {
        // Properly map scores using socket IDs
        const sortedScores = lobby.players.map((player) => ({
            username: player.username,
            score: lobby.scores[player.socketId] || 0, // Use socketId for scores
        })).sort((a, b) => b.score - a.score); // Sort descending by score

        const finalScores = sortedScores.map((player) => [player.username, player.score]);

        console.log('Here Are the finalScores variable: ', finalScores);

        const winner = sortedScores.length ? sortedScores[0].username : null;

        io.to(lobby.id).emit('game-over', {
            winner,
            finalScores, 
        });

        resetGame(lobby);
        return;
    }

    const randomIndex = Math.floor(Math.random() * triviaQuestions.length);
    lobby.currentQuestion = triviaQuestions[randomIndex];

    io.to(lobby.id).emit('new-question', {
        question: lobby.currentQuestion.question,
        options: lobby.currentQuestion.options,
        questionNumber: lobby.currentQuestionNumber,
        totalQuestions,
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

    const playerScores = lobby.players.map((player) => {
        const { socketId, username } = player;

        if (lobby.playersAnswered[socketId]) {
            const { isCorrect, timeTaken, points } = lobby.playersAnswered[socketId];
            return {
                username, // Use username for display
                isCorrect,
                timeTaken: timeTaken || 'No Answer',
                points: points || 0,
            };
        } else {
            return {
                username,
                isCorrect: false,
                timeTaken: 'No Answer',
                points: 0,
            };
        }
    });

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

    // Clear any ongoing timers to prevent overlap
    if (lobby.gameTimer) {
        clearInterval(lobby.gameTimer);
        lobby.gameTimer = null;
    }
    if (lobby.questionTimeout) {
        clearTimeout(lobby.questionTimeout);
        lobby.questionTimeout = null;
    }

    clearLobbyTimers(lobby);
    // Reset the lobby state
    lobby.currentQuestion = null;
    lobby.currentQuestionNumber = 0;
    lobby.playersAnswered = {};
    lobby.timeLeft = 15;

    // Reset player scores
    lobby.players.forEach((player) => {
        lobby.scores[player.socketId] = 0;
    });

    // Notify players that the game has been reset
    io.to(lobby.id).emit('reset-game', {
        message: "The game has been reset! A new round will start shortly...",
        scores: lobby.scores,
        chatLog: lobby.chatLog,
    });

    // Broadcast updated leaderboard
    broadcastLeaderboard(lobby);

    // Restart the game after a short delay
    setTimeout(() => {
        console.log(`Starting a new game for lobby: ${lobby.id}`);
        sendQuestion(lobby);
    }, 5000); // Wait 5 seconds before restarting
}






server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});
app.post('/game', (req, res) => {
    let { name } = req.body;

    if (!name || name.trim() === '') {
        return res.redirect('/');
    }

    name = name.trim().substring(0, 12); 
    req.session.username = name;

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
    res.render('home', { username: req.session.username });
});