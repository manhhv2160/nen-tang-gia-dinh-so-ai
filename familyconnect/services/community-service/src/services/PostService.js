import { PostTypes, Roles } from '../../../../shared/src/enums.js';
import { sendAuditEvent } from '../clients/AuditClient.js';
import * as PostRepository from '../repositories/PostRepository.js';
import { assertFamilyAccess } from './access.js';
import { forbidden, notFound } from '../utils/errors.js';
import {
    failValidation,
    parseChoice,
    parseEnum,
    parseId,
    parseOptionalText,
    parsePagination,
    parseRequiredText,
} from '../utils/validation.js';

const CONTENT_MAX = 10000;
const TITLE_MAX = 255;

function parsePostBody(body, creating) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        failValidation({ body: 'must be an object' });
    }
    const changes = {};
    if (creating || Object.hasOwn(body, 'post_type')) {
        changes.post_type = parseEnum(PostTypes, body.post_type, 'post_type', PostTypes.GENERAL);
    }
    if (creating || Object.hasOwn(body, 'title')) {
        changes.title = parseOptionalText(body.title, 'title', TITLE_MAX) ?? null;
    }
    if (creating || Object.hasOwn(body, 'content')) {
        changes.content = parseRequiredText(body.content, 'content', CONTENT_MAX);
    }
    if (!creating && !Object.keys(changes).length) failValidation({ body: 'must include a supported field' });
    return changes;
}

function parseSort(query) {
    const value = parseChoice(query.sort, 'sort', ['created_at', '-created_at'], '-created_at');
    return value.startsWith('-') ? 'DESC' : 'ASC';
}

/** Chỉ tác giả (hoặc SYSTEM_ADMIN) được sửa/xóa bài của mình. */
function assertCanModify(user, post) {
    if (user.role === Roles.SYSTEM_ADMIN) return;
    if (String(post.user_id) !== String(user.userId)) {
        throw forbidden('Chỉ tác giả mới được sửa hoặc xóa bài viết');
    }
}

export async function list(user, query) {
    const familyId = parseId(query.family_id, 'family_id');
    await assertFamilyAccess(user, familyId);

    const pagination = parsePagination(query);
    const postType = parseEnum(PostTypes, query.post_type, 'post_type', undefined);
    const userId = query.user_id === undefined ? undefined : parseId(query.user_id, 'user_id');

    return PostRepository.listByFamily(familyId, {
        ...pagination,
        sortDirection: parseSort(query),
        postType,
        userId,
    });
}

export async function get(user, postId) {
    const post = await PostRepository.findById(postId);
    if (!post) throw notFound('Post not found');
    await assertFamilyAccess(user, post.family_id);
    return post;
}

export async function create(user, body) {
    const familyId = parseId(body?.family_id, 'family_id');
    await assertFamilyAccess(user, familyId);

    const post = await PostRepository.create({
        family_id: familyId,
        user_id: user.userId,
        ...parsePostBody(body, true),
    });
    sendAuditEvent({
        userId: user.userId,
        action: 'CREATE',
        entityType: 'POST',
        entityId: post.post_id,
        familyId,
    });
    return post;
}

export async function update(user, postId, body) {
    const post = await PostRepository.findById(postId);
    if (!post) throw notFound('Post not found');
    await assertFamilyAccess(user, post.family_id);
    assertCanModify(user, post);

    const updated = await PostRepository.update(postId, parsePostBody(body, false));
    if (!updated) throw notFound('Post not found');
    sendAuditEvent({
        userId: user.userId,
        action: 'UPDATE',
        entityType: 'POST',
        entityId: postId,
        familyId: post.family_id,
    });
    return updated;
}

export async function remove(user, postId) {
    const post = await PostRepository.findById(postId);
    if (!post) throw notFound('Post not found');
    await assertFamilyAccess(user, post.family_id);
    assertCanModify(user, post);

    if (!(await PostRepository.remove(postId))) throw notFound('Post not found');
    sendAuditEvent({
        userId: user.userId,
        action: 'DELETE',
        entityType: 'POST',
        entityId: postId,
        familyId: post.family_id,
    });
}
