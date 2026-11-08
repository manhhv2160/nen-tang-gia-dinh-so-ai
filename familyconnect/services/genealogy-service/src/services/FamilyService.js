import { Roles } from '../../../../shared/src/enums.js';
import * as FamilyRepository from '../repositories/FamilyRepository.js';
import { assertFamilyAccess } from './access.js';
import { conflict, notFound } from '../utils/errors.js';
import {
    failValidation,
    parseOptionalText,
    parsePagination,
    parseRequiredText,
} from '../utils/validation.js';

function parseFamilyBody(body, creating) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        failValidation({ body: 'must be an object' });
    }
    const changes = {};
    if (creating || Object.hasOwn(body, 'family_name')) {
        changes.family_name = parseRequiredText(body.family_name, 'family_name');
    }
    for (const field of ['description', 'origin_place']) {
        if (creating || Object.hasOwn(body, field)) {
            changes[field] = parseOptionalText(body[field], field, field === 'description' ? 10000 : 255) ?? null;
        }
    }
    if (!creating && !Object.keys(changes).length) failValidation({ body: 'must include a supported field' });
    return changes;
}

function parseSort(query) {
    const value = query.sort ?? 'family_name';
    if (value !== 'family_name' && value !== '-family_name') {
        failValidation({ sort: 'must be family_name or -family_name' });
    }
    return value.startsWith('-') ? 'DESC' : 'ASC';
}

export async function list(user, query) {
    const { limit, offset } = parsePagination(query);
    const search = query.q === undefined ? undefined : parseOptionalText(query.q, 'q', 255) ?? undefined;
    const result = await FamilyRepository.list({
        userId: user.userId,
        systemAdmin: user.role === Roles.SYSTEM_ADMIN,
        limit,
        offset,
        sortDirection: parseSort(query),
        query: search,
    });
    return result;
}

export async function get(user, rawId) {
    const familyId = rawId;
    const family = await FamilyRepository.findById(familyId);
    if (!family) throw notFound('Family not found');
    await assertFamilyAccess(user, familyId, Roles.FAMILY_MEMBER);
    return family;
}

export async function create(user, body) {
    return FamilyRepository.create({
        ...parseFamilyBody(body, true),
        user_id: user.userId,
    });
}

export async function update(user, familyId, body) {
    const family = await FamilyRepository.findById(familyId);
    if (!family) throw notFound('Family not found');
    await assertFamilyAccess(user, familyId, Roles.FAMILY_ADMIN);
    try {
        return await FamilyRepository.update(familyId, parseFamilyBody(body, false));
    } catch (error) {
        if (error.code === '23505') throw conflict();
        throw error;
    }
}

export async function remove(familyId) {
    const removed = await FamilyRepository.remove(familyId);
    if (!removed) throw notFound('Family not found');
}
