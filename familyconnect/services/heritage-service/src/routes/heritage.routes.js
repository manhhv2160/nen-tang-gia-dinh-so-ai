import { Router } from 'express';
import { audit } from '../clients/AuditClient.js';
import { db } from '../config/database.js';
import { access } from '../clients/GenealogyClient.js';
import { id,str,choice,pagination,missing,send } from '../utils.js';
import { upload,requireUploader,saveFile,validateFileUrl,removeFile } from '../services/FileStorageService.js';
const router=Router();
const types=['HISTORICAL_DOC','STORY','OUTSTANDING_MEMBER','PHOTO'];
router.post('/upload',requireUploader,upload,async(req,res)=>{const result=await saveFile(req.file);audit(req.user.userId,'CREATE','HERITAGE',null,null);send(res,result,201);});
async function get(hid){const {rows}=await db.query('SELECT * FROM heritage WHERE heritage_id=$1',[hid]);if(!rows[0])missing();return rows[0];}
async function fields(body,previous={}){const v={...previous,...body};return [choice(v.heritage_type,'heritage_type',types),str(v.title,'title',255,true),str(v.content,'content',10000),await validateFileUrl(str(v.file_url,'file_url',2048))];}
router.get('/',async(req,res)=>{const family=id(req.query.family_id,'family_id');await access(req.user,family);const args=[family];let where='family_id=$1';if(req.query.heritage_type){args.push(choice(req.query.heritage_type,'heritage_type',types));where+=' AND heritage_type=$'+args.length;}if(req.query.q){args.push('%'+str(req.query.q,'q',255,true)+'%');where+=' AND (title ILIKE $'+args.length+' OR content ILIKE $'+args.length+')';}const count=await db.query('SELECT count(*) FROM heritage WHERE '+where,args);args.push(...pagination(req.query));const {rows}=await db.query('SELECT * FROM heritage WHERE '+where+' ORDER BY created_at '+(req.query.sort==='created_at'?'ASC':'DESC')+',heritage_id LIMIT $'+(args.length-1)+' OFFSET $'+args.length,args);res.set('X-Total-Count',count.rows[0].count);send(res,rows);});
router.get('/:id',async(req,res)=>{const row=await get(id(req.params.id));await access(req.user,row.family_id);send(res,row);});
router.post('/',async(req,res)=>{const family=id(req.body.family_id,'family_id');await access(req.user,family);const {rows}=await db.query('INSERT INTO heritage(family_id,user_id,heritage_type,title,content,file_url) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[family,req.user.userId,...await fields(req.body)]);audit(req.user.userId,'CREATE','HERITAGE',rows[0].heritage_id,family);send(res,rows[0],201);});
async function cleanup(url){if(!url)return;const {rows}=await db.query('SELECT 1 FROM heritage WHERE file_url=$1 LIMIT 1',[url]);if(!rows.length)await removeFile(url);}
router.patch('/:id',async(req,res)=>{const hid=id(req.params.id),row=await get(hid);await access(req.user,row.family_id,row.user_id);const {rows}=await db.query('UPDATE heritage SET heritage_type=$2,title=$3,content=$4,file_url=$5,updated_at=NOW() WHERE heritage_id=$1 RETURNING *',[hid,...await fields(req.body,row)]);audit(req.user.userId,'UPDATE','HERITAGE',hid,row.family_id);if(row.file_url!==rows[0].file_url)await cleanup(row.file_url);send(res,rows[0]);});
router.delete('/:id',async(req,res)=>{const hid=id(req.params.id),row=await get(hid);await access(req.user,row.family_id,row.user_id,true);await db.query('DELETE FROM heritage WHERE heritage_id=$1',[hid]);audit(req.user.userId,'DELETE','HERITAGE',hid,row.family_id);await cleanup(row.file_url);send(res,null);});
export default router;
