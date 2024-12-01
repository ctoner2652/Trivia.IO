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
socket.on('restore-state', ({ currentQuestion, timeLeft, playerAnswer, mainTimerEnded, transitionTimeLeft, chatLog }) => {
    questionElement.textContent = currentQuestion.question;
    optionsContainer.innerHTML = '';

    currentQuestion.options.forEach((option) => {
        const button = document.createElement('button');
        button.className = 'answer-choice';
        button.textContent = option;

        if (playerAnswer) {
            button.disabled = true;

            
            if (option === currentQuestion.answer) {
                button.style.backgroundColor = 'lightgreen'; 
            } else {
                button.style.backgroundColor = 'lightcoral'; 
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

    if (playerAnswer) {
        const username = localStorage.getItem('username');
        const feedbackElement = document.getElementById('feedback');
        feedbackElement.innerHTML = '';
        const feedbackText = document.createElement('span');
        feedbackText.textContent = `${username} answered: ${playerAnswer === currentQuestion.answer ? 'Correct!' : 'Incorrect!'}`;
        feedbackText.style.color = playerAnswer === currentQuestion.answer ? 'lightgreen' : 'lightcoral';
        feedbackElement.appendChild(feedbackText);
    }
    

    console.log(`Tranisition time left: `, transitionTimeLeft);
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
    for(let log of chatLog){
        console.log('Restoring Chat Message', log.name, log.message);
        const username = localStorage.getItem('username');
        if(log.name === username){
            log.name = 'You';
        }
        displayMessage(`${log.name}: ${log.message}`);
    }

});



socket.on('received-message', ({ name, message }) => {
        displayMessage(`${name}: ${message}`);   
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

