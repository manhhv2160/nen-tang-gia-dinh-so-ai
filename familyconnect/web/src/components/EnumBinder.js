import { Enums, EnumHelper } from '../constants/Enums.js';

/**
 * Điền giá trị enum vào HTML từ Enums.js, để sửa Enums.js một chỗ là mọi trang đổi theo.
 * Trang phải nạp bằng: <script type="module" src="src/components/EnumBinder.js"></script>
 *
 * Bốn cách đánh dấu trong HTML:
 *   <select data-enum="Gender"></select>                      điền <option> (value = giá trị enum, chữ = nhãn tiếng Việt)
 *       data-enum-selected="GENERAL"    chọn sẵn một giá trị
 *       data-enum-exclude="SYSTEM_ADMIN" bỏ bớt giá trị (cách nhau bằng dấu phẩy)
 *       data-enum-all="Tất cả"          thêm lựa chọn đầu tiên có value rỗng
 *   <div data-enum-buttons="RsvpStatus"></div>                 tạo một nút cho mỗi giá trị (button có data-value)
 *       data-enum-class="btn small"     đổi class của nút (mặc định "btn secondary small")
 *   <p data-enum-pills="HeritageTypes"></p>                    tạo bộ lọc dạng pill, có pill "Tất cả" đứng đầu
 *   <span data-enum-label="Gender">MALE</span>                 đổi giá trị enum có sẵn trong thẻ thành nhãn tiếng Việt
 *
 * Nội dung được tạo bằng DOM (textContent), không dùng innerHTML.
 * Khi controller vẽ thêm nội dung mới, gọi lại EnumBinder.bindAll(container).
 */
export class EnumBinder {
  static bindAll(root = document) {
    EnumBinder.bindSelects(root);
    EnumBinder.bindButtons(root);
    EnumBinder.bindPills(root);
    EnumBinder.bindLabels(root);
  }

  static bindSelects(root = document) {
    for (const select of root.querySelectorAll('select[data-enum]')) {
      const options = EnumBinder.#options(select, 'data-enum');
      if (!options) continue;
      select.replaceChildren();
      const allLabel = select.getAttribute('data-enum-all');
      if (allLabel !== null) select.appendChild(EnumBinder.#option('', allLabel));
      for (const { value, label } of options) select.appendChild(EnumBinder.#option(value, label));
      const selected = select.getAttribute('data-enum-selected');
      if (selected) select.value = selected;
    }
  }

  static bindButtons(root = document) {
    for (const box of root.querySelectorAll('[data-enum-buttons]')) {
      const options = EnumBinder.#options(box, 'data-enum-buttons');
      if (!options) continue;
      const className = box.getAttribute('data-enum-class') ?? 'btn secondary small';
      box.replaceChildren();
      for (const { value, label } of options) {
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.setAttribute('data-value', value);
        button.className = className;
        button.textContent = label;
        box.appendChild(button);
      }
    }
  }

  static bindPills(root = document) {
    for (const box of root.querySelectorAll('[data-enum-pills]')) {
      const options = EnumBinder.#options(box, 'data-enum-pills');
      if (!options) continue;
      const allLabel = box.getAttribute('data-enum-all') ?? 'Tất cả';
      box.replaceChildren();
      [{ value: '', label: allLabel }, ...options].forEach(({ value, label }, index) => {
        const pill = document.createElement('a');
        pill.setAttribute('href', '#');
        pill.setAttribute('data-value', value);
        pill.className = index === 0 ? 'pill active' : 'pill';
        pill.textContent = label;
        box.appendChild(pill);
      });
    }
  }

  static bindLabels(root = document) {
    for (const el of root.querySelectorAll('[data-enum-label]')) {
      const group = el.getAttribute('data-enum-label');
      if (!Enums[group]) {
        console.error(`[EnumBinder] Unknown enum group: ${group}`, el);
        continue;
      }
      // Lưu giá trị gốc vào data-value để gọi lại nhiều lần vẫn đúng.
      const value = el.getAttribute('data-value') ?? el.textContent.trim();
      el.setAttribute('data-value', value);
      el.textContent = EnumHelper.label(group, value);
    }
  }

  static #options(el, attr) {
    const exclude = (el.getAttribute('data-enum-exclude') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    try {
      return EnumHelper.options(el.getAttribute(attr)).filter((o) => !exclude.includes(o.value));
    } catch (error) {
      console.error(`[EnumBinder] ${error.message}`, el);
      return null;
    }
  }

  static #option(value, label) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }
}

if (typeof document !== 'undefined') EnumBinder.bindAll();
