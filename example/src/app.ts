import express from 'express';
import router from './routes';
import jsonTranslator from './middlewares/json-translator';
import fallbackErrorHandler from './middlewares/fallback-error-handler';

const app = express();

app.use(express.json());
app.use(jsonTranslator);
app.use('/', router);
app.use(fallbackErrorHandler);

export default app;
