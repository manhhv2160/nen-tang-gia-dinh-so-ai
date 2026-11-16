import { Roles } from '../../../../shared/src/enums.js';
import { sendAuditEvent } from '../clients/AuditClient.js';
import * as BranchRepository from '../repositories/BranchRepository.js';
import * as FamilyRepository from '../repositories/FamilyRepository.js';
import { assertFamilyAccess } from './access.js';
import { conflict, notFound } from '../utils/errors.js';
import {
    failValidation,
    parseId,
    parseOptionalText,
    parsePagination,
    parseRequiredText,
} from '../utils/validation.js';

function parseBranchBody(body, creating) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        failValidation({ body: 'must be an object' });
    }
    const changes = {};
    if (creating || Object.hasOwn(body, 'branch_name')) {
        changes.branch_name = parseRequiredText(body.branch_name, 'branch_name');
    }
    if (creating || Object.hasOwn(body, 'description')) {
        changes.description = parseOptionalText(body.description, 'description', 10000) ?? null;
    }
    if (!creating && !Object.keys(changes).length) failValidation({ body: 'must include a supported field' });
    return changes;
}

function parseSort(query) {
    const value = query.sort ?? 'branch_name';
    if (value !== 'branch_name' && value !== '-branch_name') {
        failValidation({ sort: 'must be branch_name or -branch_name' });
    }
    return value.startsWith('-') ? 'DESC' : 'ASC';
}

export async function list(user, query) {
    const familyId = parseId(query.family_id, 'family_id');
    await assertFamilyAccess(user, familyId, Roles.FAMILY_MEMBER);
    if (!(await FamilyRepository.findById(familyId))) throw notFound('Family not found');
    const pagination = parsePagination(query);
    return BranchRepository.listByFamily(familyId, {
        ...pagination,
        sortDirection: parseSort(query),
    });
}

export async function get(user, branchId) {
    const branch = await BranchRepository.findById(branchId);
    if (!branch) throw notFound('Branch not found');
    await assertFamilyAccess(user, branch.family_id, Roles.FAMILY_MEMBER);
    return branch;
}

export async function create(user, body) {
    const familyId = parseId(body?.family_id, 'family_id');
    await assertFamilyAccess(user, familyId, Roles.FAMILY_ADMIN);
    try {
        const branch = await BranchRepository.create({
            family_id: familyId,
            ...parseBranchBody(body, true),
        });
        sendAuditEvent({
            userId: user.userId,
            action: 'CREATE',
            entityType: 'BRANCH',
            entityId: branch.branch_id,
            familyId,
        });
        return branch;
    } catch (error) {
        if (error.code === '23505') throw conflict('Branch name already exists in this family');
        if (error.code === '23503') throw notFound('Family not found');
        throw error;
    }
}

export async function update(user, branchId, body) {
    const branch = await BranchRepository.findById(branchId);
    if (!branch) throw notFound('Branch not found');
    await assertFamilyAccess(user, branch.family_id, Roles.FAMILY_ADMIN);
    try {
        const updatedBranch = await BranchRepository.update(branchId, parseBranchBody(body, false));
        if (!updatedBranch) throw notFound('Branch not found');
        sendAuditEvent({
            userId: user.userId,
            action: 'UPDATE',
            entityType: 'BRANCH',
            entityId: branchId,
            familyId: branch.family_id,
        });
        return updatedBranch;
    } catch (error) {
        if (error.code === '23505') throw conflict('Branch name already exists in this family');
        throw error;
    }
}

export async function remove(user, branchId) {
    const branch = await BranchRepository.findById(branchId);
    if (!branch) throw notFound('Branch not found');
    await assertFamilyAccess(user, branch.family_id, Roles.FAMILY_ADMIN);
    if (!(await BranchRepository.remove(branchId))) throw notFound('Branch not found');
    sendAuditEvent({
        userId: user.userId,
        action: 'DELETE',
        entityType: 'BRANCH',
        entityId: branchId,
        familyId: branch.family_id,
    });
}
