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
const users = {};
const helmet = require('helmet');
const PORT = process.env.PORT || 3000;
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

const sessionMiddleware = session({
    secret: 'your-secret-key', 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true }, 
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
                ],
                connectSrc: [
                    "'self'",
                    "https://opentdb.com", 
                    "https://cdn.socket.io",
                    "https://trivl-production-testing-75a3ca2b8413.herokuapp.com/" 
                ],
                imgSrc: ["'self'", "data:", "https://avataaars.io/"], 
                fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'", 
                    "https://fonts.googleapis.com", 
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

const fetchQuestionsFromAPI = async (amount, category ='any', difficulty = 'any') => {
    const categoryParam = category !== 'any' ? `&category=${category}` : '';
    const difficultyParam = difficulty !== 'any' ? `&difficulty=${difficulty}` : '';
    const url = `https://opentdb.com/api.php?amount=${amount}${categoryParam}${difficultyParam}&type=multiple`;
    try {
        const response = await axios.get(url);
        const data = await response.data;

        if (data.response_code !== 0 || !data.results) {
            console.error("Failed to fetch trivia questions:", data);
            return [];
        }

        if (data.results.length < amount) {
            console.warn(
                `Requested ${amount} questions, but only ${data.results.length} are available.`
            );
        }

        return data.results.map((item) => ({
            question: he.decode(item.question), 
            options: shuffleArray([
                ...item.incorrect_answers.map(he.decode), 
                he.decode(item.correct_answer), 
            ]),
            answer: he.decode(item.correct_answer), 
        }));
    } catch (error) {
        if (error.response?.status === 429) {
            console.warn("Rate limit hit. Retrying after 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 500)); // Wait .5 seconds
            return fetchQuestionsFromAPI(amount, category, difficulty); 
        }
        console.error("Error fetching trivia questions:", error);
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
    socket.on('request-sync', () => handleRequestSync(socket));
    socket.on('submit-answer', (answer) => handleSubmitAnswer(socket, answer));
    socket.on('send-message', (message) => handleSendMessage(socket, message));
    socket.on('disconnect', () => handleDisconnect(socket));
    socket.on('reconnect', () => handleReconnect(socket));
    socket.on('start-game', ({ questionCount, selectedCategory, selectedDifficulty }) => {
        const lobby = lobbies.find((lobby) =>
            lobby.players.some((player) => player.socketId === socket.id && player.isHost)
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
        sendQuestion(lobby); 
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
            timeLeft: 15,
            mainTimerEnded: false,
            gameTimer: null,
            questionTimeout: null,
            isCustom: !!targetLobbyId, 
            triviaQuestions: [],
        };

        lobbies.push(lobby);
        console.log(`Created new ${targetLobbyId ? 'custom' : 'public'} lobby: ${lobby.id}`);
    }

    if (lobby.players.length >= maxPlayersPerLobby) {
        console.error(`Lobby ${lobby.id} is full. User ${username} cannot join.`);
        return;
    }

    
    const isHost = lobby.isCustom && lobby.players.length === 0;
    lobby.players.push({ socketId: socket.id, username, avatar, isHost });
    lobby.scores[socket.id] = lobby.scores[socket.id] || 0;
    lobby.avatars[socket.id] = avatar;
    updatePlayerList(lobby);
    console.log(`${username} joined lobby: ${lobby.id} ${isHost ? " as Host": ''}`);
    socket.join(lobby.id);

    if(isHost){
        socket.emit('host-status', {isHost: true});
    }
    
    socket.emit('sync-lobby', {
        currentQuestion: lobby.currentQuestion,
        timeLeft: lobby.timeLeft,
        currentQuestionNumber: lobby.currentQuestionNumber,
        totalQuestions: lobby.totalQuestions,
        chatLog: lobby.chatLog,
        scores: lobby.scores,
        avatars: lobby.avatars,
    });

    
    
    io.to(lobby.id).emit('received-message', {
        name: 'System',
        message: `${username} has joined ${lobby.id}!`,
        type: 'join',
    });

    broadcastLeaderboard(lobby);

    if (!lobby.isCustom && lobby.players.length === 1) {
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

    
    const syncedScores = lobby.players.reduce((acc, player) => {
        acc[player.username] = lobby.scores[player.username] || 0;
        return acc;
    }, {});

    const syncedAvatars = lobby.players.reduce((acc, player) => {
        acc[player.username] = player.avatar;
        return acc;
    }, {});

    socket.emit('update-leaderboard', syncedScores, syncedAvatars);

    
    socket.emit('sync-chat', lobby.chatLog);
}

function handleSubmitAnswer(socket, answer) {
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

    
    console.log('Submitted Answer:', answer);
    console.log('Correct Answer:', lobby.currentQuestion?.answer);

    
    const submittedAnswer = answer?.trim().toLowerCase();
    const correctAnswer = lobby.currentQuestion?.answer.trim().toLowerCase();
    const isCorrect = submittedAnswer === correctAnswer;

    console.log(`Is Correct: ${isCorrect}`); 

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
        console.log(`All players have answered in lobby ${lobby.id}. Stopping the timer.`);
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
        
        if (lobby.players.length === 0) {
            clearLobbyTimers(lobby);
            console.log(`Deleted empty lobby: ${lobby.id}`);
            lobbies.splice(lobbies.indexOf(lobby), 1);
        } else {
            
            broadcastLeaderboard(lobby);
        }
    }
    if (lobby) {
        updatePlayerList(lobby);
    }
    
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

            
            socket.emit('sync-lobby', {
                chatLog: lobby.chatLog,
                scores: lobby.scores,
                avatars: lobby.avatars,
                currentQuestion: lobby.currentQuestion,
                timeLeft: lobby.timeLeft,
                currentQuestionNumber: lobby.currentQuestionNumber,
                totalQuestions: totalQuestions,
            });

            
            broadcastLeaderboard(lobby);

            
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
        acc[username] = lobby.scores[socketId] || 0; 
        return acc;
    }, {});

    const updatedAvatars = lobby.players.reduce((acc, player) => {
        acc[player.username] = player.avatar; 
        return acc;
    }, {});

    io.to(lobby.id).emit('update-leaderboard', updatedScores, updatedAvatars);
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
        questions = await fetchQuestionsFromAPI(
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
    console.log('Current Question Number: ', lobby.currentQuestionNumber)
    console.log('Total Questions.Length: ', lobby.totalQuestions);
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

    
    setTimeout(() => {
        console.log(`Starting a new game for lobby: ${lobby.id}`);
        sendQuestion(lobby);
    }, 5000); 
}

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
app.post('/game', (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        console.log('Rejected: No username provided.');
        return res.redirect('/'); 
    }

    req.session.username = name.trim().substring(0, 12);
    const targetLobbyId = req.query.lobbyId || req.session.targetLobbyId;
    console.log('Here is the targetLobbyId: ', targetLobbyId);
    req.session.targetLobbyId = null;
    if (targetLobbyId) {
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.redirect('/');
            }
            res.redirect(`/game/${targetLobbyId}`);
            
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
    req.session.targetLobbyId = null;
});

app.get('/game', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }
    
    res.render('game', { username: req.session.username, lobbyId: null });
});
app.get('/game/:lobbyId', (req, res) => {
    const { lobbyId } = req.params;

    if (!req.session.username) {
        req.session.targetLobbyId = lobbyId; 
        console.log("Redirecting back to main menu with lobby ID: ", lobbyId);
        return res.redirect('/'); 
    }

    res.render('game', { username: req.session.username, lobbyId });
});

app.get('*', (req, res) => {
    res.render('home', { username: req.session.username });
});

app.post('/create-custom-game', (req, res) => {
    console.log('am fired');
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.redirect('/');
    }

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
        currentQuestion: null,
        currentQuestionNumber: 0,
        timeLeft: 15,
        mainTimerEnded: false,
        gameTimer: null,
        questionTimeout: null,
        isCustom: true,
    };

    lobbies.push(lobby);
    console.log('Created custom lobby:', lobby.id);

    req.session.save((err) => {
        if (err) {
            console.error('Session save error:', err);
            return res.redirect('/');
        }
        res.redirect(`/game/${lobbyId}`);
    });
});





