import express from 'express';
import { registerHealthRoute } from '../../../shared/src/healthRoute.js';

const app = express();

registerHealthRoute(app, 'heritage-service');

export default app;
