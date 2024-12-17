const axios = require('axios');
const he = require('he'); 
const Question = require('../models/Question'); 

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fetchQuestionsFromDirectURL = async (url) => {
    try {
        const response = await axios.get(url);
        const data = response.data;

        if (!data || !data.results || !Array.isArray(data.results)) {
            console.warn("Invalid or empty data returned from the API:", data);
            return []; // Return an empty array to prevent undefined errors
        }

        return data.results.map((item) => ({
            question: he.decode(item.question),
            options: shuffleArray([
                ...item.incorrect_answers.map(he.decode),
                he.decode(item.correct_answer),
            ]),
            answer: he.decode(item.correct_answer),
            category: item.category || 'General Knowledge',
            difficulty: item.difficulty || 'medium',
        }));
    } catch (error) {
        console.error("Error fetching questions from the API:", error.message);
        return [];
    }
};

// Function to deduplicate and insert questions into the database
const insertUniqueQuestions = async (questions) => {
    const insertedQuestions = [];

    for (const question of questions) {
        // Check if a question with the same text already exists in the database
        const existingQuestion = await Question.findOne({ question: question.question });
        if (!existingQuestion) {
            const newQuestion = new Question(question);
            await newQuestion.save();
            insertedQuestions.push(question);
        }
    }

    console.log(`Inserted ${insertedQuestions.length} questions into the database.`);
    return insertedQuestions.length;
};

// Function to continuously fetch all unique questions
const fetchAllUniqueQuestionsFromURL = async (directUrl, maxQuestions = 3500) => {
    let allSeenQuestions = new Set();
    let totalInserted = 0;
    let iteration = 1;

    console.log("Starting to fetch questions from the direct URL:", directUrl);

    while (totalInserted < maxQuestions) {
        console.log(`Fetching batch ${iteration}...`);

        const questions = await fetchQuestionsFromDirectURL(directUrl);
        if (questions.length === 0) {
            console.log("No more questions returned from the API. Exiting.");
            break;
        }

        // Deduplicate locally
        const uniqueQuestions = questions.filter((q) => !allSeenQuestions.has(q.question));
        uniqueQuestions.forEach((q) => allSeenQuestions.add(q.question));

        console.log(`Found ${uniqueQuestions.length} new unique questions in this batch.`);

        // Check database for actual duplicates before inserting
        const insertedCount = await insertUniqueQuestions(uniqueQuestions);
        totalInserted += insertedCount;

        console.log(`Inserted ${insertedCount} new questions. Total inserted so far: ${totalInserted}`);

        // Break if no new questions were inserted
        if (insertedCount === 0) {
            console.log("No new unique questions to insert. Exiting.");
            break;
        }

        iteration++;
        await delay(2000); // Add delay to avoid rate-limiting
    }

    console.log(`Finished fetching. Total questions inserted: ${totalInserted}`);
};

module.exports = fetchAllUniqueQuestionsFromURL;
