import express from 'express';
import cors from 'cors';
import { pipeline } from '@xenova/transformers';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

let embedder = null;
let currentModel = null;

async function getEmbedder(modelName) {
  if (!embedder || currentModel !== modelName) {
    currentModel = modelName || 'Xenova/all-MiniLM-L6-v2';
    embedder = await pipeline('feature-extraction', currentModel, {
      quantized: true,
    });
  }
  return embedder;
}

app.post('/embed', async (req, res) => {
  try {
    const { text, model } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const mdl = model && typeof model === 'string' ? model : 'Xenova/all-MiniLM-L6-v2';
    const emb = await getEmbedder(mdl);
    const output = await emb(text, { pooling: 'mean', normalize: true });
    const arr = Array.from(output.data);
    return res.json({ embedding: arr });
  } catch (e) {
    console.error('embed error:', e);
    return res.status(500).json({ error: 'embedding_failed' });
  }
});

const port = process.env.PORT || 8088;
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => {
  console.log(`Embedding server running at http://${host}:${port}`);
});
