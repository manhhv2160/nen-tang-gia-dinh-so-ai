BEGIN;

CREATE TEMP TABLE genealogy_sample_config (
    admin_user_id BIGINT NOT NULL
);

INSERT INTO genealogy_sample_config (admin_user_id)
VALUES (:'sample_user_id'::BIGINT);

DO $$
DECLARE
    v_admin_user_id BIGINT;
    v_family_id BIGINT;
BEGIN
    SELECT admin_user_id INTO v_admin_user_id FROM genealogy_sample_config;

    SELECT family_id INTO v_family_id
    FROM family
    WHERE user_id = v_admin_user_id
      AND family_name = 'Gia đình mẫu Nguyễn'
    ORDER BY family_id
    LIMIT 1;

    IF v_family_id IS NULL THEN
        INSERT INTO family (user_id, family_name, description, origin_place)
        VALUES (
            v_admin_user_id,
            'Gia đình mẫu Nguyễn',
            'Dữ liệu mẫu để kiểm thử genealogy-service.',
            'Làng cổ Đường Lâm, Sơn Tây, Hà Nội'
        )
        RETURNING family_id INTO v_family_id;
    END IF;

    INSERT INTO branch (family_id, branch_name, description)
    VALUES
        (v_family_id, 'Chi họ miền Bắc', 'Nhánh gốc tại miền Bắc.'),
        (v_family_id, 'Chi họ miền Trung', 'Nhánh gia đình tại miền Trung.'),
        (v_family_id, 'Chi họ miền Nam', 'Nhánh gia đình tại miền Nam.')
    ON CONFLICT (family_id, branch_name) DO NOTHING;

    INSERT INTO member (
        family_id, branch_id, full_name, gender, date_of_birth, date_of_death,
        generation, occupation, education, address, bio, is_verified
    )
    SELECT
        v_family_id,
        b.branch_id,
        sample.full_name,
        sample.gender,
        sample.date_of_birth,
        sample.date_of_death,
        sample.generation,
        sample.occupation,
        sample.education,
        sample.address,
        sample.bio,
        sample.is_verified
    FROM (VALUES
        ('Nguyễn Văn Hùng', 'Chi họ miền Bắc', 'MALE',   DATE '1940-03-12', DATE '2015-08-20', 1, 'Nông nghiệp', 'Trung học', 'Sơn Tây, Hà Nội', 'Trưởng tộc đời thứ nhất trong dữ liệu mẫu.', TRUE),
        ('Trần Thị Lan',    'Chi họ miền Bắc', 'FEMALE', DATE '1944-11-05', DATE '2022-01-16', 1, 'May mặc',     'Trung học', 'Sơn Tây, Hà Nội', 'Vợ của ông Hùng.', TRUE),
        ('Nguyễn Văn Nam',  'Chi họ miền Trung','MALE',   DATE '1942-06-22', DATE '2018-04-03', 1, 'Giáo viên',   'Đại học',   'Huế',             'Trưởng nhánh miền Trung.', TRUE),
        ('Phạm Thị Hoa',    'Chi họ miền Trung','FEMALE', DATE '1945-09-10', NULL,             1, 'Nội trợ',     'Trung học', 'Huế',             'Vợ của ông Nam.', TRUE),
        ('Nguyễn Văn Minh', 'Chi họ miền Bắc', 'MALE',   DATE '1965-02-18', NULL,             2, 'Kỹ sư',       'Đại học',   'Hà Nội',          'Con trai ông Hùng và bà Lan.', TRUE),
        ('Lê Thị Mai',      'Chi họ miền Bắc', 'FEMALE', DATE '1968-07-14', NULL,             2, 'Bác sĩ',      'Đại học',   'Hà Nội',          'Vợ của ông Minh.', TRUE),
        ('Nguyễn Thị Hạnh', 'Chi họ miền Trung','FEMALE', DATE '1968-12-01', NULL,             2, 'Kế toán',     'Đại học',   'Đà Nẵng',         'Con gái ông Nam và bà Hoa.', TRUE),
        ('Trần Văn Đức',    'Chi họ miền Trung','MALE',   DATE '1965-05-30', NULL,             2, 'Kiến trúc sư','Đại học',   'Đà Nẵng',         'Chồng của bà Hạnh.', FALSE),
        ('Nguyễn Văn Bình', 'Chi họ miền Nam', 'MALE',   DATE '1970-01-25', NULL,             2, 'Doanh nhân',  'Đại học',   'TP. Hồ Chí Minh', 'Con trai thứ hai của ông Hùng và bà Lan.', TRUE),
        ('Vũ Thị Thu',      'Chi họ miền Nam', 'FEMALE', DATE '1972-04-08', NULL,             2, 'Thiết kế',    'Đại học',   'TP. Hồ Chí Minh', 'Vợ cũ của ông Bình.', FALSE),
        ('Nguyễn Minh An',  'Chi họ miền Bắc', 'MALE',   DATE '1992-10-11', NULL,             3, 'Lập trình viên','Đại học', 'Hà Nội',          'Con của ông Minh và bà Mai.', TRUE),
        ('Nguyễn Minh Vy',  'Chi họ miền Bắc', 'FEMALE', DATE '1995-03-27', NULL,             3, 'Thiết kế đồ họa','Đại học','Hà Nội',          'Con của ông Minh và bà Mai.', FALSE),
        ('Trần Đức Long',   'Chi họ miền Trung','MALE',   DATE '1994-06-19', NULL,             3, 'Giáo viên',   'Đại học',   'Đà Nẵng',         'Con của bà Hạnh và ông Đức.', TRUE),
        ('Trần Đức Linh',   'Chi họ miền Trung','FEMALE', DATE '1998-02-09', NULL,             3, 'Sinh viên',   'Đại học',   'Đà Nẵng',         'Con của bà Hạnh và ông Đức.', FALSE),
        ('Nguyễn Bình Khoa','Chi họ miền Nam', 'MALE',   DATE '1997-08-16', NULL,             3, 'Nhiếp ảnh gia','Cao đẳng','TP. Hồ Chí Minh', 'Con của ông Bình và bà Thu.', FALSE)
    ) AS sample(
        full_name, branch_name, gender, date_of_birth, date_of_death,
        generation, occupation, education, address, bio, is_verified
    )
    JOIN branch b
      ON b.family_id = v_family_id
     AND b.branch_name = sample.branch_name
    WHERE NOT EXISTS (
        SELECT 1
        FROM member existing
        WHERE existing.family_id = v_family_id
          AND existing.full_name = sample.full_name
    );

    INSERT INTO parent_child_relationship (parent_member_id, child_member_id, relationship_type)
    SELECT parent.member_id, child.member_id, relation.relationship_type
    FROM (VALUES
        ('Nguyễn Văn Hùng', 'Nguyễn Văn Minh', 'BIOLOGICAL'),
        ('Trần Thị Lan', 'Nguyễn Văn Minh', 'BIOLOGICAL'),
        ('Nguyễn Văn Hùng', 'Nguyễn Văn Bình', 'BIOLOGICAL'),
        ('Trần Thị Lan', 'Nguyễn Văn Bình', 'BIOLOGICAL'),
        ('Nguyễn Văn Nam', 'Nguyễn Thị Hạnh', 'BIOLOGICAL'),
        ('Phạm Thị Hoa', 'Nguyễn Thị Hạnh', 'BIOLOGICAL'),
        ('Nguyễn Văn Minh', 'Nguyễn Minh An', 'BIOLOGICAL'),
        ('Lê Thị Mai', 'Nguyễn Minh An', 'BIOLOGICAL'),
        ('Nguyễn Văn Minh', 'Nguyễn Minh Vy', 'BIOLOGICAL'),
        ('Lê Thị Mai', 'Nguyễn Minh Vy', 'BIOLOGICAL'),
        ('Nguyễn Thị Hạnh', 'Trần Đức Long', 'BIOLOGICAL'),
        ('Trần Văn Đức', 'Trần Đức Long', 'BIOLOGICAL'),
        ('Nguyễn Thị Hạnh', 'Trần Đức Linh', 'BIOLOGICAL'),
        ('Trần Văn Đức', 'Trần Đức Linh', 'BIOLOGICAL'),
        ('Nguyễn Văn Bình', 'Nguyễn Bình Khoa', 'BIOLOGICAL'),
        ('Vũ Thị Thu', 'Nguyễn Bình Khoa', 'ADOPTED')
    ) AS relation(parent_name, child_name, relationship_type)
    JOIN member parent
      ON parent.family_id = v_family_id
     AND parent.full_name = relation.parent_name
    JOIN member child
      ON child.family_id = v_family_id
     AND child.full_name = relation.child_name
    ON CONFLICT (parent_member_id, child_member_id) DO NOTHING;

    INSERT INTO marriage (
        spouse_1_member_id, spouse_2_member_id, marriage_date, status
    )
    SELECT spouse_1.member_id, spouse_2.member_id, sample.marriage_date, sample.status
    FROM (VALUES
        ('Nguyễn Văn Hùng', 'Trần Thị Lan', DATE '1962-02-14', 'WIDOWED'),
        ('Nguyễn Văn Nam', 'Phạm Thị Hoa', DATE '1964-05-20', 'MARRIED'),
        ('Nguyễn Văn Minh', 'Lê Thị Mai', DATE '1990-11-25', 'MARRIED'),
        ('Nguyễn Thị Hạnh', 'Trần Văn Đức', DATE '1991-04-12', 'MARRIED'),
        ('Nguyễn Văn Bình', 'Vũ Thị Thu', DATE '1994-09-03', 'DIVORCED')
    ) AS sample(spouse_1_name, spouse_2_name, marriage_date, status)
    JOIN member spouse_1
      ON spouse_1.family_id = v_family_id
     AND spouse_1.full_name = sample.spouse_1_name
    JOIN member spouse_2
      ON spouse_2.family_id = v_family_id
     AND spouse_2.full_name = sample.spouse_2_name
    WHERE NOT EXISTS (
        SELECT 1
        FROM marriage existing
        WHERE (existing.spouse_1_member_id = spouse_1.member_id
               AND existing.spouse_2_member_id = spouse_2.member_id)
           OR (existing.spouse_1_member_id = spouse_2.member_id
               AND existing.spouse_2_member_id = spouse_1.member_id)
    );
END
$$;

COMMIT;
