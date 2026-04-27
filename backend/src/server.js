require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pressureRoutes = require('./routes/pressure');
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/users');
const sessionsRoutes = require('./routes/sessions');
const readingsRoutes = require('./routes/readings');
const snapshotsRoutes = require('./routes/snapshots');
const alertsRoutes = require('./routes/alerts');
const chatRoutes = require('./routes/chat');
const trackerRoutes = require('./routes/tracker');

const app = express();

app.use(cors());
app.use((req, res, next) => {
  console.log(`[http] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(express.json({ limit: '2mb' })); // raw 16x16 grids fit, but give headroom

app.use('/pressure', pressureRoutes);
app.use('/settings', settingsRoutes);
app.use('/users', userRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/readings', readingsRoutes);
app.use('/snapshots', snapshotsRoutes);
app.use('/alert-events', alertsRoutes);
app.use('/chat', chatRoutes);
app.use('/tracker', trackerRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
