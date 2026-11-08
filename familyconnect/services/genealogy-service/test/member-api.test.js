import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import pool from '../src/config/database.js';
import app from '../src/app.js';

const members = new Map();
const families = new Map();
const branches = new Map();
const originalQuery = pool.query.bind(pool);
let server;
let baseUrl;

before(async () => {
    pool.query = async (sql, values = []) => {
        if (sql.startsWith('INSERT INTO family')) {
            const family = {
                family_id: '80001',
                user_id: values[0],
                family_name: values[1],
                description: values[2],
                origin_place: values[3],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            families.set(family.family_id, family);
            return { rows: [family], rowCount: 1 };
        }
        if (sql.startsWith('SELECT * FROM family WHERE family_id = $1')) {
            const family = families.get(values[0]);
            return { rows: family ? [family] : [], rowCount: family ? 1 : 0 };
        }
        if (sql.startsWith('UPDATE family SET')) {
            const family = families.get(values.at(-1));
            if (!family) return { rows: [], rowCount: 0 };
            for (const assignment of sql.match(/SET (.*), updated_at = NOW\(\)/)[1].split(', ')) {
                const [field, parameter] = assignment.split(' = ');
                family[field] = values[Number(parameter.slice(1)) - 1];
            }
            family.updated_at = new Date().toISOString();
            return { rows: [family], rowCount: 1 };
        }
        if (sql.startsWith('DELETE FROM family')) {
            const deleted = families.delete(values[0]);
            return { rows: deleted ? [{ family_id: values[0] }] : [], rowCount: deleted ? 1 : 0 };
        }
        if (sql.startsWith('INSERT INTO branch')) {
            const branch = {
                branch_id: '70001',
                family_id: values[0],
                branch_name: values[1],
                description: values[2],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            branches.set(branch.branch_id, branch);
            return { rows: [branch], rowCount: 1 };
        }
        if (sql.startsWith('SELECT * FROM branch WHERE branch_id = $1')) {
            const branch = branches.get(values[0]);
            return { rows: branch ? [branch] : [], rowCount: branch ? 1 : 0 };
        }
        if (sql.startsWith('UPDATE branch SET')) {
            const branch = branches.get(values.at(-1));
            if (!branch) return { rows: [], rowCount: 0 };
            for (const assignment of sql.match(/SET (.*), updated_at = NOW\(\)/)[1].split(', ')) {
                const [field, parameter] = assignment.split(' = ');
                branch[field] = values[Number(parameter.slice(1)) - 1];
            }
            branch.updated_at = new Date().toISOString();
            return { rows: [branch], rowCount: 1 };
        }
        if (sql.startsWith('DELETE FROM branch')) {
            const deleted = branches.delete(values[0]);
            return { rows: deleted ? [{ branch_id: values[0] }] : [], rowCount: deleted ? 1 : 0 };
        }
        if (sql.startsWith('INSERT INTO member')) {
            const member = {
                member_id: '90001',
                family_id: values[0],
                branch_id: values[1],
                user_id: null,
                full_name: values[2],
                gender: values[3],
                date_of_birth: values[4],
                date_of_death: values[5],
                generation: values[6],
                occupation: values[7],
                education: values[8],
                address: values[9],
                bio: values[10],
                is_verified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            members.set(member.member_id, member);
            return { rows: [member], rowCount: 1 };
        }
        if (sql.startsWith('SELECT * FROM member WHERE member_id = $1')) {
            const member = members.get(values[0]);
            return { rows: member ? [member] : [], rowCount: member ? 1 : 0 };
        }
        if (sql.startsWith('SELECT 1 FROM member WHERE user_id = $1 AND family_id = $2')) {
            return { rows: [], rowCount: 0 };
        }
        if (sql.startsWith('UPDATE member SET')) {
            const member = members.get(values.at(-1));
            if (!member) return { rows: [], rowCount: 0 };
            for (const assignment of sql.match(/SET (.*), updated_at = NOW\(\)/)[1].split(', ')) {
                const [field, parameter] = assignment.split(' = ');
                member[field] = values[Number(parameter.slice(1)) - 1];
            }
            member.updated_at = new Date().toISOString();
            return { rows: [member], rowCount: 1 };
        }
        if (sql.startsWith('DELETE FROM member')) {
            const deleted = members.delete(values[0]);
            return { rows: deleted ? [{ member_id: values[0] }] : [], rowCount: deleted ? 1 : 0 };
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

async function request(path, method, body, { userId = '1', role = 'SYSTEM_ADMIN' } = {}) {
    return fetch(`${baseUrl}${path}`, {
        method,
        headers: {
            'content-type': 'application/json',
            'x-user-id': userId,
            'x-user-role': role,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

test('member API creates, reads, updates and deletes a member', async () => {
    const healthResponse = await fetch(`${baseUrl}/health`);
    assert.equal(healthResponse.status, 200);
    assert.equal((await healthResponse.json()).data.status, 'UP');

    const createResponse = await request('/api/members', 'POST', {
        family_id: '1',
        full_name: 'Nguyen Van A',
        gender: 'MALE',
        generation: 2,
    });
    assert.equal(createResponse.status, 201);
    const created = (await createResponse.json()).data;
    assert.equal(created.member_id, '90001');
    assert.equal(created.full_name, 'Nguyen Van A');

    const readResponse = await request(`/api/members/${created.member_id}`, 'GET');
    assert.equal(readResponse.status, 200);
    assert.equal((await readResponse.json()).data.member_id, created.member_id);

    const updateResponse = await request(`/api/members/${created.member_id}`, 'PATCH', {
        full_name: 'Nguyen Van B',
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((await updateResponse.json()).data.full_name, 'Nguyen Van B');

    const deleteResponse = await request(`/api/members/${created.member_id}`, 'DELETE');
    assert.equal(deleteResponse.status, 200);
    assert.equal((await deleteResponse.json()).data, null);
});

test('member API rejects invalid gender before writing', async () => {
    const response = await request('/api/members', 'POST', {
        family_id: '1',
        full_name: 'Nguyen Van A',
        gender: 'UNKNOWN',
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.data.code, 'VALIDATION_ERROR');
    assert.equal(payload.data.fields.gender, 'must be one of MALE, FEMALE, OTHER');
});

test('member API rejects IDs outside the BIGINT range', async () => {
    const response = await request('/api/members/9223372036854775808', 'GET');
    assert.equal(response.status, 400);
    assert.equal((await response.json()).data.code, 'VALIDATION_ERROR');
});

test('member API requires an authenticated user', async () => {
    const response = await fetch(`${baseUrl}/api/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ family_id: '1', full_name: 'Nguyen Van A' }),
    });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).data.code, 'UNAUTHENTICATED');
});

test('family administrators must belong to the family before adding a member', async () => {
    const response = await request('/api/members', 'POST', {
        family_id: '1',
        full_name: 'Nguyen Van A',
    }, { userId: '2', role: 'FAMILY_ADMIN' });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).data.code, 'FORBIDDEN');
});

test('family and branch APIs support create, read, update and delete', async () => {
    const familyCreate = await request('/api/families', 'POST', {
        family_name: 'Nguyen',
        origin_place: 'Ha Noi',
    });
    assert.equal(familyCreate.status, 201);
    const family = (await familyCreate.json()).data;
    assert.equal(family.user_id, '1');

    const familyRead = await request(`/api/families/${family.family_id}`, 'GET');
    assert.equal(familyRead.status, 200);
    const familyUpdate = await request(`/api/families/${family.family_id}`, 'PATCH', {
        family_name: 'Nguyen Updated',
    });
    assert.equal((await familyUpdate.json()).data.family_name, 'Nguyen Updated');

    const branchCreate = await request('/api/branches', 'POST', {
        family_id: family.family_id,
        branch_name: 'Northern branch',
    });
    assert.equal(branchCreate.status, 201);
    const branch = (await branchCreate.json()).data;
    const branchRead = await request(`/api/branches/${branch.branch_id}`, 'GET');
    assert.equal(branchRead.status, 200);
    const branchUpdate = await request(`/api/branches/${branch.branch_id}`, 'PATCH', {
        description: 'Updated description',
    });
    assert.equal((await branchUpdate.json()).data.description, 'Updated description');

    assert.equal((await request(`/api/branches/${branch.branch_id}`, 'DELETE')).status, 200);
    assert.equal((await request(`/api/families/${family.family_id}`, 'DELETE')).status, 200);
});
