import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';
const messageInput = document.getElementById('chat-input');
const form = document.getElementById('chat-form');
const socket = io(
    window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : window.location.origin,
    {
        transports: ["websocket", "polling"],
    }
);

const questionElement = document.getElementById('question');
const optionsContainer = document.getElementById('answer-form');
const topBarTimer = document.querySelector('.timer');

const chatInput = document.getElementById('chat-input');
const charCounter = document.getElementById('char-counter');

const categories = [
    { id: "any", name: "Any Category" },
    { id: "9", name: "General Knowledge" },
    { id: "10", name: "Entertainment: Books" },
    { id: "11", name: "Entertainment: Film" },
    { id: "12", name: "Entertainment: Music" },
    { id: "13", name: "Entertainment: Musicals & Theatres" },
    { id: "14", name: "Entertainment: Television" },
    { id: "15", name: "Entertainment: Video Games" },
    { id: "16", name: "Entertainment: Board Games" },
    { id: "17", name: "Science & Nature" },
    { id: "18", name: "Science: Computers" },
    { id: "19", name: "Science: Mathematics" },
    { id: "20", name: "Mythology" },
    { id: "21", name: "Sports" },
    { id: "22", name: "Geography" },
    { id: "23", name: "History" },
    { id: "24", name: "Politics" },
    { id: "25", name: "Art" },
    { id: "26", name: "Celebrities" },
    { id: "27", name: "Animals" },
    { id: "28", name: "Vehicles" },
    { id: "29", name: "Entertainment: Comics" },
    { id: "30", name: "Science: Gadgets" },
    { id: "31", name: "Entertainment: Japanese Anime & Manga" },
    { id: "32", name: "Entertainment: Cartoon & Animations" }
];

function updateAppHeight() {
    const appHeight = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${appHeight}px`);
}

updateAppHeight();
window.addEventListener('resize', updateAppHeight);

if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    window.addEventListener('resize', () => {
        document.documentElement.style.setProperty('--ios-height', `${window.innerHeight}px`);
    });
}


socket.on('connect', () => {
    const avatar = localStorage.getItem('avatar') || 'default-avatar-url';

    
    let customLobbyId = window.location.pathname.split('/')[2] || null;
    console.log(customLobbyId);
    if (customLobbyId) {
        localStorage.setItem('targetLobbyId', customLobbyId); 
    } else {
        customLobbyId = null; 
    }

    console.log('Joining game with customLobbyId Of: ', customLobbyId);
    socket.emit('join-game', avatar, customLobbyId);
    localStorage.removeItem('targetLobbyId');
});


if (!localStorage.getItem('username')) {
    window.location.href = '/'; 
}

if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
    console.log('Page refreshed, clearing localStorage.');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/'; 
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

        
        socket.on('update-player-list', (players) => {
            const playerList = document.getElementById('player-list');
            playerList.innerHTML = '';
            players.forEach((player) => {
                const li = document.createElement('li');
                li.textContent = player.username;
                playerList.appendChild(li);
            });

            const startButton = document.getElementById('start-game');
            startButton.disabled = players.length < 2; 
        });

        
        document.getElementById('start-game').addEventListener('click', () => {
            const questionCount = document.getElementById('question-count').value;
            const selectedCategory = document.getElementById('category-select').value;
            const selectedDifficulty = document.getElementById('difficulty-select').value;
            socket.emit('start-game', { questionCount, selectedCategory, selectedDifficulty});
            document.getElementById('waiting-room').style.display = 'none';
        });

        
        document.getElementById('copy-url').addEventListener('click', () => {
            const gameUrl = window.location.href;
            navigator.clipboard.writeText(gameUrl).then(() => {
                alert("Game URL copied to clipboard!");
            });
        });
    }
});


const categorySelect = document.getElementById('category-select');
categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    categorySelect.appendChild(option);
});

function displayGameOverScreen(winner, finalScores) {
    const gameOverContainer = document.getElementById('game-over-container');
    const winnerMessage = document.getElementById('winner-message');
    const finalScoresList = document.getElementById('final-scores');
    
    if (!Array.isArray(finalScores)) {
        console.error('Invalid finalScores:', finalScores);
        return;
    }

    winnerMessage.textContent = `${winner} is the Winner!`;
    finalScoresList.innerHTML = ''; 

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
        button.className = 'answer-choice rounded';
        button.textContent = option;

        button.onclick = () => {
            if (!buttonsDisabled) {
                socket.emit('submit-answer', option);
                disableButtons();
            }
        };

        optionsContainer.appendChild(button);
    });

    const progressElement = document.querySelector('.question-count');
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
    
    const messageContainer = document.getElementById('message-container');
    messageContainer.innerHTML = '';
    chatLog.forEach(({ name, message, type }) => {
        displayMessage(name === 'System' ? message : `<span style="font-weight: 900;">${name}</span>: ${message}`, type);
    });
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

        const progressElement = document.querySelector('.question-count');
        progressElement.textContent = `Question ${currentQuestionNumber} of ${totalQuestions}`;

        topBarTimer.innerHTML = `<span style="font-weight: 900;">⏱</span> ${timeLeft} Seconds remaining`;
    }
});


document.getElementById('restart-button').addEventListener('click', () => {
    socket.close();
    localStorage.clear();
    sessionStorage.clear();
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
    leaderboard.innerHTML = ''; 

    if (scores) {
        Object.keys(scores).forEach((player) => {
            scores[player] = 0; 
        });
    } else {
        console.error('Scores are not provided!');
    }

    buttonsDisabled = false; 
});


socket.on('question-ended', ({ correctAnswer, playerScores, transitionTime }) => {
    const correctAnswerElement = document.getElementById('correct-answer');
    const playerScoresList = document.getElementById('player-scores');
    const afterQuestionContainer = document.getElementById('after-question-container');

    correctAnswerElement.textContent = `The correct answer was ${correctAnswer}`;
    playerScoresList.innerHTML = '';
    playerScores.forEach(({ username, isCorrect, points }) => {
        const listItem = document.createElement('li');
        listItem.classList.add('player-score');
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






