const reportUrl = (process.env.REPORT_URL || 'http://localhost:3007').replace(/\/$/, '');

export function sendAuditEvent({ userId, action, entityType, entityId, familyId }) {
    const body = {
        user_id: userId ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        family_id: familyId ?? null,
    };

    void fetch(`${reportUrl}/internal/audit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`report-service returned HTTP ${response.status}`);
            }
            await response.arrayBuffer();
        })
        .catch((error) => {
            console.error('[genealogy-service] Failed to send audit event:', error);
        });
}
