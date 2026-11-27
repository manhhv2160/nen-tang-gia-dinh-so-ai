import { ReactionTypes, Roles } from '../../../../shared/src/enums.js';
import { sendAuditEvent } from '../clients/AuditClient.js';
import * as PostRepository from '../repositories/PostRepository.js';
import * as ReactionRepository from '../repositories/ReactionRepository.js';
import { assertFamilyAccess } from './access.js';
import { forbidden, notFound } from '../utils/errors.js';
import { failValidation, parseEnum, parseId } from '../utils/validation.js';

async function requirePost(user, postId) {
    const post = await PostRepository.findById(postId);
    if (!post) throw notFound('Post not found');
    await assertFamilyAccess(user, post.family_id);
    return post;
}

export async function list(user, query) {
    const postId = parseId(query.post_id, 'post_id');
    await requirePost(user, postId);
    return ReactionRepository.listByPost(postId);
}

/**
 * Mỗi người chỉ có một cảm xúc cho mỗi bài: đã có thì đổi loại, chưa có thì tạo.
 * Trả về { reaction, created } để controller chọn 201 hay 200.
 */
export async function setReaction(user, body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        failValidation({ body: 'must be an object' });
    }
    const postId = parseId(body.post_id, 'post_id');
    const reactionType = parseEnum(ReactionTypes, body.reaction_type, 'reaction_type', ReactionTypes.LIKE);
    const post = await requirePost(user, postId);

    const existing = await ReactionRepository.findByPostAndUser(postId, user.userId);
    let created = !existing;
    let reaction;
    if (existing) {
        reaction = await ReactionRepository.update(existing.reaction_id, reactionType);
    } else {
        try {
            reaction = await ReactionRepository.create({
                post_id: postId,
                user_id: user.userId,
                reaction_type: reactionType,
            });
        } catch (error) {
            // Hai request cùng lúc: request sau rơi vào UNIQUE (post_id, user_id) thì đổi loại thay vì báo lỗi.
            if (error.code !== '23505') throw error;
            const concurrent = await ReactionRepository.findByPostAndUser(postId, user.userId);
            if (!concurrent) throw error;
            created = false;
            reaction = await ReactionRepository.update(concurrent.reaction_id, reactionType);
        }
    }

    sendAuditEvent({
        userId: user.userId,
        action: created ? 'CREATE' : 'UPDATE',
        entityType: 'REACTION',
        entityId: reaction.reaction_id,
        familyId: post.family_id,
    });
    return { reaction, created };
}

export async function remove(user, reactionId) {
    const reaction = await ReactionRepository.findById(reactionId);
    if (!reaction) throw notFound('Reaction not found');
    const post = await requirePost(user, reaction.post_id);

    if (user.role !== Roles.SYSTEM_ADMIN && String(reaction.user_id) !== String(user.userId)) {
        throw forbidden('Chỉ người đã thả cảm xúc mới được xóa');
    }
    if (!(await ReactionRepository.remove(reactionId))) throw notFound('Reaction not found');
    sendAuditEvent({
        userId: user.userId,
        action: 'DELETE',
        entityType: 'REACTION',
        entityId: reactionId,
        familyId: post.family_id,
    });
}
