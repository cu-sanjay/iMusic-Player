import express from 'express';
import ytDlp from 'yt-dlp-exec'; 
import path from 'path';

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

        // Get stream title
        let audioTitle = await ytDlp(streamLink, {
            print: '%(title)s'
        });

        audioTitle = audioTitle.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_') || 'track';
        console.log(`Processing: ${audioTitle}`);
        res.setHeader('Content-Disposition', `attachment; filename="${audioTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream audio directly using yt-dlp-exec
        const audioStream = ytDlp.exec(streamLink, {
            format: 'bestaudio',
            output: '-', // stream to stdout
            quiet: true
        });

        audioStream.stdout.pipe(res);

        audioStream.stderr.on('data', (data) => {
            console.error(`Stream error: ${data}`);
        });

        audioStream.on('close', (code) => {
            if (code !== 0) {
                console.error(`Audio extraction failed with code ${code}`);
                res.status(500).send('Failed to extract audio');
            }
        });

    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).send('Something went wrong during processing');
    }
});

app.listen(PORT, () => {
    console.log(`UtubeMusic server running on port ${PORT}`);
});
