import express from 'express';
import ytdl from 'ytdl-core';
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
        if (!ytdl.validateURL(streamLink)) return res.status(400).send('Invalid video URL');

        // Get video info for title
        const info = await ytdl.getInfo(streamLink);
        let audioTitle = info.videoDetails.title
            .trim()
            .replace(/[^\w\s]/gi, '')
            .replace(/\s+/g, '_') || 'track';
        console.log(`Processing: ${audioTitle}`);

        res.setHeader('Content-Disposition', `attachment; filename="${audioTitle}.mp3"`);
        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream audio using ytdl-core
        ytdl(streamLink, { filter: 'audioonly', quality: 'highestaudio' })
            .on('error', (error) => {
                console.error('Stream error:', error);
                res.status(500).send('Failed to extract audio');
            })
            .pipe(res);

    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).send('Something went wrong during processing');
    }
});

app.listen(PORT, () => {
    console.log(`UtubeMusic server running on port ${PORT}`);
});
