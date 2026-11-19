import { callService } from '../../../../shared/src/httpClient.js';
import { AppError } from '../../../../shared/src/AppError.js';
import config from '../config/index.js';
export async function access(user, familyId, owner, adminAllowed = false) {
 if (!user?.userId) throw new AppError(401,'Authentication required',{code:'UNAUTHENTICATED'});
 if (user.role === 'SYSTEM_ADMIN') return;
 const deny = () => { throw new AppError(403,'Forbidden',{code:'FORBIDDEN'}); };
 if (!['FAMILY_MEMBER','FAMILY_ADMIN'].includes(user.role)) deny();
 const data = await callService(config.genealogyUrl,'/internal/memberships',{query:{user_id:user.userId},timeoutMs:3000});
 if (!data.memberships.some(m => String(m.family_id) === String(familyId))) deny();
 if (owner != null && String(owner) !== user.userId && !(adminAllowed && user.role === 'FAMILY_ADMIN')) deny();
}
