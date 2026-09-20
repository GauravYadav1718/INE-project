import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router as productsRouter } from './api/products.js';
import { router as searchRouter } from './api/search.js';
import { router as cronRouter } from './api/cron.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/search', searchRouter);
app.use('/api/cron', cronRouter);

// Health check endpoint (also used as keep-warm)
app.get('/api/health', (req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`[Server] API Running on port ${port}`);
});
