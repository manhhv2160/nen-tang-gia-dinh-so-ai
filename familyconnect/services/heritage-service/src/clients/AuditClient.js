import config from '../config/index.js';
export function audit(userId,action,entityType,entityId,familyId){
 void fetch(config.reportUrl+'/internal/audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:userId,action,entity_type:entityType,entity_id:entityId,family_id:familyId}),signal:AbortSignal.timeout(3000)}).then(async r=>{if(!r.ok)throw new Error('HTTP '+r.status);await r.arrayBuffer();}).catch(err=>console.error('[heritage-service] audit failed:',err.message));
}
