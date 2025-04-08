import express from 'express';
import ytDlp from 'youtube-dl-exec';
import path from 'path';
import os from 'os';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.render("index");
});

app.post('/extract-audio', async (req, res) => {
  try {
    const streamLink = req.body.url;
    const streamIdMatch = streamLink.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    if (!streamIdMatch) return res.status(400).send('Invalid video URL');

    let audioTitle = await ytDlp(streamLink, {
      print: '%(title)s',
      // cookies removed for Vercel compatibility
    });

    audioTitle = audioTitle.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_') || 'track';
    console.log(`Downloading: ${audioTitle}`);

    res.setHeader('Content-Disposition', `attachment; filename="${audioTitle}.mp3"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    const audioStream = ytDlp.exec(streamLink, {
      format: 'bestaudio',
      output: '-',
      quiet: true,
    });

    audioStream.stdout.pipe(res);

    audioStream.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    audioStream.on('close', (code) => {
      if (code !== 0) {
        console.error(`yt-dlp exited with code ${code}`);
        res.end('Download failed.');
      }
    });

  } catch (err) {
    console.error('Error in /extract-audio:', err);
    res.status(500).send('Something went wrong during processing.');
  }
});

app.listen(PORT, () => {
  console.log(`UtubeMusic server running on port ${PORT}`);
});
