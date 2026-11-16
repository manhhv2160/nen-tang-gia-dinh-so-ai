import { EnumHelper } from '../constants/Enums.js';
import { GenealogyService } from '../services/GenealogyService.js';
import { MemberProfile } from '../models/MemberProfile.js';
import { DateFormatter } from '../utils/DateFormatter.js';
import { GraphTreeParser } from '../utils/GraphTreeParser.js';
import { EnumBinder } from '../components/EnumBinder.js';

export class GenealogyController {
  constructor(service = new GenealogyService()) {
    this.service = service;
    this.familyId = '';
    this.members = [];
    this.branches = [];
    this.tree = null;
    this.selectedMemberId = '';
    this.treeScale = 1;
    this.memberLoadId = 0;
    this.treeLoadId = 0;
  }

  async initMembers() {
    const familySelect = document.getElementById('family');
    const message = document.getElementById('members-message');
    const requestedFamilyId = new URLSearchParams(globalThis.location.search).get('family_id');
    try {
      const families = await this.#loadFamilies(familySelect, requestedFamilyId);
      if (!families.length) {
        message.textContent = 'Tài khoản chưa có dòng họ để xem.';
        return;
      }

      const branchSelect = document.getElementById('branch');
      const render = () => this.#renderMembers();
      ['s', 'f-gen', 'f-loc', 'f-verified', 'branch'].forEach((id) => {
        document.getElementById(id).addEventListener('input', render);
        document.getElementById(id).addEventListener('change', render);
      });
      familySelect.addEventListener('change', async () => {
        this.familyId = familySelect.value;
        branchSelect.value = '';
        this.#updateFamilyInUrl();
        await this.#loadMemberData(branchSelect, message);
      });

      await this.#loadMemberData(branchSelect, message);
    } catch (error) {
      message.textContent = error.message;
      message.classList.add('error');
    }
  }

  async initTree() {
    const familySelect = document.getElementById('family');
    const message = document.getElementById('tree-message');
    const query = new URLSearchParams(globalThis.location.search);
    const requestedFamilyId = query.get('family_id');
    this.selectedMemberId = query.get('member_id') ?? '';
    try {
      const families = await this.#loadFamilies(familySelect, requestedFamilyId);
      if (!families.length) {
        message.textContent = 'Tài khoản chưa có dòng họ để xem.';
        return;
      }

      const branchSelect = document.getElementById('branch');
      familySelect.addEventListener('change', async () => {
        this.familyId = familySelect.value;
        this.selectedMemberId = '';
        branchSelect.value = '';
        this.#updateFamilyInUrl();
        await this.#loadTree(branchSelect, message);
      });
      branchSelect.addEventListener('change', () => this.#loadTree(branchSelect, message));
      document.getElementById('q').addEventListener('input', () => this.#searchTree());
      document.getElementById('zoom-in').addEventListener('click', () => this.#zoom(0.1));
      document.getElementById('zoom-out').addEventListener('click', () => this.#zoom(-0.1));
      document.getElementById('zoom-reset').addEventListener('click', () => {
        this.treeScale = 1;
        this.#applyTreeScale();
      });
      document.getElementById('tree-content').addEventListener('click', (event) => {
        const button = event.target.closest('[data-member-id]');
        if (button) this.#selectMember(button.dataset.memberId);
      });
      await this.#loadTree(branchSelect, message);
    } catch (error) {
      message.textContent = error.message;
      message.classList.add('error');
    }
  }

  async #loadFamilies(select, requestedId) {
    const families = await this.service.listFamilies();
    if (!Array.isArray(families)) throw new TypeError('Phản hồi danh sách dòng họ không hợp lệ');
    select.replaceChildren();
    for (const family of families) {
      const option = document.createElement('option');
      option.value = family.family_id;
      option.textContent = family.family_name;
      select.appendChild(option);
    }
    if (!families.length) {
      select.disabled = true;
      return families;
    }
    this.familyId = families.some((family) => String(family.family_id) === requestedId)
      ? requestedId
      : String(families[0].family_id);
    select.value = this.familyId;
    return families;
  }

  async #loadMemberData(branchSelect, message) {
    const requestId = ++this.memberLoadId;
    message.classList.remove('error');
    message.textContent = 'Đang tải danh bạ...';
    branchSelect.disabled = true;
    this.members = [];
    this.branches = [];
    document.getElementById('members-list').replaceChildren();
    branchSelect.replaceChildren(this.#option('', 'Tất cả nhánh'));
    try {
      const [members, branches] = await Promise.all([
        this.service.listAllMembers(this.familyId),
        this.service.listBranches(this.familyId),
      ]);
      if (requestId !== this.memberLoadId) return;
      if (!Array.isArray(branches)) throw new TypeError('Phản hồi danh sách nhánh không hợp lệ');
      this.members = members.map((member) => new MemberProfile(member));
      this.branches = branches;
      this.#populateBranches(branchSelect);
      this.#populateMemberFilters();
      this.#renderMembers();
    } catch (error) {
      if (requestId === this.memberLoadId) {
        message.textContent = error.message;
        message.classList.add('error');
      }
    } finally {
      if (requestId === this.memberLoadId) branchSelect.disabled = false;
    }
  }

  #populateBranches(select) {
    const selected = select.value;
    select.replaceChildren(this.#option('', 'Tất cả nhánh'));
    for (const branch of this.branches) {
      select.appendChild(this.#option(branch.branch_id, branch.branch_name));
    }
    if (this.branches.some((branch) => String(branch.branch_id) === selected)) select.value = selected;
  }

  #populateMemberFilters() {
    const generations = [...new Set(this.members.map((member) => member.generation).filter(Boolean))]
      .sort((a, b) => a - b);
    const locations = [...new Set(this.members.map((member) => member.address).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'vi'));
    const generationSelect = document.getElementById('f-gen');
    const locationSelect = document.getElementById('f-loc');
    const generationValue = generationSelect.value;
    const locationValue = locationSelect.value;
    generationSelect.replaceChildren(this.#option('', 'Tất cả thế hệ'));
    locationSelect.replaceChildren(this.#option('', 'Tất cả nơi ở'));
    generations.forEach((value) => generationSelect.appendChild(this.#option(value, `Thế hệ ${value}`)));
    locations.forEach((value) => locationSelect.appendChild(this.#option(value, value)));
    generationSelect.value = generations.includes(Number(generationValue)) ? generationValue : '';
    locationSelect.value = locations.includes(locationValue) ? locationValue : '';
  }

  #renderMembers() {
    const body = document.getElementById('members-list');
    const search = document.getElementById('s').value.trim().toLocaleLowerCase('vi');
    const generation = document.getElementById('f-gen').value;
    const location = document.getElementById('f-loc').value;
    const verified = document.getElementById('f-verified').value;
    const branchId = document.getElementById('branch').value;
    const branchNames = new Map(this.branches.map((branch) => [String(branch.branch_id), branch.branch_name]));
    const filtered = this.members.filter((member) => {
      const searchable = [member.full_name, member.occupation, member.address]
        .some((value) => value?.toLocaleLowerCase('vi').includes(search));
      return searchable
        && (!generation || String(member.generation) === generation)
        && (!location || member.address === location)
        && (verified === '' || String(member.is_verified) === verified)
        && (!branchId || member.branch_id === branchId);
    });

    body.replaceChildren();
    for (const member of filtered) {
      const row = document.createElement('tr');
      row.append(
        this.#cell(member.full_name),
        this.#cell(EnumHelper.label('Gender', member.gender)),
        this.#cell(DateFormatter.formatDate(member.date_of_birth)),
        this.#cell(member.generation ?? '—'),
        this.#cell(member.occupation ?? '—'),
        this.#cell(member.address ?? '—'),
      );
      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = member.is_verified ? 'badge ok' : 'badge warn';
      badge.textContent = member.is_verified ? 'Đã xác minh' : 'Chờ duyệt';
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      const linkCell = document.createElement('td');
      const link = document.createElement('a');
      const params = new URLSearchParams({ family_id: this.familyId, member_id: member.member_id });
      link.href = `tree.html?${params}`;
      link.textContent = 'Xem trên cây';
      linkCell.appendChild(link);
      row.appendChild(linkCell);
      body.appendChild(row);
    }

    const message = document.getElementById('members-message');
    message.classList.remove('error');
    message.textContent = `${filtered.length} / ${this.members.length} thành viên`
      + (branchId && branchNames.has(branchId) ? ` · ${branchNames.get(branchId)}` : '');
    if (!filtered.length) {
      const row = document.createElement('tr');
      const cell = this.#cell(this.members.length ? 'Không tìm thấy thành viên phù hợp.' : 'Dòng họ chưa có thành viên.');
      cell.colSpan = 8;
      cell.className = 'empty-cell';
      row.appendChild(cell);
      body.appendChild(row);
    }
  }

  async #loadTree(branchSelect, message) {
    const requestId = ++this.treeLoadId;
    message.classList.remove('error');
    message.textContent = 'Đang tải cây gia phả...';
    branchSelect.disabled = true;
    document.getElementById('tree-content').replaceChildren();
    document.getElementById('member-detail').replaceChildren();
    try {
      const [branches, graph, profiles] = await Promise.all([
        this.service.listBranches(this.familyId),
        this.service.getTree(this.familyId, branchSelect.value),
        this.service.listAllMembers(this.familyId),
      ]);
      if (requestId !== this.treeLoadId) return;
      if (!Array.isArray(branches)) throw new TypeError('Phản hồi danh sách nhánh không hợp lệ');
      if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
        throw new TypeError('Phản hồi cây gia phả không hợp lệ');
      }
      this.branches = branches;
      this.#populateBranches(branchSelect);
      const profileById = new Map(profiles.map((profile) => [String(profile.member_id), profile]));
      graph.nodes = graph.nodes.map((node) => ({ ...profileById.get(String(node.member_id)), ...node }));
      this.tree = GraphTreeParser.parse(graph);
      this.#renderTree();
      const selectedId = this.tree.nodes.has(this.selectedMemberId)
        ? this.selectedMemberId
        : this.tree.roots[0]?.member_id;
      if (selectedId) this.#selectMember(selectedId);
      else this.#renderEmptyTree();
      this.#searchTree();
    } catch (error) {
      if (requestId === this.treeLoadId) {
        document.getElementById('tree-content').replaceChildren();
        document.getElementById('member-detail').replaceChildren();
        message.textContent = error.message;
        message.classList.add('error');
      }
    } finally {
      if (requestId === this.treeLoadId) branchSelect.disabled = false;
    }
  }

  #renderTree() {
    const content = document.getElementById('tree-content');
    content.replaceChildren();
    if (!this.tree?.roots.length) {
      this.#renderEmptyTree();
      return;
    }

    const list = document.createElement('ul');
    const visited = new Set();
    for (const root of this.tree.roots) {
      const item = this.#renderNode(root, visited);
      if (item) list.appendChild(item);
    }
    content.appendChild(list);
    this.#applyTreeScale();
  }

  #renderNode(node, visited) {
    if (visited.has(node.member_id)) return null;
    visited.add(node.member_id);
    const item = document.createElement('li');
    const profile = node.profile;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `node ${profile.gender === 'MALE' ? 'male' : profile.gender === 'FEMALE' ? 'female' : ''}`;
    button.dataset.memberId = profile.member_id;
    button.append(document.createTextNode(profile.full_name));
    const detail = document.createElement('small');
    detail.textContent = `${DateFormatter.formatLifeDates(profile.date_of_birth, profile.date_of_death)} · ${DateFormatter.formatGeneration(profile.generation)}`;
    button.appendChild(detail);
    if (node.relationship_type === 'ADOPTED') {
      const adopted = document.createElement('small');
      adopted.className = 'tree-relation';
      adopted.textContent = EnumHelper.label('RelationshipTypes', 'ADOPTED');
      button.appendChild(adopted);
    }
    item.appendChild(button);

    if (node.spouses.length) {
      const spouseGroup = document.createElement('div');
      spouseGroup.className = 'tree-spouses';
      for (const { node: spouseNode } of node.spouses) {
        const spouse = document.createElement('button');
        spouse.type = 'button';
        spouse.className = 'tree-spouse';
        spouse.dataset.memberId = spouseNode.member_id;
        spouse.textContent = `Vợ/chồng: ${spouseNode.profile.full_name}`;
        spouseGroup.appendChild(spouse);
      }
      item.appendChild(spouseGroup);
    }

    const children = [];
    for (const child of node.children) {
      const childItem = this.#renderNode(child, visited);
      if (childItem) children.push(childItem);
    }
    if (children.length) {
      const childList = document.createElement('ul');
      childList.append(...children);
      item.appendChild(childList);
    }
    return item;
  }

  #renderEmptyTree() {
    const content = document.getElementById('tree-content');
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Chưa có dữ liệu cây cho dòng họ hoặc nhánh này.';
    content.replaceChildren(empty);
    document.getElementById('tree-message').textContent = '';
    document.getElementById('member-detail').replaceChildren();
  }

  #selectMember(memberId) {
    const node = this.tree?.nodes.get(String(memberId));
    if (!node) return;
    this.selectedMemberId = node.member_id;
    document.querySelectorAll('#tree-content [data-member-id]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.memberId === this.selectedMemberId);
    });
    const profile = node.profile;
    const card = document.createElement('section');
    card.className = 'card';
    const heading = document.createElement('h2');
    heading.textContent = profile.full_name;
    card.appendChild(heading);
    const details = [
      ['Giới tính', EnumHelper.label('Gender', profile.gender)],
      ['Ngày sinh', DateFormatter.formatDate(profile.date_of_birth)],
      ['Ngày mất', DateFormatter.formatDate(profile.date_of_death)],
      ['Tuổi', DateFormatter.formatAge(profile.date_of_birth, profile.date_of_death)],
      ['Thế hệ', DateFormatter.formatGeneration(profile.generation)],
      ['Nhánh họ', this.branches.find((branch) => String(branch.branch_id) === profile.branch_id)?.branch_name ?? '—'],
      ['Nghề nghiệp', profile.occupation ?? '—'],
      ['Học vấn', profile.education ?? '—'],
      ['Nơi ở', profile.address ?? '—'],
      ['Xác minh', profile.is_verified ? 'Đã xác minh' : 'Chờ duyệt'],
    ];
    const list = document.createElement('ul');
    list.className = 'list';
    for (const [label, value] of details) {
      const item = document.createElement('li');
      item.append(`${label}: `, document.createTextNode(String(value)));
      list.appendChild(item);
    }
    card.appendChild(list);
    if (profile.bio) {
      const bio = document.createElement('p');
      bio.className = 'muted';
      bio.textContent = profile.bio;
      card.appendChild(bio);
    }
    document.getElementById('member-detail').replaceChildren(card);
  }

  #searchTree() {
    if (!this.tree) return;
    const query = document.getElementById('q').value.trim().toLocaleLowerCase('vi');
    const matches = [...this.tree.nodes.values()].filter((node) =>
      node.profile.full_name.toLocaleLowerCase('vi').includes(query));
    document.querySelectorAll('#tree-content [data-member-id]').forEach((button) => {
      button.classList.toggle('search-match', Boolean(query)
        && matches.some((node) => node.member_id === button.dataset.memberId));
    });
    const message = document.getElementById('tree-message');
    if (query && !matches.length) {
      message.textContent = 'Không tìm thấy thành viên phù hợp.';
    } else {
      message.classList.remove('error');
      message.textContent = `${this.tree.nodes.size} thành viên trong cây`
        + (query ? ` · ${matches.length} kết quả` : '');
      if (query && matches.length && !matches.some((node) => node.member_id === this.selectedMemberId)) {
        this.#selectMember(matches[0].member_id);
      }
    }
  }

  #zoom(change) {
    this.treeScale = Math.min(1.6, Math.max(0.6, Math.round((this.treeScale + change) * 10) / 10));
    this.#applyTreeScale();
  }

  #applyTreeScale() {
    const content = document.getElementById('tree-content');
    content.style.setProperty('--tree-scale', this.treeScale);
  }

  #updateFamilyInUrl() {
    const url = new URL(globalThis.location.href);
    url.searchParams.set('family_id', this.familyId);
    url.searchParams.delete('member_id');
    globalThis.history.replaceState(null, '', url);
  }

  #cell(value) {
    const cell = document.createElement('td');
    cell.textContent = String(value ?? '—');
    return cell;
  }

  #option(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }
}

if (typeof document !== 'undefined') {
  const controller = new GenealogyController();
  if (document.body?.dataset.page === 'members') controller.initMembers();
  if (document.body?.dataset.page === 'tree') controller.initTree();
  EnumBinder.bindAll();
}
