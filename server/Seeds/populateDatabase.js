const mongoose = require('mongoose');
const fetchQuestionsFromDirectURL = require('./fetchQuestionsFromAPI'); 
const Question = require('../models/Question'); 

mongoose.connect("mongodb+srv://colbyjacob8:UWPaDmswwxlC0yzb@trivl.vf8sm.mongodb.net/?retryWrites=true&w=majority&appName=Trivl", {
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

  const populateDatabase = async (directUrl) => {
    try {
        console.log(`Fetching questions from the provided URL: ${directUrl}`);

        const questions = await fetchQuestionsFromDirectURL(directUrl);

        if (!questions || questions.length === 0) {
            console.warn("No questions returned or fetched.");
            return; // Safely exit if no questions are fetched
        }

        await Question.insertMany(questions, { ordered: false }).catch((err) => {
            if (err.code !== 11000) { // Ignore duplicate key errors
                console.error("Error inserting questions:", err);
            }
        });

        console.log(`Inserted ${questions.length} unique questions from the provided URL.`);
    } catch (error) {
        console.error('Error during database population:', error);
    } finally {
        mongoose.disconnect();
    }
};

// Example Usage: Replace the URL below with your actual API endpoint
const directUrl = "https://opentdb.com/api.php?amount=15&category=13&type=multiple";
populateDatabase(directUrl);
