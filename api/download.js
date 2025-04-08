import axios from 'axios';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import ytdl from 'ytdl-core';
import { v4 as uuidv4 } from 'uuid';

const pipelineAsync = promisify(pipeline);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get video info
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (audioFormats.length === 0) {
      return res.status(400).json({ error: 'No audio formats available' });
    }

    // Get the best audio format
    const audioFormat = ytdl.chooseFormat(audioFormats, { quality: 'highestaudio' });
    
    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // Stream the audio
    ytdl(url, { format: audioFormat })
      .on('error', (err) => {
        console.error('Download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download audio' });
        }
      })
      .pipe(res);

  } catch (error) {
    console.error('Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to process request',
        details: error.message 
      });
    }
  }
}