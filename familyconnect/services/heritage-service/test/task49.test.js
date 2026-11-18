import test from 'node:test';
import assert from 'node:assert/strict';
import { str, choice, id, pagination } from '../src/utils.js';
test('heritage types and content are validated',()=>{
 const types=['HISTORICAL_DOC','STORY','OUTSTANDING_MEMBER','PHOTO'];
 for(const type of types)assert.equal(choice(type,'heritage_type',types),type);
 assert.throws(()=>choice('VIDEO','heritage_type',types));
 assert.throws(()=>str('a'.repeat(10001),'content',10000));
 assert.equal(str(' hello ','title',255,true),'hello');
 assert.equal(id('123'),'123');
 assert.throws(()=>pagination({offset:-1}));
});
