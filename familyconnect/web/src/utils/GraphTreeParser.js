import { FamilyNode } from '../models/FamilyNode.js';
import { MemberProfile } from '../models/MemberProfile.js';

export class GraphTreeParser {
  static parse(graph = {}) {
    const nodes = new Map();
    for (const data of Array.isArray(graph.nodes) ? graph.nodes : []) {
      const profile = new MemberProfile(data);
      if (profile.member_id) nodes.set(profile.member_id, new FamilyNode(profile));
    }

    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const parentEdges = [];
    for (const edge of edges) {
      if (edge.type === 'MARRIAGE') {
        const first = nodes.get(String(edge.spouse_1_member_id));
        const second = nodes.get(String(edge.spouse_2_member_id));
        if (first && second) {
          first.spouses.push({ node: second, status: edge.status ?? null });
          second.spouses.push({ node: first, status: edge.status ?? null });
        }
      } else if (edge.type === 'PARENT_CHILD') {
        const parent = nodes.get(String(edge.parent_member_id));
        const child = nodes.get(String(edge.child_member_id));
        if (parent && child && parent !== child) {
          child.parents.push(parent);
          parentEdges.push({ parent, child, relationshipType: edge.relationship_type ?? null });
        }
      }
    }

    const primaryParents = new Map();
    for (const edge of parentEdges) {
      const current = primaryParents.get(edge.child.member_id);
      if (!current || GraphTreeParser.#parentOrder(edge.parent, current.parent) < 0) {
        primaryParents.set(edge.child.member_id, edge);
      }
    }

    for (const [memberId, edge] of primaryParents) {
      edge.parent.children.push(edge.child);
      edge.child.relationship_type = edge.relationshipType;
      edge.child.primary_parent_id = edge.parent.member_id;
    }

    const spouseIds = new Set();
    for (const node of nodes.values()) {
      for (const spouse of node.spouses) spouseIds.add(spouse.node.member_id);
      node.spouses.sort((a, b) => a.node.profile.full_name.localeCompare(b.node.profile.full_name, 'vi'));
      node.children.sort(GraphTreeParser.#nodeOrder);
    }

    let roots = [...nodes.values()]
      .filter((node) => !node.primary_parent_id && !GraphTreeParser.#isSecondarySpouse(node, spouseIds, nodes))
      .sort(GraphTreeParser.#nodeOrder);

    if (!roots.length && nodes.size) roots = [[...nodes.values()].sort(GraphTreeParser.#nodeOrder)[0]];
    return { roots, nodes, edges };
  }

  static #parentOrder(first, second) {
    const genderOrder = (node) => node.profile.gender === 'MALE' ? 0 : 1;
    return genderOrder(first) - genderOrder(second) || GraphTreeParser.#nodeOrder(first, second);
  }

  static #nodeOrder(first, second) {
    const firstGeneration = first.profile.generation ?? Number.MAX_SAFE_INTEGER;
    const secondGeneration = second.profile.generation ?? Number.MAX_SAFE_INTEGER;
    return firstGeneration - secondGeneration
      || first.profile.full_name.localeCompare(second.profile.full_name, 'vi')
      || first.member_id.localeCompare(second.member_id, undefined, { numeric: true });
  }

  static #isSecondarySpouse(node, spouseIds, nodes) {
    if (!spouseIds.has(node.member_id) || node.profile.gender !== 'FEMALE') return false;
    return node.spouses.some(({ node: spouse }) => spouse.profile.gender === 'MALE' && nodes.has(spouse.member_id));
  }
}
