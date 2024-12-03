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

        // if (isCorrect) {
        //     button.style.backgroundColor = 'lightgreen'; 
        // } else {
        //     button.style.backgroundColor = 'lightcoral'; 
        // }
    });
});
socket.on('restore-state', ({ currentQuestion, timeLeft, playerAnswer, mainTimerEnded, transitionTimeLeft, chatLog }) => {
    questionElement.textContent = currentQuestion.question;
    optionsContainer.innerHTML = '';

    currentQuestion.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-choice';
        button.textContent = option;

        if (playerAnswer) {
            button.disabled = true;

            
            // if (option === currentQuestion.answer) {
            //     button.style.backgroundColor = 'lightgreen'; 
            // } else {
            //     button.style.backgroundColor = 'lightcoral'; 
            // }
        }

        button.addEventListener('click', () => {
            if (!button.disabled) {
                socket.emit('submit-answer', option);
                 ;
            }
        });

        optionsContainer.appendChild(button);
    });

   
    

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
        console.log('Restoring Chat Message', log.name, log.message);
    
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
    

});



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


socket.on('new-question', (questionData) => {
    buttonsDisabled = false;
    const { question, options } = questionData;


    
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
            }else{
                console.log('Buttons are disabled. No action taken.');
            }
        };

        optionsContainer.appendChild(button);
    });

    
    topBarTimer.textContent = `⏱ 15 Seconds remaining`;

    const feedbackElement = document.getElementById('feedback');
    if (feedbackElement) feedbackElement.textContent = '';

});

socket.on('update-leaderboard', (scores) => {
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = ''; 

    
    const sortedPlayers = Object.entries(scores).sort(([, a], [, b]) => b - a);

    
    sortedPlayers.forEach(([player, score]) => {
        const li = document.createElement('li');
        const username = localStorage.getItem('username');
        
        
        li.textContent = player === username ? `${player}(You): ${score} points` : `${player}: ${score} points`;
        if (player === username) {
            li.style.fontWeight = 'bold'; 
        }
        leaderboard.appendChild(li);
    });
});

socket.on('remove-player', ({ username }) => {
    const leaderboard = document.getElementById('leaderboard');
    const playerEntries = leaderboard.querySelectorAll('li');
    
    playerEntries.forEach(entry => {
        if (entry.textContent.includes(username)) {
            entry.remove(); 
        }
    });
});

socket.on('update-timer', (timeLeft) => {
    topBarTimer.textContent = `⏱ ${timeLeft} Seconds remaining`;
});

socket.on('question-ended', ({ correctAnswer, transitionTime }) => {
   
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button) => {
        console.log('hello');
        button.disabled = true; 
        // if (button.textContent === correctAnswer) {
        //     button.style.backgroundColor = 'lightgreen'; 
        // } else {
        //     button.style.backgroundColor = 'lightcoral'; 
        // }
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

    // Hide the after-question overlay after 5 seconds
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




