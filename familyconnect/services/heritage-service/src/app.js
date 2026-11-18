import express from 'express';
import { registerHealthRoute } from '../../../shared/src/healthRoute.js';
import { userContext } from '../../../shared/src/userContext.js';
import { missing,errorHandler } from './utils.js';
import routes from './routes/heritage.routes.js';
import internal from './routes/internal.routes.js';
import { filePath } from './services/FileStorageService.js';
import { AppError } from '../../../shared/src/AppError.js';

const app=express();
app.use(express.json({limit:'1mb'}));
app.use(userContext);
registerHealthRoute(app,'heritage-service');
app.use('/internal',internal);
app.use('/api/heritages',routes);
app.get('/api/files/:name',async(req,res)=>{if(!req.user.userId)throw new AppError(401,'Authentication required',{code:'UNAUTHENTICATED'});res.set('X-Content-Type-Options','nosniff');res.sendFile(await filePath(req.params.name));});
app.use((err,req,res,next)=>{if(err.code==='LIMIT_FILE_SIZE')return res.status(413).json({success:false,status_code:413,message:'Payload too large',data:{code:'PAYLOAD_TOO_LARGE'}});if(err.name==='MulterError')return res.status(400).json({success:false,status_code:400,message:'Invalid upload',data:{code:'VALIDATION_ERROR',fields:{file:err.message}}});next(err);});

app.use((req,res)=>missing());
app.use(errorHandler);
export default app;
