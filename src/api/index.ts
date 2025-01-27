import express from 'express';
import cors from 'cors';
import audioAnalysisRouter from './audio-analysis';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/audio', audioAnalysisRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Parseq API server running on port ${PORT}`);
});

export default app;
