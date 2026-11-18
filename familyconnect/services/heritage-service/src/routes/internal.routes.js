import { Router } from 'express';
import { db } from '../config/database.js';
import { id,send } from '../utils.js';
const router=Router();
router.get('/stats',async(req,res)=>{const args=req.query.family_id?[id(req.query.family_id,'family_id')]:[];const {rows}=await db.query('SELECT heritage_type,count(*)::int count FROM heritage'+(args.length?' WHERE family_id=$1':'')+' GROUP BY heritage_type',args);send(res,{heritage_count:rows.reduce((n,r)=>n+r.count,0),heritage_by_type:{HISTORICAL_DOC:0,STORY:0,OUTSTANDING_MEMBER:0,PHOTO:0,...Object.fromEntries(rows.map(x=>[x.heritage_type,x.count]))}});});
export default router;
