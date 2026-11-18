import { Router } from 'express';
import { audit } from '../clients/AuditClient.js';
import { db } from '../config/database.js';
import { access } from '../clients/GenealogyClient.js';
import { id,choice,pagination,missing,send } from '../utils.js';
const router=Router();
const statuses=['ATTENDING','DECLINED','MAYBE'];
async function event(eid){const {rows}=await db.query('SELECT * FROM event WHERE event_id=$1',[eid]);if(!rows[0])missing();return rows[0];}
router.get('/',async(req,res)=>{const eid=id(req.query.event_id,'event_id'),e=await event(eid);await access(req.user,e.family_id);const args=[eid];let where='event_id=$1';if(req.query.status){args.push(choice(req.query.status,'status',statuses));where+=' AND status=$2';}const count=await db.query('SELECT count(*) FROM rsvp WHERE '+where,args);args.push(...pagination(req.query));const {rows}=await db.query('SELECT * FROM rsvp WHERE '+where+' ORDER BY rsvp_id LIMIT $'+(args.length-1)+' OFFSET $'+args.length,args);res.set('X-Total-Count',count.rows[0].count);send(res,rows);});
router.post('/',async(req,res)=>{const eid=id(req.body.event_id,'event_id'),e=await event(eid);await access(req.user,e.family_id);const status=choice(req.body.status,'status',statuses);const {rows}=await db.query('INSERT INTO rsvp(event_id,user_id,status) VALUES($1,$2,$3) ON CONFLICT(event_id,user_id) DO UPDATE SET status=EXCLUDED.status,updated_at=NOW() RETURNING *, (xmax=0) AS inserted',[eid,req.user.userId,status]);const {inserted,...row}=rows[0];audit(req.user.userId,inserted?'CREATE':'UPDATE','RSVP',row.rsvp_id,e.family_id);send(res,row,inserted?201:200);});
router.delete('/:id',async(req,res)=>{const rid=id(req.params.id);const {rows}=await db.query('SELECT r.*,e.family_id FROM rsvp r JOIN event e USING(event_id) WHERE rsvp_id=$1',[rid]);if(!rows[0])missing();await access(req.user,rows[0].family_id,rows[0].user_id);await db.query('DELETE FROM rsvp WHERE rsvp_id=$1',[rid]);audit(req.user.userId,'DELETE','RSVP',rid,rows[0].family_id);send(res,null);});
export default router;
