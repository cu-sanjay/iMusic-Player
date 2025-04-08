import { useState } from 'react';
import Head from 'next/head';
import axios from 'axios';

export default function Home() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      setMessage('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await axios.post('/api/convert', { url }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'audio/mpeg' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'song.mp3';
      link.click();
      setMessage('Download started successfully!');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>UTubeMusic - YouTube to MP3</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="container">
        <img src="/logo.png" alt="UTubeMusic Logo" style={{ width: '100px', margin: '0 auto 20px', display: 'block' }} />
        <h1 style={{ textAlign: 'center', fontSize: '24px' }}>UTubeMusic</h1>
        <p style={{ textAlign: 'center', fontSize: '14px', marginBottom: '20px' }}>by Sannjay</p>
        <input
          type="text"
          placeholder="Enter YouTube URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <button onClick={handleDownload} disabled={loading}>
          {loading ? 'Converting...' : 'Download MP3'}
        </button>
        {message && <p className={message.includes('success') ? 'success' : 'error'}>{message}</p>}
      </div>
    </>
  );
}