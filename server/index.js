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

const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST'],
    },
});

let currentQuestion = null; 

let gameTimer = null;
let questionTimeout = null; 
let mainTimerEnded = false;
let timeLeft = 15;
const chatLog = [];

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

let playersAnswered = {};
io.on('connection', (socket) => {
    const username = socket.request.session.username;

    if (!username) {
        console.log('Connection without username, disconnecting socket');
        socket.disconnect();
        return;
    }
    const existingSocketId = Object.keys(users).find(
        (id) => users[id] === username
    );

    let isNewUser = false;
    if (existingSocketId && existingSocketId !== socket.id) {
        console.log(`Removing old socket ID for ${username}: ${existingSocketId}`);
        delete users[existingSocketId];
    }else if (!disconnectedUsers[username]){
        isNewUser = true;
    }

    if(disconnectedUsers[username]){
        clearTimeout(disconnectedUsers[username].timeout);
        delete disconnectedUsers[username];
    }
    users[socket.id] = username; 

    if(isNewUser){
        if(Object.keys(users).length > 1){
            setTimeout(() => {
                io.emit('received-message', {
                    name: 'System',
                    message: `${username} has joined the lobby`,
                })
                chatLog.push({name: 'System', message: `${username} has joined the lobby.`});
            }, 50)
        } else {
            io.emit('received-message', {
                name: 'System',
                message: `${username} has joined the lobby`,
            });
            chatLog.push({name: 'System', message: `${username} has joined the lobby.`});
        }
        
        
    };
        
   
    const playerAnswer = playersAnswered[username]?.answer || null;
    if (currentQuestion && timeLeft !== undefined) {
        let transitionTimeLeft = null;
        if (mainTimerEnded) {
        const timeSinceMainEnded = 15 - timeLeft;
        transitionTimeLeft = Math.max(5 - timeSinceMainEnded, 0);
        }
        
        socket.emit('restore-state', {
            currentQuestion,
            timeLeft,
            playerAnswer,
            mainTimerEnded,
            transitionTimeLeft,
            chatLog
        });
    } else {
        console.log('Starting new game...');
        sendQuestion(); 
    }

    
    socket.on('submit-answer', (answer) => {
        const username = users[socket.id];
        if (!username) return;


        if (playersAnswered[username]) {
            console.log(`User ${username} already answered. Ignoring.`);
            return;
        }

        const isCorrect = answer === currentQuestion?.answer;
        playersAnswered[username] = { answer, isCorrect };


        io.emit('answer-feedback', {
            player: username,
            isCorrect,
        });

        if (Object.keys(playersAnswered).length === Object.keys(users).length) {
            clearInterval(gameTimer);
            mainTimerEnded = true; 
            io.emit('question-ended', {
                correctAnswer: currentQuestion.answer,
                transitionTime: 5,
            });
            setTimeout(sendQuestion, 5000); 
        }
    });

    socket.on('rejoin', (username, callback) => {
        console.log(`--- Rejoin Attempt by ${username} ---`);
        if (!username) {
            return;
        }


        const existingSocketId = Object.keys(users).find(
            (id) => users[id] === username
        );
        if (existingSocketId) {
            console.log(`Removing old socket ID for ${username}: ${existingSocketId}`);
            delete users[existingSocketId];
        }


        users[socket.id] = username;
        const playerAnswer = playersAnswered[username]?.answer || null;

        if (currentQuestion && timeLeft !== undefined) {
            console.log('Restoring game state for:', username);
            callback({
                currentQuestion,
                timeLeft,
                playerAnswer,
                mainTimerEnded,
            });
        } else {
            console.log('No active state. Starting new game...');
            sendQuestion();
        }

        
    });

    socket.on('send-message', (message) => {
        const name = users[socket.id];
        socket.broadcast.emit('received-message', { name, message });
        chatLog.push({name,message});
    });

    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            console.log(`User disconnected: ${username}`);
            disconnectedUsers[username] = {
                timeout: setTimeout(() => {
                    console.log(`User ${username} did not reconnect. Removing Fully`);
                    delete users[socket.id]; 
                    delete disconnectedUsers[username];
                    
                    io.emit('received-message', {
                        name: 'System',
                        message: `${username} has left the lobby.`,
                    });
                    chatLog.push({name: 'System', message: `${username} has left the lobby.`});
                }, 2000)
            }
            
        }
    });
});

const sendQuestion = () => {
    mainTimerEnded = false;
    console.log('Sending new question...');
    if (gameTimer) clearInterval(gameTimer); 
    if (questionTimeout) clearTimeout(questionTimeout); 

    playersAnswered = {};


    const randomIndex = Math.floor(Math.random() * triviaQuestions.length);
    currentQuestion = triviaQuestions[randomIndex];


    io.emit('new-question', currentQuestion);

 
    timeLeft = 15;
    gameTimer = setInterval(() => {
        timeLeft--;
        io.emit('update-timer', timeLeft); 

        if (timeLeft <= 0) {
            clearInterval(gameTimer); 
            mainTimerEnded = true;
            io.emit('question-ended', {
                correctAnswer: currentQuestion.answer,
                transitionTime: 5,
            });

            
            questionTimeout = setTimeout(() => {
                sendQuestion();
            }, 5000);
        }
    }, 1000);
};
server.listen(3000, () => {
    console.log('Server listening on http://localhost:3000');
});
app.post('/game', (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.redirect('/');
    }

    req.session.username = name.trim();
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