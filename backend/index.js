const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error(err));

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const TaskSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', TaskSchema);

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ msg: 'No token' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'Invalid token' });
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: payload.id };
        next();
    } catch (err) {
        return res.status(401).json({ msg: 'Token invalid' });
    }
};

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ msg: 'Missing fields' });
        if (!isDatabaseReady()) return res.status(503).json({ msg: 'Database not connected' });
        const exists = await User.findOne({ username });
        if (exists) return res.status(400).json({ msg: 'Username taken' });
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const user = await User.create({ username, password: hash });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ msg: 'Missing fields' });
        if (!isDatabaseReady()) return res.status(503).json({ msg: 'Database not connected' });
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
    try {
        const { title, priority } = req.body;
        if (!title) return res.status(400).json({ msg: 'Title required' });
        if (!isDatabaseReady()) return res.status(503).json({ msg: 'Database not connected' });
        const newTask = await Task.create({ title, priority: priority || 0, user: req.user.id });
        res.json(newTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
});

app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
        if (!isDatabaseReady()) return res.status(503).json({ msg: 'Database not connected' });
        const tasks = await Task.find({ user: req.user.id }).sort({ priority: -1, createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
});

app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        if (!isDatabaseReady()) return res.status(503).json({ msg: 'Database not connected' });
        const updates = {};
        const { title, priority, completed } = req.body;
        if (title !== undefined) updates.title = title;
        if (priority !== undefined) updates.priority = priority;
        if (completed !== undefined) updates.completed = completed;
        const task = await Task.findOneAndUpdate({ _id: id, user: req.user.id }, updates, { new: true });
        if (!task) return res.status(404).json({ msg: 'Not found' });
        res.json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
});

app.delete('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        if (!isDatabaseReady()) return res.status(503).json({ msg: 'Database not connected' });
        const task = await Task.findOneAndDelete({ _id: id, user: req.user.id });
        if (!task) return res.status(404).json({ msg: 'Not found' });
        res.json({ msg: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});