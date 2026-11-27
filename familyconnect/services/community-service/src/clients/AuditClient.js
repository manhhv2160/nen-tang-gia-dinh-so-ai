// Gửi sự kiện nhật ký sang report-service (POST /internal/audit) sau mỗi thao tác ghi — FMLCN-48.
// Quy tắc: không chờ phản hồi (không await), lỗi chỉ ghi log và không làm hỏng thao tác chính,
// và chỉ gửi các trường của docs/api-contract.md mục 6 (không gửi nội dung bài viết, mật khẩu, token).
import config from '../config/index.js';

/** ID là BIGINT nên gửi dạng chuỗi; rỗng thì gửi null theo đúng hợp đồng. */
function toId(value) {
    return value === undefined || value === null || value === '' ? null : String(value);
}

export function sendAuditEvent({ userId, action, entityType, entityId, familyId }) {
    if (!action || !entityType) {
        console.error('[community-service] Bỏ qua sự kiện nhật ký thiếu action hoặc entity_type');
        return;
    }

    const body = {
        user_id: toId(userId),
        action,
        entity_type: entityType,
        entity_id: toId(entityId),
        family_id: toId(familyId),
    };

    void fetch(`${config.reportUrl}/internal/audit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`report-service trả HTTP ${response.status}`);
            }
            await response.arrayBuffer();
        })
        .catch((error) => {
            console.error('[community-service] Không gửi được nhật ký:', error.message);
        });
}
