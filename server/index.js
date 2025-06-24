require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const sharedSession = require('express-socket.io-session');
const { registerLobbyHandlers, lobbies } = require("./controllers/lobbyController");
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
app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
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
    secret: process.env.SESSION_SECRET, 
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

registerLobbyHandlers(io);

app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure) {
        return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
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
    // 1) Must have come from POST /game (validSession=true)
    if (!req.session.validSession) {
        console.log('Unauthorized direct access to /game. Redirecting to home.');
        return res.redirect('/home');
    }

    // 2) Must also have a username
    if (!req.session.username) {
        console.log('No username in session. Redirecting to home.');
        return res.redirect('/home');
    }

    // 3) Consume the one-time flag so refreshes or new tabs fail
    req.session.validSession = false;
    req.session.save(err => {
        if (err) console.error('Session save error:', err);
        console.log(`Rendering public game for username: ${req.session.username}`);
        res.render('game', { username: req.session.username, lobbyId: null });
    });
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

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});