import app from './app.js';

const port = Number(process.env.PORT || 3005);

app.listen(port, '0.0.0.0', () => {
    console.log(`heritage-service listening on port ${port}`);
});
