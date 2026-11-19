import { ApiClient,ApiError } from './ApiClient.js';
import { StorageHelper } from '../utils/StorageHelper.js';
export class HeritageService extends ApiClient {
 list(family_id){return this.get('/heritages',{query:{family_id,limit:100}});}
 create(data){return this.post('/heritages',data);}
 update(id,data){return this.patch('/heritages/'+id,data);}
 remove(id){return this.delete('/heritages/'+id);}
 async upload(file){const form=new FormData();form.append('file',file);const r=await fetch(this.baseUrl+'/heritages/upload',{method:'POST',headers:{Authorization:'Bearer '+StorageHelper.getToken()},body:form,signal:AbortSignal.timeout(this.timeoutMs)});const p=await r.json();if(!r.ok||!p.success)throw new ApiError(r.status,p.message,p.data);return p.data;}
 async download(url){if(!/^\/files\/[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/.test(url))throw new Error('Tệp không hợp lệ');const r=await fetch(this.baseUrl+url,{headers:{Authorization:'Bearer '+StorageHelper.getToken()},signal:AbortSignal.timeout(this.timeoutMs)});if(!r.ok)throw new ApiError(r.status,'Không tải được tệp');return r.blob();}
}
