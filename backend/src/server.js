require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pressureRoutes = require('./routes/pressure');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/pressure', pressureRoutes);
app.use('/settings', settingsRoutes);
app.use('/users', userRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
