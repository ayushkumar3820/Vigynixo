const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const app = express();
const cors = require('cors'); 
const port = 3001;




app.use(cors()); 

app.use(bodyParser.json());

const mongoUrl = 'mongodb://127.0.0.1:27017'; 
const dbName = 'taskManagementDB';
let db;
let tasksCollection;

function validateAndFormatTaskData(taskData) {

  if (!taskData.taskNumber.match(/^L\d{6}$/)) {
    throw new Error('Invalid taskNumber format. It should start with L followed by 6 digits.');
  }

  
  const timeEstimate = parseFloat(taskData.timeEstimate);
  if (isNaN(timeEstimate)) {
    throw new Error('Invalid timeEstimate format. It should be a decimal number.');
  }


  taskData.timeEstimate = Math.ceil(timeEstimate);

  

  return taskData;
}
async function startServer() {
  try {
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected successfully');
    db = client.db(dbName);
    tasksCollection = db.collection('tasks');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    
  }
}

startServer();

app.get('/tasks', async (req, res) => {
  try {
    const tasks = await tasksCollection.find().toArray();
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/tasks', async (req, res) => {
  const newTask = req.body;
  console.log(newTask)
  try {
    const existingTask = await tasksCollection.findOne({ taskNumber: newTask.taskNumber });
    if (existingTask) {
      return res.status(400).json({ error: 'Task already exists' });
    }
    const processedData = validateAndFormatTaskData(newTask);
    console.log(processedData)
    const result = 
    await tasksCollection.insertOne(processedData);
    console.log(result);
    const insertedTask = result;
    res.status(201).json(insertedTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const tasks = [];

app.get('/tasks/:taskNumber', async (req, res) => {
  const taskNumber = req.params.taskNumber;
  try {
    const task = await tasksCollection.findOne({ taskNumber });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/tasks/:taskNumber/entries', (req, res) => {
  const task = tasks.find((t) => t.taskNumber === req.params.taskNumber);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }
  const { hours, notes } = req.body;
  task.entries.push({ hours, notes });
  res.json({ message: 'Entry added successfully' });
});


app.post('/api/tasks/:taskNumber/complete', (req, res) => {
  const taskNumber = req.params.taskNumber;
  const { totalHours, finalNotes } = req.body;

 
  const task = tasks.find((t) => t.taskNumber === taskNumber);
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

 
  task.isCompleted = true;
  task.totalHours = totalHours;
  task.finalNotes = finalNotes;

  return res.json(task);
});
app.put('/tasks/:taskNumber', async (req, res) => {
  const taskNumber = req.params.taskNumber;
  const updatedTaskData = req.body; 

  try {
    const existingTask = await tasksCollection.findOne({ taskNumber });
    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const updateResult = await tasksCollection.updateOne(
      { taskNumber },
      { $set: updatedTaskData }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).json({ error: 'Task not updated' });
    }

    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});