import express from 'express';
import cors from 'cors';
import ogs from 'open-graph-scraper';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Main endpoint to fetch link preview
app.post('/api/preview', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const options = { url, timeout: 8000 };
    const { result } = await ogs(options);

    res.json({
      success: true,
      title: result.ogTitle || result.twitterTitle || 'No title available',
      description: result.ogDescription || result.twitterDescription || '',
      image: result.ogImage?.[0]?.url || result.twitterImage || '',
      url: url
    });

  } catch (error) {
    console.error('Preview fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preview',
      title: 'Unable to load preview',
      description: url,
      image: ''
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});