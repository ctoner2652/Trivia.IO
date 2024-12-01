import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';

const messageInput = document.getElementById('chat-input');
const form = document.getElementById('chat-form');
const socket = io('http://localhost:3000');



const questionElement = document.getElementById('question');
const optionsContainer = document.getElementById('answer-form');
const timerElement = document.createElement('p'); 
timerElement.style.fontWeight = 'bold';
timerElement.style.marginTop = '10px';
optionsContainer.parentNode.insertBefore(timerElement, optionsContainer);

let buttonsDisabled = false;

socket.on('connect', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        console.error('No username found. Redirecting to home...');
        window.location.href = '/';
        return;
    }

    console.log('Connected to server. Username:', username);

    
    socket.emit('get-username', (serverUsername) => {
        if (serverUsername === username) {
            console.log('Rejoining as:', username);
            socket.emit('rejoin', username, (state) => {
                if (state) {
                    console.log('Restoring state:', state);
                    restoreGameState(state);
                }
            });
        } else {
            console.log('New connection. Starting fresh game.');
        }
    });
});





document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = '/';
        return;
    }

    optionsContainer.innerHTML = ''; 
    currentQuestion.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-choice';
        button.textContent = option;

        button.addEventListener('click', () => {
            if (button.disabled) return; 
            socket.emit('submit-answer', option);
            disableButtons();
        });

        optionsContainer.appendChild(button);
    });
});


function restoreGameState({ currentQuestion, timeLeft, playerAnswer }) {
    if (!currentQuestion || timeLeft === undefined) {
        console.error('Failed to restore state: Missing question or timer.');
        return;
    }

    
    questionElement.textContent = currentQuestion.question;
    optionsContainer.innerHTML = ''; 

    currentQuestion.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-choice';
        button.textContent = option;

        if (playerAnswer) {
            
            button.disabled = true;
            if (option === playerAnswer.answer) {
                button.style.backgroundColor = playerAnswer.isCorrect
                    ? 'lightgreen'
                    : 'lightcoral';
            }
        } else {
           
            button.addEventListener('click', () => {
                socket.emit('submit-answer', option);
                disableButtons();
            });
        }

        optionsContainer.appendChild(button);
    });

   
    timerElement.textContent = `${timeLeft} seconds remaining`;
}







socket.on('restore-state', ({ currentQuestion, timeLeft, playerAnswer, mainTimerEnded, transitionTimeLeft }) => {
    questionElement.textContent = currentQuestion.question;
    optionsContainer.innerHTML = ''; 

    currentQuestion.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-choice';
        button.textContent = option;

        if (playerAnswer) {
            button.disabled = true;
            if (option === playerAnswer) {
                button.style.backgroundColor = option === currentQuestion.answer ? 'lightgreen' : 'lightcoral';
            }
        }

        button.addEventListener('click', () => {
            if (!button.disabled) {
                socket.emit('submit-answer', option);
                disableButtons();
            }
        });

        optionsContainer.appendChild(button);
    });

    if (mainTimerEnded && transitionTimeLeft !== null) {
        timerElement.textContent = `Next question in ${transitionTimeLeft} seconds...`;

       
        let remaining = transitionTimeLeft;
        const transitionInterval = setInterval(() => {
            remaining--;
            timerElement.textContent = `Next question in ${remaining} seconds...`;

            if (remaining <= 0) {
                clearInterval(transitionInterval);
            }
        }, 1000);
    } else {
        timerElement.textContent = `${timeLeft} seconds remaining`;
    }
});







socket.on('answer-feedback', ({ player, isCorrect }) => {
    const feedbackElement = document.getElementById('feedback');

   
    const feedbackEntry = document.createElement('p');
    feedbackEntry.textContent = `${player} answered ${isCorrect ? 'Correctly!' : 'Incorrectly!'}`;
    feedbackEntry.style.color = isCorrect ? 'green' : 'red';

 
    feedbackElement.appendChild(feedbackEntry);

    
    feedbackElement.scrollTop = feedbackElement.scrollHeight;
});

socket.on('new-question', (questionData) => {
    const { question, options } = questionData;

    console.log('--- New Question Received ---');
    console.log('Question:', question);
    console.log('Options:', options);

    
    questionElement.textContent = question;

    
    optionsContainer.innerHTML = ''; 
    console.log('Clearing previous options...');

    options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-choice';
        button.textContent = option;

        
        button.onclick = () => {
            console.log(`Button clicked: ${option}`);
            if (!buttonsDisabled) {
                console.log(`Submitting answer: ${option}`);
                socket.emit('submit-answer', option); 
                disableButtons(); 
            }else{
                console.log('Buttons are disabled. No action taken.');
            }
        };

        optionsContainer.appendChild(button);
    });

    
    timerElement.textContent = '15 seconds remaining';
    console.log('Resetting timer to 15 seconds.');

    const feedbackElement = document.getElementById('feedback');
    if (feedbackElement) feedbackElement.textContent = '';

    console.log('--- End of New Question Handler ---');
});




socket.on('update-timer', (timeLeft) => {
    timerElement.textContent = `${timeLeft} seconds remaining`;
});

socket.on('question-ended', ({ correctAnswer, transitionTime }) => {
   
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button) => {
        button.disabled = true; 
        if (button.textContent === correctAnswer) {
            button.style.backgroundColor = 'lightgreen'; 
        } else {
            button.style.backgroundColor = 'lightcoral'; 
        }
    });

    
    let transitionLeft = transitionTime || 5; 
    timerElement.textContent = `Correct answer: ${correctAnswer}. Next question in ${transitionLeft} seconds...`;

    const transitionInterval = setInterval(() => {
        transitionLeft--;
        timerElement.textContent = `Correct answer: ${correctAnswer}. Next question in ${transitionLeft} seconds...`;

        if (transitionLeft <= 0) {
            clearInterval(transitionInterval);
            timerElement.textContent = ''; 

            
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

function enableButtons() {
    if (!buttonsDisabled) return; 
    buttonsDisabled = false;
    const buttons = optionsContainer.querySelectorAll('button');
    buttons.forEach((button) => (button.disabled = false));
}
socket.on('received-message', ({ name, message }) => {
    console.log('Received message:', name, message); 
    displayMessage(`${name}: ${message}`); 
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    
    displayMessage(`You: ${message}`);
    console.log('Sending message:', message);

    
    socket.emit('send-message', message);

    
    messageInput.value = '';
});

function displayMessage(text) {
    const div = document.createElement('div');
    div.textContent = text;
    document.getElementById('message-container').appendChild(div);
}

