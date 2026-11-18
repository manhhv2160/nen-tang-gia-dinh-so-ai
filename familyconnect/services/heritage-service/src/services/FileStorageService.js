import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from '../../../../shared/src/AppError.js';
import { invalid, missing } from '../utils.js';
const directory=path.resolve(process.env.UPLOAD_DIR || fileURLToPath(new URL('../../uploads/',import.meta.url)));
const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'};
const validName=/^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/;
export const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1}}).single('file');
export function requireUploader(req,res,next){
 if(!req.user.userId)throw new AppError(401,'Authentication required',{code:'UNAUTHENTICATED'});
 if(req.user.role==='GUEST')throw new AppError(403,'Forbidden',{code:'FORBIDDEN'});
 next();
}
export async function saveFile(file){
 if(!file||!extensions[file.mimetype])invalid('file','JPG, PNG, WEBP or PDF required');
 const b=file.buffer, mime=file.mimetype;
 const valid=mime==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:mime==='image/png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/webp'?b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP':b.toString('ascii',0,5)==='%PDF-';
 if(!valid)invalid('file','file contents do not match type');
 const name=randomUUID()+'.'+extensions[mime];
 await mkdir(directory,{recursive:true});
 await writeFile(path.join(directory,name),b,{flag:'wx'});
 return {file_url:'/files/'+name,file_name:name,size:file.size,content_type:mime};
}
export async function filePath(name){if(!validName.test(name))missing();const full=path.join(directory,name);try{await access(full);}catch{missing();}return full;}
export async function validateFileUrl(url){if(url===null)return null;if(!url.startsWith('/files/')||!validName.test(url.slice(7)))invalid('file_url');await filePath(url.slice(7));return url;}
export async function removeFile(url){if(!url||!url.startsWith('/files/')||!validName.test(url.slice(7)))return;try{await unlink(path.join(directory,url.slice(7)));}catch(err){if(err.code!=='ENOENT')console.error(err);}}
