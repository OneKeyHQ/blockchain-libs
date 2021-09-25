import app from './app';

const host = process.env.HOST || '127.0.0.1';
const port = process.env.PORT || 8000;

app
  .listen(+port, host, () => {
    console.log('info', `Server started at http://${host}:${port}`);
  })
  .on('error', console.error);
