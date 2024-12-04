import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';
const messageInput = document.getElementById('chat-input');
const form = document.getElementById('chat-form');
const socket = io('http://localhost:3000');
const questionElement = document.getElementById('question');
const optionsContainer = document.getElementById('answer-form');
const topBarTimer = document.querySelector('.timer');


optionsContainer.addEventListener('submit', (e) => {
    e.preventDefault();
});
let buttonsDisabled = false;

socket.on('username-exists', (username) => {

    window.location.href = '/?error=username-taken';
});

socket.on('update-button-states', (buttonStates) => {
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button, index) => {
        const { isCorrect } = buttonStates[index];
        button.disabled = true;
    });
});
socket.on('restore-state', ({ currentQuestion, timeLeft, playerAnswer, mainTimerEnded, 
    transitionTimeLeft, chatLog, totalQuestions, currentQuestionNumber, currentScreen, afterQuestionData, gameOverData}) => {
    const gameOverContainer = document.getElementById('game-over-container');
    if (currentScreen !== "game-over" && gameOverContainer.style.display === 'block') {
        gameOverContainer.style.display = 'none';
    }
    if (currentQuestion && timeLeft !== undefined) {
        questionElement.textContent = currentQuestion.question;
        optionsContainer.innerHTML = '';
        currentQuestion.options.forEach((option) => {
            const button = document.createElement('button');
            button.className = 'answer-choice';
            button.textContent = option;

            if (playerAnswer) {
                button.disabled = true; 
            } else {
                button.onclick = () => {
                    socket.emit('submit-answer', option);
                    disableButtons();
                };
            }

            optionsContainer.appendChild(button);
        });
        topBarTimer.textContent = `⏱ ${timeLeft} Seconds remaining`;
        const progressElement = document.querySelector('.progress');
        progressElement.textContent = `Question ${currentQuestionNumber} of ${totalQuestions}`;
    }
    if (currentScreen === "after-question" && afterQuestionData) {
        const { correctAnswer, playerScores } = afterQuestionData;
        const correctAnswerElement = document.getElementById('correct-answer');
        const playerScoresList = document.getElementById('player-scores');
        const afterQuestionContainer = document.getElementById('after-question-container');

        correctAnswerElement.textContent = `The correct answer was ${correctAnswer}`;
        playerScoresList.innerHTML = '';
        playerScores.forEach(([player, { isCorrect, points }]) => {
            const listItem = document.createElement('li');
            const resultText = isCorrect ? `+${points}` : `0`;
            const color = isCorrect ? 'green' : 'red';
            listItem.innerHTML = `<strong>${player}</strong> <span style="color:${color}">${resultText}</span>`;
            playerScoresList.appendChild(listItem);
        });
        afterQuestionContainer.style.display = 'flex';
        console.log('Here is the current screen: ',currentScreen);
        if(currentScreen === 'game-over'){
            afterQuestionContainer.style.display = 'none';
        }
        setTimeout(() => {
        afterQuestionContainer.style.display = 'none';
        }, 5000);
        
    }
    if (currentScreen === "game-over" && gameOverData) {
        displayGameOverScreen(gameOverData.winner, gameOverData.finalScores);
    }
    if (mainTimerEnded && transitionTimeLeft !== null) {
        
        
        let remaining = transitionTimeLeft;
        const transitionInterval = setInterval(() => {
            remaining--;
            
            if (remaining <= 0) {
                clearInterval(transitionInterval);
            }
        }, 1000);
    } else {
        topBarTimer.textContent = `⏱ ${timeLeft} Seconds remaining`;
    }
    let isEven = true; 

    for (let log of chatLog) {
    
        const username = localStorage.getItem('username');
        const isCurrentUser = log.name === username;
    
        if (log.name === 'System') {
            
            displayMessage(log.message, log.type);
        } else {
            
            displayMessage(
                `<span style="font-weight: bold;">${isCurrentUser ? username : log.name}</span>: ${log.message}`,
                log.type,
                isEven
            );
        }
    
        isEven = !isEven; 
    }
    const progressElement = document.querySelector('.progress');
    progressElement.textContent = `Question ${currentQuestionNumber} of ${totalQuestions}`;

});
function displayGameOverScreen(winner, finalScores) {
    const gameOverContainer = document.getElementById('game-over-container');
    const winnerMessage = document.getElementById('winner-message');
    const finalScoresList = document.getElementById('final-scores');

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
        displayMessage(`<span style="font-weight: bold;">${name}</span>: ${message}`, 'regular');
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

    topBarTimer.textContent = `⏱ 15 Seconds remaining`;
});

socket.on('game-over', ({ winner, finalScores }) => {
    const gameOverContainer = document.getElementById('game-over-container');
    const winnerMessage = document.getElementById('winner-message');
    const finalScoresList = document.getElementById('final-scores');
    const questionElement = document.getElementById('question'); 
    const optionsContainer = document.getElementById('answer-form'); 
    questionElement.textContent = '';
    optionsContainer.innerHTML = '';
    winnerMessage.innerHTML = `${winner ? `<strong>${winner}</strong> is the Winner!` : "No winner this time!"}`;
    const readyMessage = document.createElement('p');
    readyMessage.textContent = "Get ready for the next round...";
    readyMessage.style.fontSize = "16px";
    readyMessage.style.marginTop = "10px";
    readyMessage.style.color = "#cccccc"; 
    winnerMessage.appendChild(readyMessage);
    finalScoresList.innerHTML = '';
    finalScores.forEach(([player, score], index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span>#${index + 1} ${player}</span> <span>${score} points</span>`;
        finalScoresList.appendChild(listItem);
    });
    gameOverContainer.style.display = 'block';
    setTimeout(() => {
        gameOverContainer.style.display = 'none';
        winnerMessage.innerHTML = '';
    }, 7000);
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

socket.on('connect', () =>{
    socket.emit('join-game', localStorage.getItem("avatar"));
})
socket.on('update-timer', (timeLeft) => {
    topBarTimer.textContent = `⏱ ${timeLeft} Seconds remaining`;
});
socket.on('reset-game', () => {
    const gameOverContainer = document.getElementById('game-over-container');
    gameOverContainer.style.display = 'none';
    const winnerMessage = document.getElementById('winner-message');
    if (winnerMessage) winnerMessage.innerHTML = '';
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = '';

    Object.keys(scores).forEach((player) => {
        scores[player] = 0; 
    });

    socket.emit('update-leaderboard', scores);
    buttonsDisabled = false;
});
socket.on('question-ended', ({ correctAnswer, transitionTime }) => {
   
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button) => {
        console.log('hello');
        button.disabled = true; 
    });

    
    let transitionLeft = transitionTime || 5; 
   
    const transitionInterval = setInterval(() => {
        transitionLeft--;
        
        if (transitionLeft <= 0) {
            clearInterval(transitionInterval);
            
            topBarTimer.textContent = `⏱`;

            
            buttons.forEach((button) => {
                button.style.backgroundColor = ''; 
            });
        }
    }, 1000);
});


function disableButtons() {
    if (buttonsDisabled) return;
    buttonsDisabled = true;
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button) => (button.disabled = true));
}

socket.on('after-question', ({ correctAnswer, playerScores }) => {
    const correctAnswerElement = document.getElementById('correct-answer');
    correctAnswerElement.textContent = `The correct answer was ${correctAnswer}`;
    const playerScoresList = document.getElementById('player-scores');
    playerScoresList.innerHTML = '';

    playerScores.forEach(([player, { isCorrect, timeTaken, points }]) => {
        const listItem = document.createElement('li');
        const resultText = isCorrect ? `+${points}` : `0`;
        const color = isCorrect ? 'green' : 'red';
        const timeInfo = timeTaken !== 'No Answer' ? ` | Time: ${timeTaken} seconds` : ' | No Answer';
        
        listItem.innerHTML = `<strong>${player}</strong> <span style="color:${color}">${resultText}</span>`;
        playerScoresList.appendChild(listItem);
    });
    const afterQuestionContainer = document.getElementById('after-question-container');
    afterQuestionContainer.style.display = 'flex';
    setTimeout(() => {
        afterQuestionContainer.style.display = 'none';
    }, 5000);
});





form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    socket.emit('send-message', message);

    messageInput.value = '';
});



function displayMessage(text, type, isEven) {
    const div = document.createElement('div');

    div.innerHTML = text;

    const messageContainer = document.getElementById('message-container');
    if(!isEven){
        isEven = messageContainer.childElementCount % 2 === 0;
    }
    

    if (isEven) {
        div.style.backgroundColor = '#f9f9f9'; 
    } else {
        div.style.backgroundColor = '#e0e0e0'; 
    }

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

    document.getElementById('message-container').appendChild(div);


    document.getElementById('message-container').scrollTop = document.getElementById('message-container').scrollHeight;
}




