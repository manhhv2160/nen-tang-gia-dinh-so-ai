import app from './app.js';
import config from './config/index.js';

app.listen(config.port, '0.0.0.0', () => {
    console.log(`genealogy-service listening on port ${config.port}`);
});
