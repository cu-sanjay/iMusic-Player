import express from 'express';
import youtubedl from 'youtube-dl-exec';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
  try {
    const videoUrl = req.body.url;
    const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    if (!videoIdMatch) return res.status(400).send('Invalid YouTube URL');

    // Get video metadata
    const metadata = await youtubedl(videoUrl, {
      dumpSingleJson: true
    });

    let videoTitle = metadata.title || 'utubemusic_audio';
    videoTitle = videoTitle.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');

    res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const subprocess = youtubedl.exec(videoUrl, {
      format: 'bestaudio[ext=m4a]/bestaudio/best',
      output: '-',
      quiet: true
    });

    subprocess.stdout.pipe(res);

    subprocess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    subprocess.on('close', (code) => {
      if (code !== 0) {
        console.error(`yt-dlp exited with code ${code}`);
        res.status(500).send('Error during download.');
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
