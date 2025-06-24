const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'trivia.txt'); // your input file here
const outputFile = path.join(__dirname, 'converted_questions.json');

function parseQuestions(text) {
    const lines = text.split('\n');
    const questions = [];

    let currentQuestionLines = [];
    let correctAnswer = null;
    let options = [];
    let collecting = false;

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('#')) {
            // Start new block
            if (currentQuestionLines.length && correctAnswer && options.length > 1) {
                const fullQuestion = currentQuestionLines.join(' ').replace(/^Q\s*/i, '');
                questions.push({
                    question: fullQuestion,
                    options,
                    answer: correctAnswer,
                    category: "For-Kids",
                    difficulty: "easy"
                });
            }
            // Reset for new question
            currentQuestionLines = [line.substring(1).trim()];
            correctAnswer = null;
            options = [];
            collecting = true;
        } else if (line.startsWith('^') && collecting) {
            correctAnswer = line.substring(1).trim();
        } else if (/^[A-Z]\s/.test(line) && collecting) {
            options.push(line.substring(1).trim());
        } else if (collecting && !line.startsWith('^')) {
            currentQuestionLines.push(line);
        }
    }

    // Final push for last block
    if (currentQuestionLines.length && correctAnswer && options.length > 1) {
        const fullQuestion = currentQuestionLines.join(' ').replace(/^Q\s*/i, '');
        questions.push({
            question: fullQuestion,
            options,
            answer: correctAnswer,
            category: "Video-Games",
            difficulty: "easy"
        });
    }

    return questions;
}

fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) throw err;

    const parsed = parseQuestions(data);
    fs.writeFile(outputFile, JSON.stringify(parsed, null, 2), err => {
        if (err) throw err;
        console.log(`✅ Converted ${parsed.length} questions to ${outputFile}`);
    });
});

