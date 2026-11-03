import app from './app.js';

const port = Number(process.env.PORT || 3004);

app.listen(port, '0.0.0.0', () => {
    console.log(`event-service listening on port ${port}`);
});
