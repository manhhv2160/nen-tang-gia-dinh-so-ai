import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import pool from '../src/config/database.js';
import app from '../src/app.js';

const now = '2026-10-01T08:00:00.000Z';
const members = new Map([
    ['1', { member_id: '1', family_id: '1', branch_id: '1', full_name: 'Nguyễn Văn An', gender: 'MALE', date_of_birth: '1930-01-15', date_of_death: '2010-06-02', generation: 1, is_verified: true, occupation: 'Nông dân', address: 'TP. Hồ Chí Minh' }],
    ['2', { member_id: '2', family_id: '1', branch_id: '1', full_name: 'Lê Thị Hoa', gender: 'FEMALE', date_of_birth: '1934-08-20', date_of_death: null, generation: 1, is_verified: true, occupation: 'Nội trợ', address: 'TP. Hồ Chí Minh' }],
    ['3', { member_id: '3', family_id: '1', branch_id: '1', full_name: 'Nguyễn Văn Bình', gender: 'MALE', date_of_birth: '1958-03-12', date_of_death: null, generation: 2, is_verified: true, occupation: 'Giáo viên', address: 'TP. Hồ Chí Minh' }],
    ['4', { member_id: '4', family_id: '1', branch_id: '1', full_name: 'Trần Thị Mai', gender: 'FEMALE', date_of_birth: '1960-11-05', date_of_death: null, generation: 2, is_verified: true, occupation: 'Y tá', address: 'TP. Hồ Chí Minh' }],
    ['5', { member_id: '5', family_id: '1', branch_id: '1', full_name: 'Nguyễn Minh Khang', gender: 'MALE', date_of_birth: '1985-07-05', date_of_death: null, generation: 3, is_verified: true, occupation: 'Kỹ sư phần mềm', address: 'TP. Hồ Chí Minh' }],
    ['6', { member_id: '6', family_id: '1', branch_id: '1', full_name: 'Nguyễn Thu Hà', gender: 'FEMALE', date_of_birth: '1989-09-21', date_of_death: null, generation: 3, is_verified: false, occupation: 'Bác sĩ', address: 'Hà Nội' }],
    ['7', { member_id: '7', family_id: '1', branch_id: '1', full_name: 'Nguyễn Thị Cúc', gender: 'FEMALE', date_of_birth: '1962-01-01', date_of_death: null, generation: 2, is_verified: false, occupation: null, address: 'TP. Hồ Chí Minh' }],
    ['8', { member_id: '8', family_id: '1', branch_id: '1', full_name: 'Lê Gia Phúc', gender: 'MALE', date_of_birth: '1990-01-01', date_of_death: null, generation: 3, is_verified: false, occupation: null, address: 'TP. Hồ Chí Minh' }],
]);
const families = new Map([['1', { family_id: '1', family_name: 'Dòng họ Nguyễn' }]]);
const branches = new Map([['1', { branch_id: '1', family_id: '1', branch_name: 'Nhánh trưởng' }]]);
const relationships = new Map([
    ['1', { relationship_id: '1', parent_member_id: '1', child_member_id: '3', relationship_type: 'BIOLOGICAL', created_at: now, updated_at: now }],
    ['2', { relationship_id: '2', parent_member_id: '2', child_member_id: '3', relationship_type: 'BIOLOGICAL', created_at: now, updated_at: now }],
    ['3', { relationship_id: '3', parent_member_id: '3', child_member_id: '5', relationship_type: 'BIOLOGICAL', created_at: now, updated_at: now }],
    ['4', { relationship_id: '4', parent_member_id: '4', child_member_id: '5', relationship_type: 'BIOLOGICAL', created_at: now, updated_at: now }],
    ['5', { relationship_id: '5', parent_member_id: '3', child_member_id: '6', relationship_type: 'BIOLOGICAL', created_at: now, updated_at: now }],
    ['6', { relationship_id: '6', parent_member_id: '1', child_member_id: '7', relationship_type: 'ADOPTED', created_at: now, updated_at: now }],
    ['7', { relationship_id: '7', parent_member_id: '7', child_member_id: '8', relationship_type: 'BIOLOGICAL', created_at: now, updated_at: now }],
]);
const marriages = new Map([
    ['1', { marriage_id: '1', spouse_1_member_id: '1', spouse_2_member_id: '2', marriage_date: '1955-02-10', status: 'MARRIED', created_at: now, updated_at: now }],
    ['2', { marriage_id: '2', spouse_1_member_id: '3', spouse_2_member_id: '4', marriage_date: '1983-05-21', status: 'MARRIED', created_at: now, updated_at: now }],
]);
const originalQuery = pool.query.bind(pool);
let nextRelationshipId = 20;
let nextMarriageId = 20;
let server;
let baseUrl;

function isDescendant(startId, targetId) {
    const visited = new Set([startId]);
    const queue = [startId];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        for (const relationship of relationships.values()) {
            if (relationship.parent_member_id !== queue[cursor]) continue;
            if (relationship.child_member_id === targetId) return true;
            if (!visited.has(relationship.child_member_id)) {
                visited.add(relationship.child_member_id);
                queue.push(relationship.child_member_id);
            }
        }
    }
    return false;
}

function filteredMembers(sql, values) {
    let rows = [...members.values()].filter((member) => member.family_id === values[0]);
    const queryValue = values.find((value) => typeof value === 'string' && value.startsWith('%'));
    if (sql.includes('occupation ILIKE') || sql.includes('address ILIKE') || sql.includes('full_name ILIKE')) {
        const q = queryValue.slice(1, -1).toLocaleLowerCase();
        rows = rows.filter((member) => [member.full_name, member.occupation, member.address]
            .some((value) => value?.toLocaleLowerCase().includes(q)));
    }
    return rows;
}

before(async () => {
    pool.query = async (sql, values = []) => {
        if (sql.startsWith('SELECT * FROM family WHERE family_id = $1')) {
            const family = families.get(values[0]);
            return { rows: family ? [family] : [], rowCount: family ? 1 : 0 };
        }
        if (sql.startsWith('SELECT * FROM branch WHERE branch_id = $1')) {
            const branch = branches.get(values[0]);
            return { rows: branch ? [branch] : [], rowCount: branch ? 1 : 0 };
        }
        if (sql.startsWith('SELECT * FROM member WHERE member_id = $1')) {
            const member = members.get(values[0]);
            return { rows: member ? [member] : [], rowCount: member ? 1 : 0 };
        }
        if (sql.startsWith('SELECT member_id, full_name, gender, date_of_birth')) {
            return { rows: [...members.values()].filter((member) => member.family_id === values[0]), rowCount: members.size };
        }
        if (sql.startsWith('SELECT r.relationship_id, r.parent_member_id')) {
            return { rows: [...relationships.values()], rowCount: relationships.size };
        }
        if (sql.startsWith('SELECT m.marriage_id, m.spouse_1_member_id')) {
            return { rows: [...marriages.values()], rowCount: marriages.size };
        }
        if (sql.startsWith('SELECT r.* FROM parent_child_relationship')) {
            let rows = [...relationships.values()];
            const filters = values.slice(1);
            if (filters.length) {
                rows = rows.filter((relationship) => filters.some((id) =>
                    relationship.parent_member_id === id
                    || relationship.child_member_id === id));
            }
            return { rows, rowCount: rows.length };
        }
        if (sql.startsWith('SELECT r.*, parent.family_id')) {
            const relationship = relationships.get(values[0]);
            return { rows: relationship ? [{ ...relationship, family_id: '1' }] : [], rowCount: relationship ? 1 : 0 };
        }
        if (sql.startsWith('WITH RECURSIVE descendants')) {
            const [parentId, childId, relationshipType] = values;
            if (isDescendant(childId, parentId)) return { rows: [], rowCount: 0 };
            const duplicate = [...relationships.values()].some((relationship) =>
                relationship.parent_member_id === parentId && relationship.child_member_id === childId);
            if (duplicate) {
                const error = new Error('duplicate relationship');
                error.code = '23505';
                throw error;
            }
            const relationship = {
                relationship_id: String(nextRelationshipId++),
                parent_member_id: parentId,
                child_member_id: childId,
                relationship_type: relationshipType,
                created_at: now,
                updated_at: now,
            };
            relationships.set(relationship.relationship_id, relationship);
            return { rows: [relationship], rowCount: 1 };
        }
        if (sql.startsWith('UPDATE parent_child_relationship')) {
            const relationship = relationships.get(values[1]);
            if (!relationship) return { rows: [], rowCount: 0 };
            relationship.relationship_type = values[0];
            return { rows: [relationship], rowCount: 1 };
        }
        if (sql.startsWith('DELETE FROM parent_child_relationship')) {
            const deleted = relationships.delete(values[0]);
            return { rows: deleted ? [{ relationship_id: values[0] }] : [], rowCount: deleted ? 1 : 0 };
        }
        if (sql.startsWith('SELECT marriage.marriage_id') && sql.includes('AND (marriage.spouse_1_member_id')) {
            const rows = [...marriages.values()].filter((marriage) =>
                marriage.spouse_1_member_id === values[1] || marriage.spouse_2_member_id === values[1]);
            return { rows, rowCount: rows.length };
        }
        if (sql.startsWith('SELECT marriage.marriage_id') && sql.includes('spouse_1.family_id')) {
            const marriage = marriages.get(values[0]);
            return { rows: marriage ? [{ ...marriage, family_id: '1' }] : [], rowCount: marriage ? 1 : 0 };
        }
        if (sql.startsWith('INSERT INTO marriage')) {
            const marriage = {
                marriage_id: String(nextMarriageId++),
                spouse_1_member_id: values[0],
                spouse_2_member_id: values[1],
                marriage_date: values[2],
                status: values[3],
                created_at: now,
                updated_at: now,
            };
            marriages.set(marriage.marriage_id, marriage);
            return { rows: [marriage], rowCount: 1 };
        }
        if (sql.startsWith('UPDATE marriage')) {
            const marriage = marriages.get(values.at(-1));
            if (!marriage) return { rows: [], rowCount: 0 };
            const assignment = sql.match(/SET (.*), updated_at/)[1];
            for (const [index, item] of assignment.split(', ').entries()) {
                marriage[item.split(' = ')[0]] = values[index];
            }
            return { rows: [marriage], rowCount: 1 };
        }
        if (sql.startsWith('DELETE FROM marriage')) {
            const deleted = marriages.delete(values[0]);
            return { rows: deleted ? [{ marriage_id: values[0] }] : [], rowCount: deleted ? 1 : 0 };
        }
        if (sql.startsWith('SELECT COUNT(*)::int AS total FROM member')) {
            return { rows: [{ total: filteredMembers(sql, values).length }], rowCount: 1 };
        }
        if (sql.startsWith('SELECT * FROM member WHERE family_id')) {
            return { rows: filteredMembers(sql, values.slice(0, -2)), rowCount: 1 };
        }
        throw new Error(`Unexpected test query: ${sql}`);
    };
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery;
});

async function request(path, method = 'GET', body) {
    return fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            'content-type': 'application/json',
            'x-user-id': '1',
            'x-user-role': 'SYSTEM_ADMIN',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

test('tree API returns nodes and parent/marriage edges matching the sample family', async () => {
    const response = await request('/api/tree?family_id=1');
    assert.equal(response.status, 200);
    const tree = (await response.json()).data;
    assert.deepEqual(tree.nodes.map((member) => member.member_id), ['1', '2', '3', '4', '5', '6', '7', '8']);
    assert.equal(tree.edges.filter((edge) => edge.type === 'PARENT_CHILD').length, 7);
    assert.equal(tree.edges.filter((edge) => edge.type === 'MARRIAGE').length, 2);
    assert.ok(tree.edges.some((edge) =>
        edge.type === 'PARENT_CHILD' && edge.parent_member_id === '1'
        && edge.child_member_id === '7' && edge.relationship_type === 'ADOPTED'));

    const subtreeResponse = await request('/api/tree?family_id=1&root_member_id=1&depth=1');
    assert.deepEqual((await subtreeResponse.json()).data.nodes.map((member) => member.member_id), ['1', '3', '7']);
});

test('relationship CRUD rejects ancestor cycles and supports the sample relationship types', async () => {
    const createResponse = await request('/api/relationships', 'POST', {
        parent_member_id: '4',
        child_member_id: '8',
        relationship_type: 'BIOLOGICAL',
    });
    assert.equal(createResponse.status, 201);

    const cycleResponse = await request('/api/relationships', 'POST', {
        parent_member_id: '8',
        child_member_id: '1',
        relationship_type: 'BIOLOGICAL',
    });
    assert.equal(cycleResponse.status, 400);
    assert.equal((await cycleResponse.json()).data.code, 'VALIDATION_ERROR');

    const relationshipId = (await createResponse.json()).data.relationship_id;
    const updateResponse = await request(`/api/relationships/${relationshipId}`, 'PATCH', {
        relationship_type: 'ADOPTED',
    });
    assert.equal((await updateResponse.json()).data.relationship_type, 'ADOPTED');
    assert.equal((await request(`/api/relationships/${relationshipId}`, 'DELETE')).status, 200);
});

test('marriage CRUD validates and returns member marriages', async () => {
    const createResponse = await request('/api/marriages', 'POST', {
        spouse_1_member_id: '5',
        spouse_2_member_id: '6',
        marriage_date: '2020-04-15',
    });
    assert.equal(createResponse.status, 201);
    const marriage = (await createResponse.json()).data;
    assert.equal(marriage.status, 'MARRIED');

    const listResponse = await request('/api/marriages?member_id=5');
    assert.equal((await listResponse.json()).data.some((item) => item.marriage_id === marriage.marriage_id), true);

    const updateResponse = await request(`/api/marriages/${marriage.marriage_id}`, 'PATCH', {
        status: 'DIVORCED',
    });
    assert.equal((await updateResponse.json()).data.status, 'DIVORCED');
    assert.equal((await request(`/api/marriages/${marriage.marriage_id}`, 'DELETE')).status, 200);
});

test('relationship query returns the route and relative type in both public paths', async () => {
    for (const path of ['/api/relationships/query', '/api/relation-query']) {
        const response = await request(`${path}?from_member_id=5&to_member_id=7`);
        assert.equal(response.status, 200);
        const relation = (await response.json()).data;
        assert.equal(relation.relation, 'NIECE_NEPHEW');
        assert.deepEqual(relation.path.map(({ step }) => step), ['PARENT', 'PARENT', 'CHILD']);
    }

    const cousin = await request('/api/relationships/query?from_member_id=5&to_member_id=8');
    assert.equal((await cousin.json()).data.relation, 'COUSIN');

    members.set('9', {
        member_id: '9',
        family_id: '1',
        branch_id: '1',
        full_name: 'Isolated Member',
        gender: 'OTHER',
        generation: 1,
        is_verified: false,
    });
    const unknown = await request('/api/relationships/query?from_member_id=5&to_member_id=9');
    assert.equal((await unknown.json()).data.relation, 'NONE');
});

test('address-book q filter searches member name, occupation and address', async () => {
    const response = await request('/api/members?family_id=1&q=Hà%20Nội');
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.data.map((member) => member.member_id), ['6']);
    assert.equal(response.headers.get('x-total-count'), '1');
});

test('sample members, relationships, marriages and tree use the same member IDs', async () => {
    const [membersSample, relationshipsSample, marriagesSample, treeSample] = await Promise.all([
        readFile(new URL('../../../web/mocks/members.json', import.meta.url), 'utf8').then(JSON.parse),
        readFile(new URL('../../../web/mocks/relationships.json', import.meta.url), 'utf8').then(JSON.parse),
        readFile(new URL('../../../web/mocks/marriages.json', import.meta.url), 'utf8').then(JSON.parse),
        readFile(new URL('../../../web/mocks/tree.json', import.meta.url), 'utf8').then(JSON.parse),
    ]);
    const memberIds = new Set(membersSample.data.map((member) => member.member_id));
    assert.deepEqual(new Set(treeSample.data.nodes.map((member) => member.member_id)), memberIds);
    for (const relationship of relationshipsSample.data) {
        assert.ok(memberIds.has(relationship.parent_member_id));
        assert.ok(memberIds.has(relationship.child_member_id));
    }
    for (const marriage of marriagesSample.data) {
        assert.ok(memberIds.has(marriage.spouse_1_member_id));
        assert.ok(memberIds.has(marriage.spouse_2_member_id));
    }
});
