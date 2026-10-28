-- CHỈ DÙNG KHI PHÁT TRIỂN: mật khẩu cố định. Khi triển khai thật phải đổi.
-- Mỗi service có một user và một database riêng, không user nào truy cập được database của service khác.
CREATE USER auth_svc WITH PASSWORD 'auth_dev_pw';
CREATE DATABASE auth_db OWNER auth_svc;
CREATE USER genealogy_svc WITH PASSWORD 'genealogy_dev_pw';
CREATE DATABASE genealogy_db OWNER genealogy_svc;
CREATE USER community_svc WITH PASSWORD 'community_dev_pw';
CREATE DATABASE community_db OWNER community_svc;
CREATE USER event_svc WITH PASSWORD 'event_dev_pw';
CREATE DATABASE event_db OWNER event_svc;
CREATE USER heritage_svc WITH PASSWORD 'heritage_dev_pw';
CREATE DATABASE heritage_db OWNER heritage_svc;
CREATE USER report_svc WITH PASSWORD 'report_dev_pw';
CREATE DATABASE report_db OWNER report_svc;
