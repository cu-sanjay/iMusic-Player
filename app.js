import express from 'express';
import ytdl from 'ytdl-core';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/convert-mp3', async (req, res) => {
  const videoURL = req.body.url;

  try {
    if (!ytdl.validateURL(videoURL)) {
      return res.status(400).send('Invalid YouTube URL');
    }

    const info = await ytdl.getInfo(videoURL);
    let title = info.videoDetails.title
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);

    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    ffmpeg()
      .input(ytdl(videoURL, { quality: 'highestaudio' }))
      .setFfmpegPath(ffmpegPath)
      .format('mp3')
      .audioBitrate(128)
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        res.status(500).send('Error during conversion');
      })
      .pipe(res, { end: true });

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to process request.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
