import express from 'express';
import { registerHealthRoute } from '../../../shared/src/healthRoute.js';

const app = express();

registerHealthRoute(app, 'community-service');

export default app;
