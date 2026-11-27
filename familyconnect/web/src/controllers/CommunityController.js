import { AuthGuard } from '../components/AuthGuard.js';
import { EnumBinder } from '../components/EnumBinder.js';
import { EnumHelper, ReactionTypes, Roles } from '../constants/Enums.js';
import { Post } from '../models/Post.js';
import { CommunityService } from '../services/CommunityService.js';
import { DateFormatter } from '../utils/DateFormatter.js';

/**
 * Trang bảng tin (feed.html): đăng bài, bình luận, thả cảm xúc.
 * Mọi kiểm tra quyền thật nằm ở community-service (thuộc dòng họ + chính tác giả);
 * controller chỉ ẩn/hiện nút cho gọn giao diện.
 */
export class CommunityController {
  constructor(service = new CommunityService()) {
    this.service = service;
    this.user = null;
    this.familyId = '';
    this.filterType = '';
    this.posts = [];
    this.details = new Map();
    this.userNames = new Map();
    this.loadId = 0;
  }

  async initFeed() {
    this.user = AuthGuard.require(Roles.FAMILY_MEMBER);
    if (!this.user) return;

    const familySelect = document.getElementById('family');
    const typeSelect = document.getElementById('post-type');
    const message = document.getElementById('feed-message');

    document.getElementById('post-submit').addEventListener('click', () => this.#createPost(message));
    familySelect.addEventListener('change', async () => {
      this.familyId = familySelect.value;
      this.#updateFamilyInUrl();
      await this.#loadFeed(message);
    });
    typeSelect.addEventListener('change', async () => {
      this.filterType = typeSelect.value;
      await this.#loadFeed(message);
    });
    document.getElementById('posts').addEventListener('click', (event) => this.#onPostsClick(event, message));

    try {
      const families = await this.service.listFamilies();
      if (!Array.isArray(families)) throw new TypeError('Phản hồi danh sách dòng họ không hợp lệ');
      if (!families.length) {
        message.textContent = 'Tài khoản chưa có dòng họ để xem.';
        document.getElementById('post-submit').disabled = true;
        return;
      }

      const requested = new URLSearchParams(globalThis.location.search).get('family_id');
      familySelect.replaceChildren();
      for (const family of families) {
        const option = document.createElement('option');
        option.value = family.family_id;
        option.textContent = family.family_name;
        familySelect.appendChild(option);
      }
      this.familyId = families.some((family) => String(family.family_id) === requested)
        ? requested
        : String(families[0].family_id);
      familySelect.value = this.familyId;

      try {
        this.userNames = await this.service.listUserNames();
      } catch {
        this.userNames = new Map();
      }

      await this.#loadFeed(message);
    } catch (error) {
      this.#showError(message, error);
    }
  }

  async #loadFeed(message) {
    const requestId = ++this.loadId;
    message.classList.remove('error');
    message.textContent = 'Đang tải bảng tin...';
    document.getElementById('posts').replaceChildren();

    try {
      const posts = await this.service.listPosts(this.familyId, { postType: this.filterType });
      if (!Array.isArray(posts)) throw new TypeError('Phản hồi danh sách bài viết không hợp lệ');
      const models = posts.map(Post.from);

      const details = await Promise.all(models.map(async (post) => {
        const [comments, reactions] = await Promise.all([
          this.service.listComments(post.post_id),
          this.service.listReactions(post.post_id),
        ]);
        return {
          comments: Array.isArray(comments) ? comments : [],
          reactions: Array.isArray(reactions) ? reactions : [],
        };
      }));
      if (requestId !== this.loadId) return;

      this.posts = models;
      this.details = new Map(models.map((post, index) => [post.post_id, details[index]]));

      const container = document.getElementById('posts');
      container.replaceChildren(...models.map((post) => this.#renderPost(post)));
      EnumBinder.bindAll(container);
      message.textContent = models.length ? '' : 'Chưa có bài đăng nào.';
    } catch (error) {
      if (requestId === this.loadId) this.#showError(message, error);
    }
  }

  async #createPost(message) {
    const typeSelect = document.getElementById('new-type');
    const titleInput = document.getElementById('new-title');
    const contentInput = document.getElementById('new-content');
    const content = contentInput.value.trim();

    if (!content) {
      message.textContent = 'Nội dung bài đăng không được để trống.';
      message.classList.add('error');
      contentInput.focus();
      return;
    }

    const button = document.getElementById('post-submit');
    button.disabled = true;
    message.classList.remove('error');
    message.textContent = 'Đang đăng bài...';
    try {
      await this.service.createPost({
        family_id: this.familyId,
        post_type: typeSelect.value,
        title: titleInput.value.trim() || null,
        content,
      });
      contentInput.value = '';
      titleInput.value = '';
      await this.#loadFeed(message);
      message.textContent = 'Đã đăng bài.';
    } catch (error) {
      this.#showError(message, error);
    } finally {
      button.disabled = false;
    }
  }

  #onPostsClick(event, message) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const article = button.closest('[data-post-id]');
    const postId = article?.dataset.postId;
    if (!postId) return;

    switch (button.dataset.action) {
      case 'react':
        return void this.#react(postId, button.dataset.value, message);
      case 'comment':
        return void this.#addComment(article, postId, message);
      case 'delete-post':
        return void this.#deletePost(postId, message);
      case 'delete-comment':
        return void this.#deleteComment(postId, button.dataset.commentId, message);
      default:
        return undefined;
    }
  }

  async #react(postId, reactionType, message) {
    const current = this.details.get(postId)?.reactions ?? [];
    const mine = current.find((item) => String(item.user_id) === String(this.user.userId));
    message.classList.remove('error');
    try {
      if (mine && mine.reaction_type === reactionType) {
        await this.service.removeReaction(mine.reaction_id);
      } else {
        await this.service.react(postId, reactionType);
      }
      await this.#refreshPost(postId);
    } catch (error) {
      this.#showError(message, error);
    }
  }

  async #addComment(article, postId, message) {
    const input = article.querySelector('input[data-comment-input]');
    const content = input?.value.trim() ?? '';
    if (!content) {
      message.textContent = 'Nội dung bình luận không được để trống.';
      message.classList.add('error');
      input?.focus();
      return;
    }

    message.classList.remove('error');
    try {
      const comment = await this.service.createComment(postId, content);
      const detail = this.details.get(postId) ?? { comments: [], reactions: [] };
      detail.comments = [...detail.comments, comment];
      this.details.set(postId, detail);
      input.value = '';
      this.#replaceArticle(postId);
    } catch (error) {
      this.#showError(message, error);
    }
  }

  async #deletePost(postId, message) {
    if (!globalThis.confirm('Xóa bài viết này cùng toàn bộ bình luận và cảm xúc?')) return;
    message.classList.remove('error');
    try {
      await this.service.deletePost(postId);
      this.posts = this.posts.filter((post) => post.post_id !== postId);
      this.details.delete(postId);
      document.querySelector(`[data-post-id="${postId}"]`)?.remove();
      if (!this.posts.length) message.textContent = 'Chưa có bài đăng nào.';
    } catch (error) {
      this.#showError(message, error);
    }
  }

  async #deleteComment(postId, commentId, message) {
    message.classList.remove('error');
    try {
      await this.service.deleteComment(commentId);
      const detail = this.details.get(postId);
      if (detail) {
        detail.comments = detail.comments.filter((item) => String(item.comment_id) !== String(commentId));
        this.details.set(postId, detail);
      }
      this.#replaceArticle(postId);
    } catch (error) {
      this.#showError(message, error);
    }
  }

  async #refreshPost(postId) {
    const post = this.posts.find((item) => item.post_id === postId);
    if (!post) return;
    const [comments, reactions] = await Promise.all([
      this.service.listComments(postId),
      this.service.listReactions(postId),
    ]);
    this.details.set(postId, {
      comments: Array.isArray(comments) ? comments : [],
      reactions: Array.isArray(reactions) ? reactions : [],
    });
    this.#replaceArticle(postId);
  }

  #replaceArticle(postId) {
    const post = this.posts.find((item) => item.post_id === postId);
    const article = document.querySelector(`[data-post-id="${postId}"]`);
    if (!post || !article) return;
    const next = this.#renderPost(post);
    article.replaceWith(next);
    EnumBinder.bindAll(next);
  }

  #renderPost(post) {
    const detail = this.details.get(post.post_id) ?? { comments: [], reactions: [] };
    const article = document.createElement('article');
    article.className = 'card';
    article.dataset.postId = post.post_id;

    const meta = document.createElement('div');
    meta.className = 'post-meta';
    const author = document.createElement('span');
    author.textContent = `${this.#nameOf(post.user_id)} · ${DateFormatter.formatDate(post.created_at)}`;
    const badge = document.createElement('span');
    badge.className = post.post_type === 'ANNOUNCEMENT' ? 'badge warn' : 'badge';
    badge.dataset.enumLabel = 'PostTypes';
    badge.dataset.value = post.post_type;
    badge.textContent = EnumHelper.label('PostTypes', post.post_type);
    meta.append(author, badge);
    if (post.isAuthor(this.user.userId)) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn small secondary';
      remove.dataset.action = 'delete-post';
      remove.textContent = 'Xóa bài';
      meta.appendChild(remove);
    }
    article.appendChild(meta);

    if (post.hasTitle) {
      const heading = document.createElement('h2');
      heading.textContent = post.title;
      article.appendChild(heading);
    }
    const body = document.createElement('p');
    body.textContent = post.content;
    article.appendChild(body);

    article.appendChild(this.#renderReactions(detail.reactions));
    article.appendChild(this.#renderComments(post, detail.comments));

    const form = document.createElement('div');
    form.className = 'row';
    const input = document.createElement('input');
    input.placeholder = 'Viết bình luận...';
    input.maxLength = 5000;
    input.dataset.commentInput = 'true';
    const send = document.createElement('button');
    send.type = 'button';
    send.className = 'btn small';
    send.dataset.action = 'comment';
    send.textContent = 'Gửi';
    form.append(input, send);
    article.appendChild(form);

    return article;
  }

  #renderReactions(reactions) {
    const row = document.createElement('div');
    row.className = 'row';
    const mine = reactions.find((item) => String(item.user_id) === String(this.user.userId));

    for (const type of EnumHelper.values(ReactionTypes)) {
      const count = reactions.filter((item) => item.reaction_type === type).length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = mine?.reaction_type === type ? 'btn small' : 'btn secondary small';
      button.dataset.action = 'react';
      button.dataset.value = type;
      button.textContent = count ? `${EnumHelper.label('ReactionTypes', type)} ${count}` : EnumHelper.label('ReactionTypes', type);
      row.appendChild(button);
    }
    return row;
  }

  #renderComments(post, comments) {
    const box = document.createElement('div');
    if (!comments.length) return box;

    for (const comment of comments) {
      const item = document.createElement('div');
      item.className = 'comment';
      const name = document.createElement('b');
      name.textContent = `${this.#nameOf(comment.user_id)}: `;
      item.appendChild(name);
      item.appendChild(document.createTextNode(comment.content));

      if (String(comment.user_id) === String(this.user.userId)) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn small secondary';
        remove.dataset.action = 'delete-comment';
        remove.dataset.commentId = comment.comment_id;
        remove.textContent = 'Xóa';
        item.appendChild(remove);
      }
      box.appendChild(item);
    }
    return box;
  }

  #nameOf(userId) {
    if (String(userId) === String(this.user.userId)) return 'Bạn';
    return this.userNames.get(String(userId)) || `Thành viên #${userId}`;
  }

  #showError(message, error) {
    message.textContent = this.#errorText(error);
    message.classList.add('error');
  }

  #errorText(error) {
    const fields = error?.data?.fields;
    if (fields && typeof fields === 'object') {
      const first = Object.entries(fields)[0];
      if (first) return `${first[0]}: ${first[1]}`;
    }
    return error?.message ?? 'Đã xảy ra lỗi';
  }

  #updateFamilyInUrl() {
    const url = new URL(globalThis.location.href);
    url.searchParams.set('family_id', this.familyId);
    globalThis.history.replaceState(null, '', url);
  }
}

if (typeof document !== 'undefined') {
  const controller = new CommunityController();
  if (document.body?.dataset.page === 'feed') controller.initFeed();
  EnumBinder.bindAll();
}// Bảng tin, bình luận, thả cảm xúc
