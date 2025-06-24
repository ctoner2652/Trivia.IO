const sanitizeHtml = require('sanitize-html');
const { v4: uuidv4 } = require('uuid');
const Question = require('../models/Question');

console.log('testing');

const lobbies = [];
const users = {};
const inactiveUsers = {};
const disconnectedUsers = {};
const maxPlayersPerLobby = 8;

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
    try{
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    catch(err){
        console.log('Error shuffling array ', err)
    }
    
};
function registerLobbyHandlers(io) {
    try{
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
        handleJoinGame(io, socket, avatar, targetLobbyId);
    });
    socket.on('submit-answer', (answer) => handleSubmitAnswer(io, socket, answer));
    socket.on('send-message', (message) => handleSendMessage(io, socket, message));
    socket.on('disconnect', () => handleDisconnect(io, socket));
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
        sendQuestion(io, lobby);
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
    }
    catch(err){
        console.log('Error registerLobbyHandlers: ', err)
    }
}

function updatePlayerList(io, lobby) {
    try{
    const players = lobby.players.map((player) => ({
        username: player.username,
        isHost: player.isHost,
    }));
    io.to(lobby.id).emit('update-player-list', players);
    }
    catch(err){
        console.log('Error updating playerList ', err)
    }
}

function handleJoinGame(io, socket, avatar, targetLobbyId = null) {
    try{
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
            isCustom: false,
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
    updatePlayerList(io, lobby);
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

    broadcastLeaderboard(io, lobby);

    if (!lobby.isCustom && lobby.players.length === 1) {
        sendQuestion(io, lobby);
        io.to(lobby.id).emit('game-started');
    }
    resetInactivityTimer(io, socket);
    }
    catch(err){
        console.log('Error handling Join Game ', err)
    }
}

function handleSubmitAnswer(io, socket, answer) {
    try{
    resetInactivityTimer(io, socket);
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
    broadcastLeaderboard(io, lobby);

    
    if (Object.keys(lobby.playersAnswered).length === lobby.players.length) {
        clearInterval(lobby.gameTimer); 
        endQuestion(io, lobby); 
    }
    }
    catch(err){
        console.log('Error handling submitting answer ', err)
    }
}

function handleDisconnect(io, socket) {
    try{
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
                        broadcastLeaderboard(io, lobby);
                    }

                    updatePlayerList(io, lobby);
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
                broadcastLeaderboard(io, lobby);
            }

            updatePlayerList(io, lobby);
        }
        if(socket.request.session){
            console.log(`Destroyed ${socket.request.session.username}'s username in session`);
            socket.request.session.username = null;
            socket.request.session.joinedCustomGame = null;
        }
    }
    delete users[socket.id];
    }catch(err){
        console.log('Error handling disconnect ', err)
    }
}

function resetInactivityTimer(io, socket) {
    try{
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
        handleDisconnect(io, socket); 
    }, 60000); // 60 seconds of inactivity
    }catch(err){
        console.log('Error when resettingInactivityTimer: ', err);
    }
}


function handleSendMessage(io, socket, message) {
    try{
    resetInactivityTimer(io, socket);
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
    }catch(err){
        console.log('Error handling send message', err)
    }
}

function broadcastLeaderboard(io, lobby) {
    try{
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
    catch(err){
        console.log('Error broadcasting leaderboard', err)
    }
}

const sendQuestion = async (io, lobby) => {
    try{
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

        resetGame(io, lobby);
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

    broadcastLeaderboard(io, lobby);

    lobby.gameTimer = setInterval(() => {
        lobby.timeLeft--;
        io.to(lobby.id).emit('update-timer', lobby.timeLeft);

        if (lobby.timeLeft <= 0) {
            clearInterval(lobby.gameTimer);
            endQuestion(io, lobby);
        }
    }, 1000);
    }
    catch(err){
        console.log('Error sending question', err)
    }
};

function clearLobbyTimers(lobby) {
    try{
    if (lobby.gameTimer) {
        clearInterval(lobby.gameTimer);
        lobby.gameTimer = null;
    }
    if (lobby.questionTimeout) {
        clearTimeout(lobby.questionTimeout);
        lobby.questionTimeout = null;
    }
    }catch(err){
        console.log('Error clearinglobbytimers ', err)
    }
}

const endQuestion = (io, lobby) => {
    try{
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
        sendQuestion(io, lobby);
    }, 5000);
    }catch(err){
        console.log('Error ending question', err)
    }
};

function resetGame(io, lobby) {
    try{
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

    
    broadcastLeaderboard(io, lobby);

    if(!lobby.isCustom){
        setTimeout(() => {
            if(lobby.players.length > 0){
                console.log(`Starting a new game for lobby: ${lobby.id}`);
                sendQuestion(io, lobby);
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
        updatePlayerList(io, lobby);
        }, 5000);
    }
    }catch(err){
        console.log('Error resetting Game', err)
    }
}

module.exports = {
    registerLobbyHandlers,
    lobbies,
};