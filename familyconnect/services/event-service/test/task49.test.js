import test from 'node:test';
import assert from 'node:assert/strict';
import { id, choice, date, pagination, str } from '../src/utils.js';
import { access } from '../src/clients/GenealogyClient.js';
import { audit } from '../src/clients/AuditClient.js';

test('BIGINT IDs remain strings and invalid IDs fail',()=>{
 assert.equal(id('9223372036854775807'),'9223372036854775807');
 for(const invalid of [1,'0','-1','9223372036854775808'])assert.throws(()=>id(invalid));
});
test('validates RSVP, dates, titles and pagination',()=>{
 assert.equal(choice('MAYBE','status',['ATTENDING','DECLINED','MAYBE']),'MAYBE');
 assert.throws(()=>choice('GOING','status',['ATTENDING']));
 assert.throws(()=>date('invalid','start_time',true));
 assert.throws(()=>str('  ','title',255,true));
 assert.deepEqual(pagination({}),[50,0]);
 assert.throws(()=>pagination({limit:101}));
});
test('guest is denied and admin can access',async()=>{
 await assert.rejects(access({userId:'1',role:'GUEST'},'2'),{statusCode:403});
 await access({userId:'1',role:'SYSTEM_ADMIN'},'2');
});
test('audit returns without awaiting report service',async(t)=>{
 let payload;
 t.mock.method(globalThis,'fetch',async(url,opts)=>{payload=JSON.parse(opts.body);return new Response(null,{status:202});});
 assert.equal(audit('1','CREATE','EVENT','2','3'),undefined);
 assert.deepEqual(payload,{user_id:'1',action:'CREATE',entity_type:'EVENT',entity_id:'2',family_id:'3'});
});
