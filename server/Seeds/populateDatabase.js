const fs = require('fs/promises');
const { MongoClient } = require('mongodb');

async function importQuestions() {
  // 1. Read & parse the JSON file
  const filePath = './converted_questions_difficulty_finalized.json'; // adjust path
  let raw;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    console.error('Error reading JSON file:', err);
    process.exit(1);
  }

  let questions;
  try {
    questions = JSON.parse(raw);
    if (!Array.isArray(questions)) {
      throw new Error('JSON is not an array');
    }
  } catch (err) {
    console.error('Error parsing JSON:', err);
    process.exit(1);
  }

  // 2. Connect to MongoDB
  // Replace with your connection string and DB/collection names
  const uri = 'mongodb+srv://colbyjacob8:UWPaDmswwxlC0yzb@trivl.vf8sm.mongodb.net/?retryWrites=true&w=majority&appName=Trivl'; 
  const dbName = 'test'; 
  const collName = 'questions';

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const collection = db.collection(collName);

    // Optional: if you want to clear existing documents first:
    // await collection.deleteMany({});
    // console.log('Cleared existing documents in collection');

    // 3. Insert data
    // Option A: insertMany all at once
    const result = await collection.insertMany(questions);
    console.log(`Inserted ${result.insertedCount} questions.`);

    // Option B: if you want to upsert or avoid duplicates by question text, you'd loop and use updateOne with upsert:
    // for (const q of questions) {
    //   await collection.updateOne(
    //     { question: q.question }, 
    //     { $set: q }, 
    //     { upsert: true }
    //   );
    // }
    // console.log('Upserted questions by question text.');

  } catch (err) {
    console.error('Error during MongoDB operation:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

importQuestions();
