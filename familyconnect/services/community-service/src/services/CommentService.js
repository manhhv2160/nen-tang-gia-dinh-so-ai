import { Roles } from '../../../../shared/src/enums.js';
import { sendAuditEvent } from '../clients/AuditClient.js';
import * as CommentRepository from '../repositories/CommentRepository.js';
import * as PostRepository from '../repositories/PostRepository.js';
import { assertFamilyAccess } from './access.js';
import { forbidden, notFound } from '../utils/errors.js';
import {
    failValidation,
    parseId,
    parsePagination,
    parseRequiredText,
} from '../utils/validation.js';

const CONTENT_MAX = 5000;

/** Bình luận không có family_id riêng: lấy family_id từ bài viết rồi mới kiểm tra quyền. */
async function requirePost(user, postId) {
    const post = await PostRepository.findById(postId);
    if (!post) throw notFound('Post not found');
    await assertFamilyAccess(user, post.family_id);
    return post;
}

function assertCanModify(user, comment) {
    if (user.role === Roles.SYSTEM_ADMIN) return;
    if (String(comment.user_id) !== String(user.userId)) {
        throw forbidden('Chỉ tác giả mới được sửa hoặc xóa bình luận');
    }
}

export async function list(user, query) {
    const postId = parseId(query.post_id, 'post_id');
    await requirePost(user, postId);
    return CommentRepository.listByPost(postId, parsePagination(query, 50));
}

export async function create(user, body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        failValidation({ body: 'must be an object' });
    }
    const postId = parseId(body.post_id, 'post_id');
    const content = parseRequiredText(body.content, 'content', CONTENT_MAX);
    const post = await requirePost(user, postId);

    const comment = await CommentRepository.create({
        post_id: postId,
        user_id: user.userId,
        content,
    });
    sendAuditEvent({
        userId: user.userId,
        action: 'CREATE',
        entityType: 'COMMENT',
        entityId: comment.comment_id,
        familyId: post.family_id,
    });
    return comment;
}

export async function update(user, commentId, body) {
    const comment = await CommentRepository.findById(commentId);
    if (!comment) throw notFound('Comment not found');
    const post = await requirePost(user, comment.post_id);
    assertCanModify(user, comment);

    const content = parseRequiredText(body?.content, 'content', CONTENT_MAX);
    const updated = await CommentRepository.update(commentId, content);
    if (!updated) throw notFound('Comment not found');
    sendAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'COMMENT',
        entityId: commentId,
        familyId: post.family_id,
    });
    return updated;
}

export async function remove(user, commentId) {
    const comment = await CommentRepository.findById(commentId);
    if (!comment) throw notFound('Comment not found');
    const post = await requirePost(user, comment.post_id);
    assertCanModify(user, comment);

    if (!(await CommentRepository.remove(commentId))) throw notFound('Comment not found');
    sendAuditEvent({
        userId: user.userId,
        action: 'DELETE',
        entityType: 'COMMENT',
        entityId: commentId,
        familyId: post.family_id,
    });
}
