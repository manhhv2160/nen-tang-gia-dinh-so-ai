import app from './app.js';

const port = Number(process.env.PORT || 3007);

app.listen(port, '0.0.0.0', () => {
    console.log(`report-service listening on port ${port}`);
});
