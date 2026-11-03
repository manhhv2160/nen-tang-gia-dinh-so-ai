import express from 'express';
import { registerHealthRoute } from '../../../shared/src/healthRoute.js';

const app = express();

registerHealthRoute(app, 'event-service');

export default app;
