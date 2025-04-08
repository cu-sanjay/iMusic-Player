import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Convert YouTube videos to MP3 quickly and easily" />
        <meta name="author" content="Sanjay" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}