-- Schema của report-service (database report_db). Bảng: audit_log.
-- Khi viết: bắt đầu bằng \connect report_db report_svc ; ID dùng BIGINT, không có khóa ngoại sang bảng của service khác.
\connect report_db report_svc

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id    BIGSERIAL PRIMARY KEY,
    user_id     BIGINT,                          
    action      VARCHAR(100) NOT NULL,          
    entity_type VARCHAR(50)  NOT NULL,         
    entity_id   BIGINT,
    family_id   BIGINT,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log (action);
