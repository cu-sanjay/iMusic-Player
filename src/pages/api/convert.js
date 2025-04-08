import ytdl from 'ytdl-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ message: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const audio = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

    res.setHeader('Content-Disposition', 'attachment; filename="song.mp3"');
    res.setHeader('Content-Type', 'audio/mpeg');

    audio.pipe(res);

    audio.on('error', (err) => {
      res.status(500).json({ message: 'Error converting video to MP3' });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
}