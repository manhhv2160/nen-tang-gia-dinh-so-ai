import { ApiClient } from './ApiClient.js';
export class EventService extends ApiClient {
 list(family_id){return this.get('/events',{query:{family_id,limit:100}});}
 create(data){return this.post('/events',data);}
 update(id,data){return this.patch('/events/'+id,data);}
 remove(id){return this.delete('/events/'+id);}
 rsvp(event_id,status){return this.post('/rsvps',{event_id,status});}
 participants(event_id){return this.get('/rsvps',{query:{event_id,limit:100}});}
}
