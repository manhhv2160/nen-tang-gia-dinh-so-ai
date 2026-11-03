import app from './app.js';

const port = Number(process.env.PORT || 3003);

app.listen(port, '0.0.0.0', () => {
    console.log(`community-service listening on port ${port}`);
});
