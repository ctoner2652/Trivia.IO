import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';
const messageInput = document.getElementById('chat-input');
const form = document.getElementById('chat-form');
const socket = io('http://localhost:3000');
const questionElement = document.getElementById('question');
const optionsContainer = document.getElementById('answer-form');
const topBarTimer = document.querySelector('.timer');

const chatInput = document.getElementById('chat-input');
const charCounter = document.getElementById('char-counter');

socket.on('connect', () => {
    const avatar = localStorage.getItem('avatar') || 'default-avatar-url';

    // Extract customLobbyId from the current URL if available
    let customLobbyId = window.location.pathname.split('/')[2] || null;
    console.log(customLobbyId);
    if (customLobbyId) {
        localStorage.setItem('targetLobbyId', customLobbyId); // Ensure it's stored
    } else {
        customLobbyId = null; // Set to null for public games
    }

    console.log('Joining game with customLobbyId Of: ', customLobbyId);
    socket.emit('join-game', avatar, customLobbyId);
    localStorage.removeItem('targetLobbyId');
});


if (!localStorage.getItem('username')) {
    window.location.href = '/'; // Redirect to main menu
}

if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
    console.log('Page refreshed, clearing localStorage.');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/'; // Redirect to the main menu
}

chatInput.addEventListener('input', () => {
    const charCount = chatInput.value.length;
    charCounter.textContent = `${charCount}/100`;

    if (charCount >= 100) {
        charCounter.classList.add('limit-reached');
    } else {
        charCounter.classList.remove('limit-reached');
    }
});

optionsContainer.addEventListener('submit', (e) => {
    e.preventDefault();
});
let buttonsDisabled = false;

socket.on('username-exists', (username) => {

    window.location.href = '/?error=username-taken';
});

socket.on('connect_error', (error) => {
    console.error('Socket.IO connection error:', error);
});

socket.on('update-button-states', (buttonStates) => {
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button, index) => {
        const { isCorrect } = buttonStates[index];
        button.disabled = true;
    });
});

socket.on('host-status', ({ isHost }) => {
    if (isHost) {
        document.getElementById('waiting-room').style.display = 'block';

        // Enable the start game button only when 2+ players join
        socket.on('update-player-list', (players) => {
            const playerList = document.getElementById('player-list');
            playerList.innerHTML = '';
            players.forEach((player) => {
                const li = document.createElement('li');
                li.textContent = player.username;
                playerList.appendChild(li);
            });

            const startButton = document.getElementById('start-game');
            startButton.disabled = players.length < 2; // Enable only if 2+ players
        });

        // Add click listener for the start game button
        document.getElementById('start-game').addEventListener('click', () => {
            const questionCount = document.getElementById('question-count').value;
            socket.emit('start-game', { questionCount });
            document.getElementById('waiting-room').style.display = 'none';
        });

        // Add click listener for the copy URL button
        document.getElementById('copy-url').addEventListener('click', () => {
            const gameUrl = window.location.href;
            navigator.clipboard.writeText(gameUrl).then(() => {
                alert("Game URL copied to clipboard!");
            });
        });
    }
});


function displayGameOverScreen(winner, finalScores) {
    const gameOverContainer = document.getElementById('game-over-container');
    const winnerMessage = document.getElementById('winner-message');
    const finalScoresList = document.getElementById('final-scores');
    // Ensure finalScores is defined and is an array
    if (!Array.isArray(finalScores)) {
        console.error('Invalid finalScores:', finalScores);
        return;
    }

    winnerMessage.textContent = `${winner} is the Winner!`;
    finalScoresList.innerHTML = ''; // Clear previous content

    finalScores.forEach(([player, score], index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span>#${index + 1} ${player}</span> <span>${score} points</span>`;
        finalScoresList.appendChild(listItem);
    });

    gameOverContainer.style.display = 'block';
}



socket.on('received-message', ({ name, message }) => {
    if (name === 'System') {
        if (message.includes('joined')) {
            displayMessage(message, 'join');
        } else if (message.includes('left')) {
            displayMessage(message, 'leave');
        } else if (message.includes('answered')) {
            displayMessage(message, 'answer');
        }
    } else {
        displayMessage(`<span style="font-weight: 900;">${name}</span>: ${message}`, 'regular');
    }
});


socket.on('new-question', ({ question, options, questionNumber, totalQuestions }) => {
    buttonsDisabled = false;

    questionElement.textContent = question;

    optionsContainer.innerHTML = '';
    options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-choice';
        button.textContent = option;

        button.onclick = () => {
            if (!buttonsDisabled) {
                socket.emit('submit-answer', option);
                disableButtons();
            }
        };

        optionsContainer.appendChild(button);
    });

    const progressElement = document.querySelector('.progress');
    progressElement.textContent = `Question ${questionNumber} of ${totalQuestions}`;

    topBarTimer.innerHTML = `<span style="font-weight: 900;">⏱</span> 15 Seconds remaining`;
});

socket.on('game-over', ({ winner, finalScores }) => {
    const gameOverContainer = document.getElementById('game-over-container');
    displayGameOverScreen(winner, finalScores);
    setTimeout(() => {
        gameOverContainer.style.display = 'none';
        winnerMessage.innerHTML = '';
    }, 5000);
});

socket.on('sync-lobby', ({ currentQuestion, timeLeft, currentQuestionNumber, totalQuestions, chatLog, scores, avatars }) => {
    // Update the chat log
    const messageContainer = document.getElementById('message-container');
    messageContainer.innerHTML = '';
    chatLog.forEach(({ name, message, type }) => {
        displayMessage(name === 'System' ? message : `<span style="font-weight: 900;">${name}</span>: ${message}`, type);
    });

    // // Update the leaderboard
    // const leaderboard = document.getElementById('leaderboard');
    // leaderboard.innerHTML = '';
    // Object.entries(scores)
    //     .sort(([, a], [, b]) => b - a)
    //     .forEach(([player, score], index) => {
    //         const playerDiv = document.createElement('div');
    //         playerDiv.className = 'leaderboard-player';
    //         playerDiv.innerHTML = `
    //             <div class="leaderboard-rank">#${index + 1}</div>
    //             <div class="leaderboard-info">${player}: ${score} points</div>
    //             <div class="leaderboard-avatar"><img src="${avatars[player]}" /></div>
    //         `;
    //         leaderboard.appendChild(playerDiv);
    //     });

    // Update the current question and timer
    if (currentQuestion) {
        questionElement.textContent = currentQuestion.question;

        optionsContainer.innerHTML = '';
        currentQuestion.options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'answer-choice';
            button.textContent = option;
            button.onclick = () => {
                socket.emit('submit-answer', option);
                disableButtons();
            };
            optionsContainer.appendChild(button);
        });

        const progressElement = document.querySelector('.progress');
        progressElement.textContent = `Question ${currentQuestionNumber} of ${totalQuestions}`;

        topBarTimer.innerHTML = `<span style="font-weight: 900;">⏱</span> ${timeLeft} Seconds remaining`;
    }
});


document.getElementById('restart-button').addEventListener('click', () => {
    window.location.href = '/'; 
});

socket.on('update-leaderboard', (scores, avatars) => {
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = ''; 

    const sortedPlayers = Object.entries(scores).sort(([, a], [, b]) => b - a);

    sortedPlayers.forEach(([player, score], index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'leaderboard-player';

        const username = localStorage.getItem('username');
        if (player === username) {
            playerDiv.classList.add('you');
        }

        const rankDiv = document.createElement('div');
        rankDiv.className = 'leaderboard-rank';
        rankDiv.textContent = `#${index + 1}`;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'leaderboard-info';
        if (player === username) {
            infoDiv.innerHTML = `<strong>${player} (You)</strong><br><span class="leaderboard-points">${score} points</span>`;
        } else {
            infoDiv.innerHTML = `<strong>${player}</strong><br><span class="leaderboard-points">${score} points</span>`;
        }

        const avatarDiv = document.createElement('div');
        avatarDiv.innerHTML = `<img src="${avatars[player]}" class="leaderboard-avatar">`;

        playerDiv.appendChild(rankDiv);
        playerDiv.appendChild(infoDiv);
        playerDiv.appendChild(avatarDiv);

        leaderboard.appendChild(playerDiv);
    });
});

socket.on('remove-player', ({ username }) => {
    const leaderboard = document.getElementById('leaderboard');
    const playerEntries = leaderboard.querySelectorAll('.leaderboard-player');

    playerEntries.forEach((entry) => {
        const playerName = entry.querySelector('.leaderboard-info strong')?.textContent.split(" (You)")[0];
        if (playerName === username) {
            leaderboard.removeChild(entry);
        }
    });
});


socket.on('update-timer', (timeLeft) => {
    topBarTimer.innerHTML = `<span style="font-weight: 900;">⏱</span> ${timeLeft} Seconds remaining`;
});
socket.on('reset-game', ({ message, scores }) => {
    console.log(message);
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = ''; // Clear the leaderboard

    if (scores) {
        Object.keys(scores).forEach((player) => {
            scores[player] = 0; // Reset scores
        });
    } else {
        console.error('Scores are not provided!');
    }

    buttonsDisabled = false; // Allow interaction again
});


socket.on('question-ended', ({ correctAnswer, playerScores, transitionTime }) => {
    const correctAnswerElement = document.getElementById('correct-answer');
    const playerScoresList = document.getElementById('player-scores');
    const afterQuestionContainer = document.getElementById('after-question-container');

    correctAnswerElement.textContent = `The correct answer was ${correctAnswer}`;
    playerScoresList.innerHTML = '';
    playerScores.forEach(({ username, isCorrect, points }) => {
        const listItem = document.createElement('li');
        const resultText = isCorrect ? `+${points}` : `0`;
        const color = isCorrect ? 'green' : 'red';
        
        listItem.innerHTML = `<strong>${username}</strong> <span style="color:${color}">${resultText}</span>`;
        playerScoresList.appendChild(listItem);
    });

    afterQuestionContainer.style.display = 'flex';
    setTimeout(() => {
        afterQuestionContainer.style.display = 'none';
    }, transitionTime * 1000);
});

function disableButtons() {
    if (buttonsDisabled) return;
    buttonsDisabled = true;
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button) => (button.disabled = true));
}


form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    socket.emit('send-message', message);
    charCounter.textContent = `0/100`;
    messageInput.value = '';
});

function displayMessage(text, type, isEven) {    
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = text; 

    switch (type) {
        case 'join':
            div.style.color = 'green';
            break;
        case 'leave':
            div.style.color = 'red';
            break;
        case 'answer':
            div.style.backgroundColor = '#d4edda';
            div.style.color = '#155724';
            break;
        default:
            div.style.backgroundColor = isEven ? '#e0e0e0' : '#f9f9f9';
    }

    const messageContainer = document.getElementById('message-container');

    
    const allMessages = messageContainer.children;
    const totalMessages = allMessages.length;
    const calculatedEven = totalMessages % 2 === 0;

   
    if (isEven === undefined) {
        isEven = calculatedEven;
    }

    
    if (isEven) {
        div.style.backgroundColor = '#f9f9f9';
    } else {
        div.style.backgroundColor = '#e0e0e0';
    }

   
    

    
    messageContainer.appendChild(div);

    
    messageContainer.scrollTop = messageContainer.scrollHeight;
}






