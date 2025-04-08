import { useState, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) {
      setError('Please enter a YouTube URL');
      inputRef.current.focus();
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to download');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'download.mp3';
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccess('Download started successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      <Head>
        <title>YouTube to MP3 Converter</title>
        <meta name="description" content="Convert YouTube videos to MP3" />
      </Head>

      <main className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">YouTube to MP3</h1>
          <p className="text-gray-300">Convert and download YouTube videos as MP3 files</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="mb-4">
            <label htmlFor="url" className="block text-gray-300 text-sm font-medium mb-2">
              YouTube URL
            </label>
            <input
              ref={inputRef}
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${isLoading ? 'bg-blue-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : 'Convert to MP3'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-500/20 text-green-200 rounded-lg text-sm">
              {success}
            </div>
          )}
        </form>

        <div className="mt-8 text-center text-gray-400 text-xs">
          <p>By using this service, you agree to our Terms of Service</p>
        </div>
      </main>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Created by <a href="https://github.com/cu-sanjay" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Sanjay</a></p>
      </footer>
    </div>
  );
}