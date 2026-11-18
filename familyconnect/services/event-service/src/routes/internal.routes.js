import { Router } from 'express';
import { db } from '../config/database.js';
import { id,send } from '../utils.js';
const router=Router();
router.get('/stats',async(req,res)=>{const args=req.query.family_id?[id(req.query.family_id,'family_id')]:[];const where=args.length?' WHERE e.family_id=$1':'';const {rows}=await db.query('SELECT count(*)::int events_count,count(*) FILTER(WHERE start_time>=NOW())::int upcoming_events_count FROM event e'+where,args);const r=await db.query('SELECT status,count(*)::int count FROM rsvp JOIN event e USING(event_id)'+where+' GROUP BY status',args);send(res,{...rows[0],rsvps_by_status:{ATTENDING:0,DECLINED:0,MAYBE:0,...Object.fromEntries(r.rows.map(x=>[x.status,x.count]))}});});
export default router;
