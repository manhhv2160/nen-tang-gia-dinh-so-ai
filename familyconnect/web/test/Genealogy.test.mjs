import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { GenealogyService } from '../src/services/GenealogyService.js';
import { DateFormatter } from '../src/utils/DateFormatter.js';
import { GraphTreeParser } from '../src/utils/GraphTreeParser.js';

const treeFixture = JSON.parse(
  await readFile(new URL('../mocks/tree.json', import.meta.url), 'utf8'),
).data;

test('parses parents, spouses, adopted relationships and disconnected family members', () => {
  const tree = GraphTreeParser.parse({
    ...treeFixture,
    nodes: [...treeFixture.nodes, {
      member_id: '9',
      full_name: 'Unlinked member',
      gender: 'OTHER',
      generation: 1,
    }],
  });

  assert.equal(tree.nodes.size, 9);
  assert.deepEqual(tree.roots.map((node) => node.member_id).sort(), ['1', '9']);
  const descendants = tree.nodes.get('1').children;
  assert.deepEqual(descendants.map((node) => node.member_id).sort(), ['3', '7']);
  assert.equal(tree.nodes.get('3').children[0].member_id, '5');
  assert.equal(tree.nodes.get('7').relationship_type, 'ADOPTED');
  assert.equal(tree.nodes.get('1').spouses[0].node.member_id, '2');
});

test('formats API date values without timezone conversion', () => {
  assert.equal(DateFormatter.formatDate('1930-01-15'), '15/01/1930');
  assert.equal(DateFormatter.formatDate(null), '—');
  assert.equal(DateFormatter.formatLifeDates('1930-01-15', '2010-06-02'), '1930 – 2010');
  assert.equal(DateFormatter.formatAge('2000-03-12', null, new Date('2026-03-11T00:00:00Z')), '25 tuổi');
  assert.equal(DateFormatter.formatGeneration(3), 'Thế hệ 3');
  assert.equal(DateFormatter.formatGeneration(null), 'Chưa rõ thế hệ');
});

test('loads every member page with the required family filter', async () => {
  const originalFetch = globalThis.fetch;
  const requestedOffsets = [];
  globalThis.fetch = async (url) => {
    const parsedUrl = new URL(url);
    requestedOffsets.push(parsedUrl.searchParams.get('offset'));
    const offset = Number(parsedUrl.searchParams.get('offset'));
    const members = offset === 0
      ? Array.from({ length: 100 }, (_, index) => ({ member_id: String(index + 1) }))
      : [{ member_id: '101' }];
    return new Response(JSON.stringify({
      success: true,
      status_code: 200,
      message: 'OK',
      data: members,
    }), { headers: { 'Content-Type': 'application/json' } });
  };

  try {
    const service = new GenealogyService({ baseUrl: 'http://localhost/api/v1', useMocks: false });
    const members = await service.listAllMembers('42');
    assert.equal(members.length, 101);
    assert.deepEqual(requestedOffsets, ['0', '100']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
