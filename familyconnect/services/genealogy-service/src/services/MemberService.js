import { Gender, Roles } from '../../../../shared/src/enums.js';
import * as BranchRepository from '../repositories/BranchRepository.js';
import * as FamilyRepository from '../repositories/FamilyRepository.js';
import * as MemberRepository from '../repositories/MemberRepository.js';
import { assertFamilyAccess } from './access.js';
import { conflict, notFound } from '../utils/errors.js';
import {
    assertDateOrder,
    failValidation,
    parseBoolean,
    parseDate,
    parseId,
    parseOptionalText,
    parsePagination,
    parsePositiveInteger,
    parseRequiredText,
} from '../utils/validation.js';

function parseMemberBody(body, creating) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        failValidation({ body: 'must be an object' });
    }
    const changes = {};
    if (creating || Object.hasOwn(body, 'full_name')) {
        changes.full_name = parseRequiredText(body.full_name, 'full_name');
    }
    if (creating || Object.hasOwn(body, 'gender')) {
        const gender = body.gender === undefined && creating ? Gender.OTHER : body.gender;
        if (gender !== undefined && !Object.values(Gender).includes(gender)) {
            failValidation({ gender: 'must be one of MALE, FEMALE, OTHER' });
        }
        if (gender !== undefined) changes.gender = gender;
    }
    if (creating || Object.hasOwn(body, 'branch_id')) {
        const value = body.branch_id ?? (creating ? null : body.branch_id);
        changes.branch_id = value === null ? null : parseId(value, 'branch_id');
    }
    for (const field of ['date_of_birth', 'date_of_death']) {
        if (creating || Object.hasOwn(body, field)) {
            changes[field] = parseDate(body[field], field) ?? null;
        }
    }
    if (creating || Object.hasOwn(body, 'generation')) {
        changes.generation = parsePositiveInteger(body.generation, 'generation') ?? null;
    }
    for (const field of ['occupation', 'education', 'address', 'bio']) {
        if (creating || Object.hasOwn(body, field)) {
            changes[field] = parseOptionalText(body[field], field, field === 'bio' ? 10000 : 255) ?? null;
        }
    }
    if (!creating && !Object.keys(changes).length) {
        failValidation({ body: 'must include a supported field' });
    }
    assertDateOrder(changes.date_of_birth, changes.date_of_death);
    return changes;
}

function parseFilters(query) {
    const filters = {};
    if (query.branch_id !== undefined) filters.branch_id = parseId(query.branch_id, 'branch_id');
    if (query.generation !== undefined) {
        const generation = Number(query.generation);
        if (!Number.isSafeInteger(generation) || generation < 1) {
            failValidation({ generation: 'must be a positive integer' });
        }
        filters.generation = generation;
    }
    if (query.gender !== undefined) {
        if (!Object.values(Gender).includes(query.gender)) {
            failValidation({ gender: 'must be one of MALE, FEMALE, OTHER' });
        }
        filters.gender = query.gender;
    }
    if (query.is_verified !== undefined) filters.is_verified = parseBoolean(query.is_verified, 'is_verified');
    for (const field of ['occupation', 'address', 'q']) {
        if (query[field] !== undefined) {
            const value = parseOptionalText(query[field], field, 255);
            if (value) filters[field] = value;
        }
    }
    return filters;
}

function parseSort(query) {
    const value = query.sort ?? 'generation';
    if (typeof value !== 'string') failValidation({ sort: 'must be a supported field' });
    const sortField = value.startsWith('-') ? value.slice(1) : value;
    if (!['full_name', 'generation', 'date_of_birth'].includes(sortField)) {
        failValidation({ sort: 'must be full_name, -full_name, generation, -generation, date_of_birth or -date_of_birth' });
    }
    return { sortField, sortDirection: value.startsWith('-') ? 'DESC' : 'ASC' };
}

async function validateBranch(familyId, branchId) {
    if (branchId === null || branchId === undefined) return;
    const branch = await BranchRepository.findById(branchId);
    if (!branch) throw notFound('Branch not found');
    if (branch.family_id !== familyId) {
        failValidation({ branch_id: 'must belong to the same family' });
    }
}

export async function list(user, query) {
    const familyId = parseId(query.family_id, 'family_id');
    await assertFamilyAccess(user, familyId, Roles.FAMILY_MEMBER);
    if (!(await FamilyRepository.findById(familyId))) throw notFound('Family not found');
    const filters = parseFilters(query);
    if (filters.branch_id && !(await MemberRepository.branchBelongsToFamily(filters.branch_id, familyId))) {
        failValidation({ branch_id: 'must belong to the requested family' });
    }
    return MemberRepository.listByFamily(familyId, {
        filters,
        ...parsePagination(query),
        ...parseSort(query),
    });
}

export async function get(user, memberId) {
    const member = await MemberRepository.findById(memberId);
    if (!member) throw notFound('Member not found');
    await assertFamilyAccess(user, member.family_id, Roles.FAMILY_MEMBER);
    return member;
}

export async function create(user, body) {
    const familyId = parseId(body?.family_id, 'family_id');
    await assertFamilyAccess(user, familyId, Roles.FAMILY_ADMIN);
    const changes = parseMemberBody(body, true);
    await validateBranch(familyId, changes.branch_id);
    try {
        return await MemberRepository.create({ family_id: familyId, ...changes });
    } catch (error) {
        if (error.code === '23503') throw notFound('Family or branch not found');
        if (error.code === '23505') throw conflict('Member is already linked in this family');
        throw error;
    }
}

export async function update(user, memberId, body) {
    const member = await MemberRepository.findById(memberId);
    if (!member) throw notFound('Member not found');
    await assertFamilyAccess(user, member.family_id, Roles.FAMILY_ADMIN);
    const changes = parseMemberBody(body, false);
    if (Object.hasOwn(changes, 'branch_id')) await validateBranch(member.family_id, changes.branch_id);
    const dateOfBirth = Object.hasOwn(changes, 'date_of_birth') ? changes.date_of_birth : member.date_of_birth;
    const dateOfDeath = Object.hasOwn(changes, 'date_of_death') ? changes.date_of_death : member.date_of_death;
    assertDateOrder(dateOfBirth, dateOfDeath);
    return MemberRepository.update(memberId, changes);
}

export async function remove(user, memberId) {
    const member = await MemberRepository.findById(memberId);
    if (!member) throw notFound('Member not found');
    await assertFamilyAccess(user, member.family_id, Roles.FAMILY_ADMIN);
    await MemberRepository.remove(memberId);
}
