--
-- PostgreSQL database dump
--

\restrict jcM89NuMEDDi7XPGGqnHwhTjZhfRI2qTineQqiZ6QkSiXa133LickM2uYNMRWJy

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: ai_approval_requests; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ai_jobs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ai_safe_actions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.ai_safe_actions (name, description, param_schema, required_role, requires_approval, rate_per_minute, enabled, created_at) VALUES ('fetch_public_job', 'Fetch a public explore_jobs row by id', '{"type": "object", "required": ["jobId"], "properties": {"jobId": {"type": "string", "format": "uuid"}}}', NULL, false, 60, true, '2026-07-01 15:40:25.767635+00') ON CONFLICT DO NOTHING;
INSERT INTO public.ai_safe_actions (name, description, param_schema, required_role, requires_approval, rate_per_minute, enabled, created_at) VALUES ('fetch_benchmark_task_public', 'Fetch public benchmark task metadata', '{"type": "object", "required": ["taskId"], "properties": {"taskId": {"type": "string", "format": "uuid"}}}', NULL, false, 60, true, '2026-07-01 15:40:25.767635+00') ON CONFLICT DO NOTHING;
INSERT INTO public.ai_safe_actions (name, description, param_schema, required_role, requires_approval, rate_per_minute, enabled, created_at) VALUES ('record_interview_turn', 'Append a single interview turn to caller job', '{"type": "object", "required": ["jobId", "text"], "properties": {"text": {"type": "string", "maxLength": 8000}, "jobId": {"type": "string", "format": "uuid"}}}', NULL, false, 30, true, '2026-07-01 15:40:25.767635+00') ON CONFLICT DO NOTHING;
INSERT INTO public.ai_safe_actions (name, description, param_schema, required_role, requires_approval, rate_per_minute, enabled, created_at) VALUES ('flag_content_for_review', 'Flag content for human moderator review', '{"type": "object", "required": ["reason"], "properties": {"reason": {"type": "string", "maxLength": 500}, "payload": {"type": "object"}}}', NULL, true, 10, true, '2026-07-01 15:40:25.767635+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: ai_security_audit; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: ai_usage_quota; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: explore_jobs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.explore_jobs (id, source_requirement_id, title, short_description, description, skills, experience, budget, job_type, location, company_name, show_company, show_salary, urgency, tags, compliance_info, internal_notes, visibility, geo_targeting, skill_targeting, featured, status, slug, meta_title, meta_description, allow_direct_apply, auto_match_only, application_limit, expiry_date, views_count, clicks_count, applications_count, created_by, created_at, updated_at) VALUES ('31c8501c-97fc-4d3d-a93e-e277553f127b', NULL, 'Generalist Expert', 'Evaluate AI-generated responses and provide structured written feedback.', 'In this role, you will evaluate AI-generated responses and provide structured written feedback. This is a great opportunity for sharp, analytical thinkers to contribute to high-impact AI research projects.

Basic Qualifications
• Bachelor''s degree from a top-500 globally ranked university preferred
• Strong analytical and written communication skills
• Ability to work independently and follow detailed task guidelines

Required Skills
• Strong critical reading skills with the ability to identify nuance, implicit meaning, and gaps in reasoning
• Ability to write clear, precise, and well-evidenced written rationales that go beyond surface-level observations
• Consistent and honest judgment, including the ability to give critical assessments when warranted
• Strict attention to detail and accurate application of structured evaluation guidelines
• Ability to work entirely without AI writing tools

Eligibility
• Native English fluency required

We consider all qualified applicants without regard to legally protected characteristics and provide reasonable accommodations upon request.

Contract and Payment Terms
• You will be engaged as an independent contractor.
• This is a fully remote role that can be completed on your own schedule.
• Projects can be extended, shortened, or concluded early depending on needs and performance.
• Payments are weekly on Stripe or Wise based on services rendered.', '{"Analytical Thinking",Writing,English}', 'Entry level', '$70 / hour', 'Hourly Contract', 'Remote', 'Techvinex', true, true, 'normal', '{"New opportunity"}', '{}', NULL, 'public', '{}', '{}', true, 'published', 'generalist-expert', NULL, NULL, true, false, NULL, NULL, 0, 0, 0, NULL, '2026-06-07 08:52:30.396044+00', '2026-06-07 08:52:30.396044+00') ON CONFLICT DO NOTHING;
INSERT INTO public.explore_jobs (id, source_requirement_id, title, short_description, description, skills, experience, budget, job_type, location, company_name, show_company, show_salary, urgency, tags, compliance_info, internal_notes, visibility, geo_targeting, skill_targeting, featured, status, slug, meta_title, meta_description, allow_direct_apply, auto_match_only, application_limit, expiry_date, views_count, clicks_count, applications_count, created_by, created_at, updated_at) VALUES ('d8719276-0982-43be-9e47-ac4ca02349fe', NULL, 'Generalist - English & Urdu', 'Bilingual AI training role for English & Urdu speakers.', 'Evaluate and rate AI responses in English and Urdu. Help train next-generation language models.', '{English,Urdu,Writing}', 'Entry level', '$15 - $20 / hour', 'Hourly Contract', 'Remote', 'Techvinex', true, true, 'normal', '{"New opportunity"}', '{}', NULL, 'public', '{}', '{}', false, 'published', 'generalist-english-urdu', NULL, NULL, true, false, NULL, NULL, 0, 0, 0, NULL, '2026-06-07 08:52:30.396044+00', '2026-06-07 08:52:30.396044+00') ON CONFLICT DO NOTHING;
INSERT INTO public.explore_jobs (id, source_requirement_id, title, short_description, description, skills, experience, budget, job_type, location, company_name, show_company, show_salary, urgency, tags, compliance_info, internal_notes, visibility, geo_targeting, skill_targeting, featured, status, slug, meta_title, meta_description, allow_direct_apply, auto_match_only, application_limit, expiry_date, views_count, clicks_count, applications_count, created_by, created_at, updated_at) VALUES ('e1a04aa4-990d-46d8-9cf9-3c03f89e0810', NULL, 'Data Analyst', 'Analyze datasets to inform AI training pipelines.', 'Work with structured and unstructured datasets to surface insights for AI model training.', '{SQL,Python,Statistics}', '2+ years', '$35 / hour', 'Hourly Contract', 'Remote', 'Techvinex', true, true, 'normal', '{"New opportunity"}', '{}', NULL, 'public', '{}', '{}', false, 'published', 'data-analyst', NULL, NULL, true, false, NULL, NULL, 0, 0, 0, NULL, '2026-06-07 08:52:30.396044+00', '2026-06-07 08:52:30.396044+00') ON CONFLICT DO NOTHING;
INSERT INTO public.explore_jobs (id, source_requirement_id, title, short_description, description, skills, experience, budget, job_type, location, company_name, show_company, show_salary, urgency, tags, compliance_info, internal_notes, visibility, geo_targeting, skill_targeting, featured, status, slug, meta_title, meta_description, allow_direct_apply, auto_match_only, application_limit, expiry_date, views_count, clicks_count, applications_count, created_by, created_at, updated_at) VALUES ('b0601301-aae2-4355-833e-9bedb81b3d3e', NULL, 'ML Engineer', 'Build and evaluate machine learning models.', 'Design experiments, fine-tune models, and contribute to research-grade ML work.', '{Python,PyTorch,ML}', '3+ years', '$80 / hour', 'Hourly Contract', 'Remote', 'Techvinex', true, true, 'normal', '{"New opportunity"}', '{}', NULL, 'public', '{}', '{}', true, 'published', 'ml-engineer', NULL, NULL, true, false, NULL, NULL, 0, 0, 0, NULL, '2026-06-07 08:52:30.396044+00', '2026-06-07 08:52:30.396044+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: applicants; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.applicants (id, user_id, job_id, full_name, email, linkedin_url, no_linkedin, email_verified, created_at, updated_at) VALUES ('81298ed0-7259-48f0-a4ba-bdb9e73acae9', NULL, 'b0601301-aae2-4355-833e-9bedb81b3d3e', 'Alekgendra', 'hirasahani842@gmail.com', NULL, true, false, '2026-06-09 06:22:53.270358+00', '2026-06-09 06:22:53.270358+00') ON CONFLICT DO NOTHING;
INSERT INTO public.applicants (id, user_id, job_id, full_name, email, linkedin_url, no_linkedin, email_verified, created_at, updated_at) VALUES ('947ede7a-5ea3-402d-aafb-e2473a70aa25', NULL, '31c8501c-97fc-4d3d-a93e-e277553f127b', 'Vvv', 'hhh@gmail.com', 'https://www.linkedin.com/in/hira-sahani-9b1374247?utm_source=share_via&utm_content=profile&utm_medium=member_android', false, false, '2026-07-09 13:22:07.565917+00', '2026-07-09 13:22:07.565917+00') ON CONFLICT DO NOTHING;
INSERT INTO public.applicants (id, user_id, job_id, full_name, email, linkedin_url, no_linkedin, email_verified, created_at, updated_at) VALUES ('0297e122-713c-41a7-98be-2665a4da544b', NULL, '31c8501c-97fc-4d3d-a93e-e277553f127b', 'Vvv', 'hiralalsahani841@gmail.com', 'https://www.linkedin.com/in/hira-sahani-9b1374247?utm_source=share_via&utm_content=profile&utm_medium=member_android', false, false, '2026-07-09 13:22:48.23411+00', '2026-07-09 13:22:48.23411+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('64898bd1-fc7d-4d85-bd19-9dd5f58c1b67', NULL, 'deny:method', 'edge_function', '/ai-interview', '{"ip": "34.7.47.250", "reason": "GET"}', '2026-05-09 20:26:00.096877+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('234fa119-ab0f-46bc-83f8-eea919e19a73', NULL, 'deny:auth', 'edge_function', '/ai-interview', '{"ip": "34.7.47.250", "reason": "missing_bearer"}', '2026-05-09 20:26:03.821925+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('4c33b575-3665-4cd5-af45-2ee03d57dc95', NULL, 'deny:auth', 'edge_function', '/ai-interview', '{"ip": "34.7.47.250", "reason": "missing_bearer"}', '2026-05-09 20:26:06.665996+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('c49e06e3-b59d-4848-898d-1b002909ac62', NULL, 'deny:origin', 'edge_function', '/ai-interview', '{"ip": "34.7.47.250", "reason": "https://evil.example.com"}', '2026-05-09 20:26:18.645966+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('4523498e-2a3a-4040-895b-e9cda601bb16', NULL, 'deny:method', 'edge_function', '/webhook-receiver', '{"ip": "103.196.9.118", "reason": "GET"}', '2026-06-07 13:17:26.331733+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('e3273c3e-a28b-4121-9b2e-dfb12cfad5c8', NULL, 'deny:method', 'edge_function', '/ai-interview', '{"ip": "103.196.9.118", "reason": "GET"}', '2026-06-07 13:17:26.665611+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('e734cdd8-7eff-4c81-a033-2614bd53de56', NULL, 'deny:method', 'edge_function', '/elevenlabs-tts', '{"ip": "103.196.9.118", "reason": "GET"}', '2026-06-07 13:17:26.864113+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('3e8cac4e-18dc-474f-90d6-d39915c9439e', NULL, 'deny:auth', 'edge_function', '/scan-upload', '{"ip": "3.2.59.178", "reason": "missing_bearer"}', '2026-07-07 05:14:48.563561+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('b2b74258-fe1e-46ed-8be1-175268e4b3eb', NULL, 'deny:auth', 'edge_function', '/scan-upload', '{"ip": "3.2.59.182", "reason": "missing_bearer"}', '2026-07-07 05:14:58.045951+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('b8a7d48a-b582-41ed-ba28-730d9ff9a4e6', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "ac7b58c28cea72827b65fdf4", "ip": "3.2.59.182", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 05:38:50.948064+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('d9b36cab-3a40-4f56-87cc-c024737ad893', NULL, 'deny:auth', 'edge_function', '/scan-upload', '{"ip": "3.2.59.182", "reason": "missing_bearer"}', '2026-07-07 05:43:11.689877+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('df32b9bb-d943-447a-8ecd-01458a142e5c', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "f0280263736ddccce401559e", "ip": "3.2.59.202", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 05:43:21.194106+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('1a8ed8bb-815d-4aa5-b8e7-34cf19cd9ae9', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "b054a606f20b318e4e8d81d9", "ip": "3.2.59.179", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 05:44:15.976238+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('b7570628-69b9-4a5a-9063-2c3dd220e3d3', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "b054a606f20b318e4e8d81d9", "ip": "3.2.59.179", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 05:45:06.038911+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('44a51bb4-873c-4412-ac67-7290e40b2033', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "f0280263736ddccce401559e", "ip": "3.2.59.202", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 05:45:42.777935+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('d63ecd37-0a48-4280-ae48-6a7ebedd276c', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "2d0b86f421ad186a110d5e6b", "ip": "3.2.59.201", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 05:46:30.610196+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('141fc298-725b-4bb3-85bd-2497e23cf4ca', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "2d0b86f421ad186a110d5e6b", "ip": "3.2.59.201", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 05:47:45.515262+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('d302f480-1977-4871-8ddd-d3580667e804', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'admin_verify_ok', 'edge_function', '/verify-admin', '{"fp": "6d51626ba929aabcc606e3f6", "ip": "99.82.160.73", "ua": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36", "roles": ["reviewer", "admin"], "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app"}', '2026-07-07 05:58:24.945216+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('6d9d2a82-52b0-4e94-a730-79390715e682', NULL, 'deny:auth', 'edge_function', '/scan-upload', '{"ip": "3.2.59.200", "reason": "missing_bearer"}', '2026-07-07 06:02:19.482941+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('c029abba-239a-4169-b776-0fb5d98008c7', NULL, 'deny:auth', 'edge_function', '/scan-upload', '{"ip": "3.2.59.180", "reason": "missing_bearer"}', '2026-07-07 06:27:13.40375+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('86121269-620a-4d6a-99a4-4955cdea8e22', 'e58b1dab-7997-46e4-b591-235b869b93a3', 'scan_deny_forbidden', 'edge_function', '/scan-upload', '{"fp": "0225297a0bd98328c2a17f09", "ip": "3.2.59.178", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg"}', '2026-07-07 06:29:38.893044+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('a0842497-c337-404f-85be-e10d4e7fdc27', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_deny_not_found', 'edge_function', '/scan-upload', '{"fp": "f0280263736ddccce401559e", "ip": "3.2.59.202", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "object_path": "a7623d59-b1e0-4a11-9a1e-4a8740fd5.jpg"}', '2026-07-07 07:46:20.026869+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('ecde1fa6-7085-4370-b4d1-0620bbebbdb8', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_persist_failed', 'edge_function', '/scan-upload', '{"fp": "58ff068007b017b894567bdf", "ip": "3.2.59.204", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "verdict": "unknown", "engines_hit": 0, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg", "db_error_code": "23514", "engines_total": 0}', '2026-07-07 07:46:33.770611+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('3012f48c-4d83-47ae-b52e-4a45670113a5', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_persist_failed', 'edge_function', '/scan-upload', '{"fp": "2d0b86f421ad186a110d5e6b", "ip": "3.2.59.201", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "verdict": "unknown", "engines_hit": 0, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg", "db_error_code": "23514", "engines_total": 0}', '2026-07-07 07:46:36.000471+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('1c30fe7e-4553-42c0-834d-a6689c78d29e', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_persist_failed', 'edge_function', '/scan-upload', '{"fp": "2d0b86f421ad186a110d5e6b", "ip": "3.2.59.201", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "verdict": "unknown", "engines_hit": 0, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg", "db_error_code": "23514", "engines_total": 0}', '2026-07-07 07:46:39.550031+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('dfbf02e0-15c6-4cbe-a644-2131e6feac56', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_completed', 'edge_function', '/scan-upload', '{"fp": "58ff068007b017b894567bdf", "ip": "3.2.59.204", "ua": "Go-http-client/2.0", "roles": [], "bucket": "blog-images", "method": "POST", "origin": null, "removed": false, "verdict": "unknown", "engines_hit": 0, "object_path": "a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg", "engines_total": 0}', '2026-07-07 07:47:19.494255+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('64cc626d-34a6-40ad-9afa-a75c5a1ff95b', NULL, 'deny:auth', 'edge_function', '/scan-upload', '{"ip": "3.2.59.177", "reason": "missing_bearer"}', '2026-07-10 05:19:42.39997+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('d7e168c0-0754-4ed4-ab07-d0c20f7c60c1', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'admin_verify_ok', 'edge_function', '/verify-admin', '{"fp": "d3c4e49473339130fbb1d2e7", "ip": "99.82.160.78", "ua": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36", "roles": ["reviewer", "admin"], "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app"}', '2026-07-10 15:42:01.994786+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('4ba7b0d0-4bd9-42d2-a059-5701102f65e0', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_completed', 'edge_function', '/scan-upload', '{"fp": "e4f2f36704acf6a6e2f39d81", "ip": "99.82.160.52", "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36", "roles": [], "bucket": "blog-images", "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app", "removed": false, "verdict": "unknown", "engines_hit": 0, "object_path": "e51dd014-b6ba-4416-910e-edf1080ce4f0.jpg", "engines_total": 0}', '2026-07-10 15:49:30.55627+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('eaca8cd7-2713-4239-aeec-796f311ffeba', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_completed', 'edge_function', '/scan-upload', '{"fp": "8df93f6e7b1a5eebd9097504", "ip": "99.82.160.53", "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36", "roles": [], "bucket": "blog-images", "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app", "removed": false, "verdict": "unknown", "engines_hit": 0, "object_path": "f3b32311-74f9-48b3-ba94-782f41fc79fe.jpg", "engines_total": 0}', '2026-07-10 16:09:11.62884+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('7ed8c8d9-a371-4b24-9bb0-156068c77498', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_completed', 'edge_function', '/scan-upload', '{"fp": "a0e2630f4bfbdfa3913e10df", "ip": "99.82.160.51", "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36", "roles": [], "bucket": "blog-images", "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app", "removed": false, "verdict": "unknown", "engines_hit": 0, "object_path": "0a800f36-1ba3-41cd-8eac-3ef6d37c0e3e.jpg", "engines_total": 0}', '2026-07-10 16:34:27.345085+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('7392d213-1936-4252-bd99-0758b158f2b9', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_completed', 'edge_function', '/scan-upload', '{"fp": "b6bc0b733617fdd1d4bb2422", "ip": "99.82.160.73", "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36", "roles": [], "bucket": "blog-images", "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app", "removed": false, "verdict": "unknown", "engines_hit": 0, "object_path": "2287d21d-8bfe-4153-bcf6-4c3c17c59f77.jpg", "engines_total": 0}', '2026-07-10 16:50:46.456545+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('b4e9959c-85c1-4e92-9c72-22d22a43bd0d', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_completed', 'edge_function', '/scan-upload', '{"fp": "6283c022575b192956cfcae3", "ip": "99.82.160.78", "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36", "roles": [], "bucket": "blog-images", "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app", "removed": false, "verdict": "unknown", "engines_hit": 0, "object_path": "c91d0eb7-ad3d-4e0f-ba1a-ce688acc822c.jpg", "engines_total": 0}', '2026-07-10 16:56:50.365931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('6d3926b4-8cb0-4e1d-84c9-528ed274ad0a', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'scan_completed', 'edge_function', '/scan-upload', '{"fp": "8f0d2e6f58fdbc2ef6a36e1c", "ip": "99.82.160.76", "ua": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36", "roles": [], "bucket": "blog-images", "method": "POST", "origin": "https://id-preview--5c870c01-d303-4b5b-b158-8aff44bf54eb.lovable.app", "removed": false, "verdict": "unknown", "engines_hit": 0, "object_path": "0dfff600-83bc-49f2-8f06-80149ad32ee0.jpg", "engines_total": 0}', '2026-07-10 18:57:55.950296+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('e02864b5-e630-4db2-aca1-b2d17b693188', NULL, 'deny:method', 'edge_function', '/webhook-receiver', '{"ip": "3.2.54.116", "reason": "GET"}', '2026-07-13 08:21:33.168582+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('2b62902f-b937-4f2f-b541-829d41b59f31', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'admin_verify_ok', 'edge_function', '/verify-admin', '{"fp": "2dca4c19d28b4d1e32fc2eee", "ip": "3.2.59.200", "ua": "Go-http-client/2.0", "roles": ["reviewer", "admin"], "method": "POST", "origin": null}', '2026-07-13 08:49:23.807149+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('4df55e57-2518-4d01-b2eb-22ef81c72edb', NULL, 'deny:method', 'edge_function', '/webhook-receiver', '{"ip": "3.2.51.16", "reason": "GET"}', '2026-07-13 10:10:20.972593+00') ON CONFLICT DO NOTHING;
INSERT INTO public.audit_logs (id, user_id, action, target_type, target_id, details, created_at) VALUES ('c74bd6d2-f2c8-465f-8fbc-12d57b0a19a3', NULL, 'deny:method', 'edge_function', '/webhook-receiver', '{"ip": "13.248.108.144", "reason": "GET"}', '2026-07-19 04:09:43.002751+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: benchmark_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('4aee297a-bf7e-4493-a276-e0b8e30ca8c7', 'Resume Screening', 'You are given a candidate resume. Evaluate if the candidate is a good fit for a Senior React Developer role requiring 5+ years experience, TypeScript expertise, and team leadership skills. Provide a structured assessment with scores for each requirement.', 'You are an expert technical recruiter with 10 years of experience in tech hiring.', 'hiring', 'medium', '[{"weight": 3, "criterion": "Accuracy of skill assessment"}, {"weight": 2, "criterion": "Completeness of evaluation"}, {"weight": 2, "criterion": "Actionable recommendation"}, {"weight": 1, "criterion": "Bias-free language"}]', 'A structured assessment covering: technical skills match, experience level, leadership indicators, and overall recommendation with justification.', 'text', NULL, 100, true, '{resume,screening,hiring}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('1a7635dc-beed-4872-9bad-6c175ec63db2', 'Interview Question Generation', 'Generate 5 behavioral interview questions for a Product Manager role at a B2B SaaS startup. Questions should assess: strategic thinking, stakeholder management, data-driven decision making, cross-functional collaboration, and prioritization skills.', 'You are a senior hiring manager specializing in product management roles.', 'hiring', 'easy', '[{"weight": 3, "criterion": "Relevance to PM role"}, {"weight": 2, "criterion": "STAR format quality"}, {"weight": 2, "criterion": "Competency coverage"}, {"weight": 1, "criterion": "Follow-up depth"}]', 'Five well-crafted STAR-format behavioral questions, each targeting a specific competency with follow-up probes.', 'text', NULL, 100, true, '{interview,questions,product-manager}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('e24453fd-2e58-484f-9422-67fe3385091e', 'Salary Benchmarking Analysis', 'Analyze the following job description and provide a competitive salary range for the role. Consider location (San Francisco), experience level (7+ years), industry (FinTech), and current market conditions. Job: Staff Backend Engineer, Go/Python, distributed systems, leading a team of 4.', 'You are a compensation analyst with expertise in tech industry salary data.', 'hiring', 'hard', '[{"weight": 3, "criterion": "Market accuracy"}, {"weight": 2, "criterion": "Component breakdown"}, {"weight": 2, "criterion": "Reasoning quality"}, {"weight": 1, "criterion": "Comparable references"}]', 'Detailed salary analysis with base, equity, and total comp ranges, supported by market reasoning and comparable roles.', 'text', NULL, 100, true, '{salary,compensation,benchmarking}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('6e307f37-0a59-4ced-944f-9f8a400f7662', 'Logical Deduction Puzzle', 'Five people (A, B, C, D, E) sit in a row. A is not next to B. C is in the middle. D is next to E. B is at one end. Who is next to C on both sides? List all valid arrangements.', NULL, 'reasoning', 'medium', '[{"weight": 4, "criterion": "Correct answer"}, {"weight": 3, "criterion": "Logical reasoning steps"}, {"weight": 2, "criterion": "Exhaustive enumeration"}, {"weight": 1, "criterion": "Clarity"}]', 'Valid arrangements showing D and either A or E next to C, with clear logical steps.', 'text', NULL, 100, true, '{logic,puzzle,deduction}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('9abeaf6d-fab4-4a1b-8da0-cef35f37a613', 'Causal Reasoning', 'A company launched a new feature and saw a 20% drop in daily active users but a 15% increase in session duration. Revenue per user increased by 30%. Provide 3 plausible explanations for this pattern and suggest what data you would collect to test each hypothesis.', NULL, 'reasoning', 'hard', '[{"weight": 3, "criterion": "Hypothesis plausibility"}, {"weight": 3, "criterion": "Data collection specificity"}, {"weight": 2, "criterion": "Analytical depth"}, {"weight": 1, "criterion": "Business context"}]', 'Three distinct, plausible hypotheses with specific data collection strategies for each.', 'text', NULL, 100, true, '{causal,analysis,business}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('d3ab2d96-b28d-44b3-9180-07ea1b1e931a', 'Ethical Dilemma Analysis', 'A self-driving car must choose between two unavoidable outcomes: swerving left (injuring 1 pedestrian) or continuing straight (injuring 3 passengers). Analyze this from utilitarian, deontological, and virtue ethics perspectives. What should the AI be programmed to do?', NULL, 'reasoning', 'expert', '[{"weight": 3, "criterion": "Framework accuracy"}, {"weight": 3, "criterion": "Nuance and depth"}, {"weight": 2, "criterion": "Balanced perspective"}, {"weight": 1, "criterion": "Practical recommendation"}]', 'Multi-framework ethical analysis with nuanced consideration of each perspective and a reasoned recommendation.', 'text', NULL, 100, true, '{ethics,philosophy,AI}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('22fcfac4-a984-4efd-bbb8-5a9a05f61bcf', 'Algorithm: Two Sum', 'Write a function that takes an array of integers and a target sum. Return the indices of two numbers that add up to the target. Assume exactly one solution exists. Optimize for time complexity.', 'You are a senior software engineer. Provide clean, well-documented code.', 'coding', 'easy', '[{"weight": 4, "criterion": "Correctness"}, {"weight": 3, "criterion": "Time complexity O(n)"}, {"weight": 2, "criterion": "Code clarity"}, {"weight": 1, "criterion": "Edge cases"}]', 'O(n) solution using a hash map, with proper edge case handling and clear comments.', 'text', NULL, 100, true, '{algorithm,hashmap,optimization}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('c5f7e9f0-009d-4112-a6b4-6b409128889f', 'System Design: URL Shortener', 'Design a URL shortening service like bit.ly. Cover: API design, database schema, encoding algorithm, scalability considerations, and how to handle 100M+ URLs. Include trade-offs for each decision.', 'You are a principal engineer conducting a system design review.', 'coding', 'hard', '[{"weight": 3, "criterion": "Architecture completeness"}, {"weight": 3, "criterion": "Scalability strategy"}, {"weight": 2, "criterion": "Trade-off analysis"}, {"weight": 2, "criterion": "Practical considerations"}]', 'Comprehensive system design covering API endpoints, storage strategy, base62 encoding, caching, and horizontal scaling with clear trade-off analysis.', 'text', NULL, 100, true, '{system-design,scalability,architecture}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;
INSERT INTO public.benchmark_tasks (id, title, prompt, system_prompt, category, difficulty, rubric, expected_output, input_type, input_data, max_score, is_active, tags, created_by, created_at, updated_at) VALUES ('3fcd4e4f-96be-4930-ac3c-9d10d302fb7b', 'Debug: Race Condition', 'The following code has a race condition bug. Identify the issue, explain why it occurs, and provide a fixed version:

```javascript
let counter = 0;
async function incrementCounter() {
  const current = counter;
  await someAsyncOperation();
  counter = current + 1;
}
// Called 100 times concurrently
Promise.all(Array(100).fill(null).map(() => incrementCounter()));
```', NULL, 'coding', 'medium', '[{"weight": 3, "criterion": "Bug identification"}, {"weight": 3, "criterion": "Root cause explanation"}, {"weight": 3, "criterion": "Fix correctness"}, {"weight": 1, "criterion": "Code quality"}]', 'Identification of the read-modify-write race condition, explanation of interleaving, and a fix using mutex/lock or atomic operation pattern.', 'text', NULL, 100, true, '{debugging,concurrency,javascript}', NULL, '2026-04-05 02:11:14.076931+00', '2026-04-05 02:11:14.076931+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: benchmark_results; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.benchmark_results (id, task_id, user_id, model, ai_response, score, max_score, latency_ms, attempts, pass_at_1, pass_at_n, status, metadata, created_at, updated_at, task_title, task_category) VALUES ('90e10e06-0b29-41d7-a214-34019dc2fb9b', '4aee297a-bf7e-4493-a276-e0b8e30ca8c7', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'google/gemini-3-flash-preview', 'Please provide the candidate''s resume text or a summary of their experience. 

Once provided, I will evaluate them based on my 10 years of technical recruiting experience using the following **Structured Assessment Matrix**:

---

### **Candidate Evaluation Framework**

#### **1. Experience Duration & Depth**
*   **Requirement:** 5+ years of professional software development.
*   **Assessment:** Does the candidate have "5 years of experience" or "1 year of experience repeated 5 times"? I look for progression from junior to senior responsibilities and stability in roles.
*   **Score:** /10

#### **2. React Ecosystem Mastery**
*   **Requirement:** Senior-level proficiency in React.
*   **Assessment:** I look for evidence of complex state management (Redux, Zustand, Context), performance optimization (memoization, virtualization), custom hooks, and architectural patterns (Atomic design, Feature-sliced design).
*   **Score:** /10

#### **3. TypeScript Expertise**
*   **Requirement:** Deep understanding of Type systems.
*   **Assessment:** I look for more than just basic interfaces. I check for usage of Generics, Utility Types, Discriminated Unions, and experience migrating JS codebases to TS.
*   **Score:** /10

#### **4. Leadership & Mentorship**
*   **Requirement:** Team leadership skills.
*   **Assessment:** I look for "soft" signals in the bullet points: code reviews, mentoring junior devs, leading sprint planning, defining technical roadmaps, or making high-level architectural decisions. 
*   **Score:** /10

#### **5. Technical Ecosystem Fit**
*   **Requirement:** Modern frontend toolchain.
*   **Assessment:** Evaluation of secondary skills (Testing with Jest/Cypress, CI/CD, Next.js, Styling solutions like Tailwind or Styled Components).
*   **Score:** /10

---

### **Executive Summary**
*   **The "Green Flags":** (Specific standout achievements)
*   **The "Red Flags":** (Gaps in knowledge or career trajectory)
*   **Final Recommendation:** (Strong Hire / Soft Hire / Pass)

**Please paste the resume below to begin.**', 70, 100, 4158, '[{"score": 70, "attempt": 1, "response": "Please provide the candidate''s resume text or a summary of their experience. \n\nOnce provided, I will evaluate them based on my 10 years of technical recruiting experience using the following **Structured Assessment Matrix**:\n\n---\n\n### **Candidate Evaluation Framework**\n\n#### **1. Experience Duration & Depth**\n*   **Requirement:** 5+ years of professional software development.\n*   **Assessment:** Does the candidate have \"5 years of experience\" or \"1 year of experience repeated 5 times\"? I look for progression from junior to senior responsibilities and stability in roles.\n*   **Score:** /10\n\n#### **2. React Ecosystem Mastery**\n*   **Requirement:** Senior-level proficiency in React.\n*   **Assessment:** I look for evidence of complex state management (Redux, Zustand, Context), performance optimization (memoization, virtualization), custom hooks, and architectural patterns (Atomic design, Feature-sliced design).\n*   **Score:** /10\n\n#### **3. TypeScript Expertise**\n*   **Requirement:** Deep understanding of Type systems.\n*   **Assessment:** I look for more than just basic interfaces. I check for usage of Generics, Utility Types, Discriminated Unions, and experience migrating JS codebases to TS.\n*   **Score:** /10\n\n#### **4. Leadership & Mentorship**\n*   **Requirement:** Team leadership skills.\n*   **Assessment:** I look for \"soft\" signals in the bullet points: code reviews, mentoring junior devs, leading sprint planning, defining technical roadmaps, or making high-level architectural decisions. \n*   **Score:** /10\n\n#### **5. Technical Ecosystem Fit**\n*   **Requirement:** Modern frontend toolchain.\n*   **Assessment:** Evaluation of secondary skills (Testing with Jest/Cypress, CI/CD, Next.js, Styling solutions like Tailwind or Styled Components).\n*   **Score:** /10\n\n---\n\n### **Executive Summary**\n*   **The \"Green Flags\":** (Specific standout achievements)\n*   **The \"Red Flags\":** (Gaps in knowledge or career trajectory)\n*   **Final Recommendation:** (Strong Hire / Soft Hire / Pass)\n\n**Please paste the resume below to begin.**", "latency_ms": 4158}]', true, true, 'completed', '{"avg_score": 70, "avg_latency": 4158, "total_attempts": 1}', '2026-04-05 02:29:19.825058+00', '2026-04-05 02:29:19.825058+00', 'Resume Screening', 'hiring') ON CONFLICT DO NOTHING;


--
-- Data for Name: benchmark_reviews; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: blogs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('ba2f01b9-12f4-4743-a8f7-05842d157f9f', 'The Future of Remote Work in 2026', 'future-of-remote-work-2026', '<h2>The Rise of Remote Work</h2><p>Remote work has evolved <strong>dramatically</strong> over the past few years. Companies worldwide are embracing <em>flexible work arrangements</em>, leading to increased productivity and employee satisfaction.</p><h3>Key Benefits</h3><ul><li><strong>Increased Productivity</strong> — Studies show remote workers are 13% more productive</li><li><strong>Cost Savings</strong> — Companies save an average of $11,000 per remote worker annually</li><li><strong>Global Talent Access</strong> — Hire the best talent regardless of location</li></ul><blockquote><p>The future of work is not about where you work, but how you work. — Atlas Research Team</p></blockquote><h3>Technology Stack for Remote Teams</h3><p>Modern remote teams rely on a combination of tools:</p><ol><li>Communication platforms like Slack and Teams</li><li>Project management tools like Linear and Notion</li><li>Cloud-based development environments</li></ol><p>Here is an example of a <code>remote config</code> setup:</p><pre><code>const remoteConfig = {
  timezone: "flexible",
  async: true,
  meetings: "minimal"
};</code></pre><hr><p>At <strong>Atlas</strong>, we believe remote work is not just a trend — it is the <u>future of employment</u>. Join us in building a better workplace for everyone.</p>', 'Explore how remote work is transforming industries, teams, and the global workforce in 2026.', NULL, 'research', 'Atlas Team', '6 min read', 'published', '2026-04-05 01:16:04.519349+00', '2026-07-07 05:38:49.779065+00') ON CONFLICT DO NOTHING;
INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('8cd06d75-7fde-452e-ac86-518ec1f6b90c', 'Test', 'test', '<p>Test</p>', 'Test', 'https://xfgyzcvrvgsntjenxecp.supabase.co/storage/v1/object/public/blog-images/a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg', 'company', 'Atlas Team', '5 min read', 'published', '2026-07-07 05:37:40.472231+00', '2026-07-07 05:58:54.891345+00') ON CONFLICT DO NOTHING;
INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('910cee0d-8121-4d67-b390-424b1cd80be9', 'Test 2', 'test-2', 'Hello ', 'Hello ', 'https://xfgyzcvrvgsntjenxecp.supabase.co/storage/v1/object/public/blog-images/e51dd014-b6ba-4416-910e-edf1080ce4f0.jpg', 'company', 'Atlas Team', '5 min read', 'published', '2026-07-10 15:52:40.403411+00', '2026-07-10 15:52:40.403411+00') ON CONFLICT DO NOTHING;
INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('1f2f1bf3-cc17-4b16-98a7-1159f5dbbe5c', 'Heii', 'heiibdbd', 'Ji', 'Oye', 'https://xfgyzcvrvgsntjenxecp.supabase.co/storage/v1/object/public/blog-images/f3b32311-74f9-48b3-ba94-782f41fc79fe.jpg', 'company', 'Atlas Team', '5 min read', 'published', '2026-07-10 16:09:20.369883+00', '2026-07-10 16:09:20.369883+00') ON CONFLICT DO NOTHING;
INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('49d5a1d4-4baa-49a7-838c-99626e1a79e5', 'It''s me', 'it-s-me', 'Heloi', 'Hie', 'https://xfgyzcvrvgsntjenxecp.supabase.co/storage/v1/object/public/blog-images/0a800f36-1ba3-41cd-8eac-3ef6d37c0e3e.jpg', 'company', 'Atlas Team', '5 min read', 'published', '2026-07-10 16:34:37.056406+00', '2026-07-10 16:34:37.056406+00') ON CONFLICT DO NOTHING;
INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('7764fbf3-618a-4993-b452-63219c3464e7', 'Nothing', 'nothing', 'Nothing', 'Nothing', 'https://xfgyzcvrvgsntjenxecp.supabase.co/storage/v1/object/public/blog-images/0dfff600-83bc-49f2-8f06-80149ad32ee0.jpg', 'company', 'Atlas Team', '5 min read', 'published', '2026-07-10 18:58:08.791842+00', '2026-07-10 18:58:08.791842+00') ON CONFLICT DO NOTHING;
INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('5fd6c27c-9ab6-42af-ab56-e915062638e9', 'Hishd', 'hishd', 'Fb', 'Brbh', 'https://xfgyzcvrvgsntjenxecp.supabase.co/storage/v1/object/public/blog-images/2287d21d-8bfe-4153-bcf6-4c3c17c59f77.jpg', 'company', 'Atlas Team', '5 min read', 'draft', '2026-07-10 16:50:54.11819+00', '2026-07-10 18:59:07.922068+00') ON CONFLICT DO NOTHING;
INSERT INTO public.blogs (id, title, slug, content, short_description, image_url, category, author, read_time, status, created_at, updated_at) VALUES ('24c57d19-2956-46cb-84c2-4597aa177f31', 'Atlas Launch: Building the Future of Work', 'atlas-launch-future-of-work', '<h2>Welcome to Atlas</h2><p>Atlas is building the future of work by connecting top talent with global opportunities. Our AI-powered platform ensures the perfect match between candidates and companies.</p><p>Stay tuned for more updates!</p>', 'Discover how Atlas is revolutionizing the future of work with AI-powered talent matching.', '', 'company', 'Atlas Team', '5 min read', 'published', '2026-04-04 01:50:48.574514+00', '2026-07-13 07:21:56.883615+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: employer_billing; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: employer_candidates; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: employer_interviews; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: employer_jobs; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: job_analytics; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: job_applications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: job_bookmarks; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: offers; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: payout_accounts; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: payout_history; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_stats; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.platform_stats (id, stat_key, stat_value, updated_at) VALUES ('13fe2620-c38b-4064-bf44-6b62929bbcf0', 'total_candidates', '0', '2026-03-30 12:12:37.633052+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_stats (id, stat_key, stat_value, updated_at) VALUES ('9bfb809d-7e94-4cb5-a975-56bb588b49a5', 'roles_created', '0', '2026-03-30 12:12:37.633052+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_stats (id, stat_key, stat_value, updated_at) VALUES ('457fae84-997d-47e6-8b09-4f6064de4a16', 'daily_payouts', '0', '2026-03-30 12:12:37.633052+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_stats (id, stat_key, stat_value, updated_at) VALUES ('4b1d9d61-175f-4da8-ae60-6eef2164f9e8', 'active_contracts', '0', '2026-03-30 12:12:37.633052+00') ON CONFLICT DO NOTHING;
INSERT INTO public.platform_stats (id, stat_key, stat_value, updated_at) VALUES ('dbd75ca3-5b7e-42e5-9999-4c332654aa9c', 'health_check_ping', '2026-06-07 11:39:21', '2026-06-07 11:39:21.727286+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('b77f1845-a147-482c-a5e8-c262469ac688', 'e58b1dab-7997-46e4-b591-235b869b93a3', 'User User', 'candidate@jetra.app', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-04-02 01:30:26.004263+00', '2026-04-02 01:30:26.004263+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('98a7bb59-73fd-4adc-a296-9512bf7a1953', '0582d8d5-23a8-4dde-bb42-63084344397d', 'Employer User', 'employer@jetra.app', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-04-02 01:30:27.06843+00', '2026-04-02 01:30:27.06843+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('7745c36b-1b65-49e2-acd9-b0770337aef9', 'df49dae2-3410-47d3-a755-d3fa274cc108', 'Admin User', 'admin@jetra.app', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-04-02 01:30:27.809595+00', '2026-04-02 01:30:27.809595+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('7506df41-e31d-4e79-872c-c6661042e178', 'c5ae29ab-0fba-4174-9ef5-de087883f488', 'Alek', 'hirasahani842@gmail.com', '', NULL, '', false, '', false, '', '{}', '', '', '', '', 'India', '', '', '', false, false, '[{"gpa": "", "major": "", "degree": "", "school": "", "endYear": "", "startYear": ""}]', '[{"city": "", "role": "", "company": "", "country": "", "endYear": "", "startYear": "", "description": ""}]', '', false, false, '2026-06-09 06:25:11.10007+00', '2026-06-09 06:25:11.10007+00', false, false, '', '2026-06-09') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('c811f227-455b-41c5-bf1b-aacfcf95f3df', 'f6f1f5c3-e159-472c-be74-e736d2e70c5f', 'Abhi', 'hiralalsahani841@gmail.com', '', NULL, 'https://www.linkedin.com/in/hira-sahani-9b1374247?utm_source=share_via&utm_content=profile&utm_medium=member_android', false, '', true, 'https://www.linkedin.com/in/hira-sahani-9b1374247?utm_source=share_via&utm_content=profile&utm_medium=member_android', '{https://www.linkedin.com/in/hira-sahani-9b1374247?utm_source=share_via&utm_content=profile&utm_medium=member_android}', '', '', '', '', 'India', '', '', '', false, false, '[{"gpa": "", "major": "", "degree": "", "school": "", "endYear": "", "startYear": ""}]', '{"0": {"city": "", "role": "", "company": "", "country": "", "endYear": "", "startYear": "", "description": ""}, "comms_prefs": {"jobAlerts": true, "emailNotifs": true, "marketingEmails": true, "referralUpdates": true}}', '', false, false, '2026-07-09 13:24:09.706223+00', '2026-07-10 00:13:27.562837+00', false, false, '', '2026-07-09') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('16979d88-b5e1-466a-8c49-416e2b243d8d', 'f483b015-9816-4891-8af2-5220db9c1b51', NULL, 'techvinex.test+sa1@gmail.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('231d453a-f96f-4858-b1da-113b5ddf1ace', '710e64df-6607-4d5c-98c0-44f4072674e7', NULL, 'benchmark@jetra.app', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('5ad05c72-a2a3-455c-9ed6-d121b30b7790', '59b81655-615c-494b-a53c-e0374c9fc36f', NULL, 'blog@jetra.app', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('c7d5d204-8d96-4fea-a4d7-f61730138bfd', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, 'benchmark2@jetra.app', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('08cd8b62-4114-43d6-8318-da38a1a9d4fc', 'a82dab59-7d08-4040-a236-85fd3f36d134', 'Vvv', 'hhh@gmail.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('ffbb53ab-398d-4cc3-a005-02dfc7a5aa78', 'f84513b7-fce7-487d-9b3b-137b98732f4e', NULL, 'candidate@demo.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('fd0ca6d5-bbc3-49aa-a92b-534d7039a761', '8c5f6824-4baf-4c38-ae18-0189099df8d4', 'hiralal sahani', 'hiralalsahani840@gmail.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('15ed16fd-ec81-4cbc-a52e-88915ad59489', 'ba9232a4-1d0a-43db-8be6-f6281be2b65b', NULL, 'hirasahani840@gmail.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('44ebd310-a84b-4093-bb19-25bd1ace58f6', '2e446a79-379a-4cca-b221-72292e7bfa0c', 'Hira Sahani', 'sahanihira540@gmail.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-10 19:55:48.610398+00', '2026-07-10 19:55:48.610398+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('69b3cb26-888a-42d5-b4ec-cd834b79e5bc', '9c98de87-135d-435d-a99c-3675cfb774c9', NULL, 'techvinex-auth-test-1783745258@example.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-11 04:47:38.950828+00', '2026-07-11 04:47:38.950828+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('7ebe6784-e3dd-42e2-9859-1d5ab9b6ddc9', 'c1bbedfb-9bbb-4ddd-bb8d-017867e9c7ee', NULL, 'techvinex-ui-auth-test-1783745308@example.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-11 04:48:29.259476+00', '2026-07-11 04:48:29.259476+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('5f7ba106-2da0-4457-9a17-f89d90aef4b5', '0949b474-4a2e-4a56-9fcc-8d72d6c9776a', NULL, 'techvinex-domain-compare-1783745401@example.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-11 04:50:02.543686+00', '2026-07-11 04:50:02.543686+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, user_id, full_name, email, phone, dob, linkedin, no_linkedin, resume_name, no_resume, portfolio, other_links, leetcode, github, codechef, codeforces, country, state, city, postal_code, authorized_to_work, work_from_different_country, education, work_experience, signature_name, onboarding_completed, availability_set, created_at, updated_at, interview_completed, agree_to_remain, signature_text, signature_date) VALUES ('e473bf24-ed73-423b-9f6d-f493612fe8f9', '72274d7d-eea0-4b15-ac70-6d27f13dd70d', NULL, 'vertaicsolution@gmail.com', NULL, NULL, NULL, false, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, '[]', '{}', NULL, false, false, '2026-07-11 04:51:46.665343+00', '2026-07-11 04:51:46.665343+00', false, false, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: saved_roles; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: secrets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: storage_scan_results; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.storage_scan_results (id, bucket, object_path, sha256, size_bytes, content_type, verdict, engines_total, engines_hit, vendor, vendor_scan_id, details, uploaded_by, action_taken, scanned_at, created_at, updated_at, reviewed_at, reviewed_by, review_note) VALUES ('e174d9c2-6914-4b72-9f96-e47f52d96b5d', 'blog-images', 'a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg', '75619e7f96bb20cb4e945d80bf6373f01c4893b05e638b76f4fa1271fcf9d1a9', 346364, NULL, 'unknown', 0, 0, 'virustotal', NULL, '{"reason": "VIRUSTOTAL_API_KEY not configured", "removed": false}', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, '2026-07-07 07:47:19.332773+00', '2026-07-07 07:47:19.332773+00', '2026-07-07 07:47:19.332773+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.storage_scan_results (id, bucket, object_path, sha256, size_bytes, content_type, verdict, engines_total, engines_hit, vendor, vendor_scan_id, details, uploaded_by, action_taken, scanned_at, created_at, updated_at, reviewed_at, reviewed_by, review_note) VALUES ('207b7d0a-8bc6-4441-96c8-d293b309d48a', 'blog-images', 'e51dd014-b6ba-4416-910e-edf1080ce4f0.jpg', 'de69f2f3032b45a63f686fcb61c1d334d03baa4f8d085db360ac1aa43832eebe', 2558320, NULL, 'unknown', 0, 0, 'virustotal', NULL, '{"reason": "VIRUSTOTAL_API_KEY not configured", "removed": false, "sniffed": "image/jpeg"}', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, '2026-07-10 15:49:30.443922+00', '2026-07-10 15:49:30.443922+00', '2026-07-10 15:49:30.443922+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.storage_scan_results (id, bucket, object_path, sha256, size_bytes, content_type, verdict, engines_total, engines_hit, vendor, vendor_scan_id, details, uploaded_by, action_taken, scanned_at, created_at, updated_at, reviewed_at, reviewed_by, review_note) VALUES ('415819df-70aa-4ced-835d-9706ffc46c4d', 'blog-images', 'f3b32311-74f9-48b3-ba94-782f41fc79fe.jpg', '5a81ad9ed0bee4c9519fe440890a83f4c023d3ed7aceee4d5dd164f87321da60', 1507880, NULL, 'unknown', 0, 0, 'virustotal', NULL, '{"reason": "VIRUSTOTAL_API_KEY not configured", "removed": false, "sniffed": "image/jpeg"}', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, '2026-07-10 16:09:11.321003+00', '2026-07-10 16:09:11.321003+00', '2026-07-10 16:09:11.321003+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.storage_scan_results (id, bucket, object_path, sha256, size_bytes, content_type, verdict, engines_total, engines_hit, vendor, vendor_scan_id, details, uploaded_by, action_taken, scanned_at, created_at, updated_at, reviewed_at, reviewed_by, review_note) VALUES ('bde741d8-09b1-4b8f-9fd5-e22720426846', 'blog-images', '0a800f36-1ba3-41cd-8eac-3ef6d37c0e3e.jpg', '245cdee92f538161c04f4e6947f43c1808ba869e216e63402478588be16e91b6', 249636, NULL, 'unknown', 0, 0, 'virustotal', NULL, '{"reason": "VIRUSTOTAL_API_KEY not configured", "removed": false, "sniffed": "image/jpeg"}', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, '2026-07-10 16:34:24.920474+00', '2026-07-10 16:34:24.920474+00', '2026-07-10 16:34:24.920474+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.storage_scan_results (id, bucket, object_path, sha256, size_bytes, content_type, verdict, engines_total, engines_hit, vendor, vendor_scan_id, details, uploaded_by, action_taken, scanned_at, created_at, updated_at, reviewed_at, reviewed_by, review_note) VALUES ('f211ed5e-2f3d-4a96-b0c4-0c99ecb67072', 'blog-images', '2287d21d-8bfe-4153-bcf6-4c3c17c59f77.jpg', 'b5cdfd55a6495747527159f951ee57a20bd458cb69557e76fb6a53be5f257cfa', 46409, NULL, 'unknown', 0, 0, 'virustotal', NULL, '{"reason": "VIRUSTOTAL_API_KEY not configured", "removed": false, "sniffed": "image/jpeg"}', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, '2026-07-10 16:50:46.254975+00', '2026-07-10 16:50:46.254975+00', '2026-07-10 16:50:46.254975+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.storage_scan_results (id, bucket, object_path, sha256, size_bytes, content_type, verdict, engines_total, engines_hit, vendor, vendor_scan_id, details, uploaded_by, action_taken, scanned_at, created_at, updated_at, reviewed_at, reviewed_by, review_note) VALUES ('3ce3b387-7575-46d8-8250-5078f7d39a07', 'blog-images', 'c91d0eb7-ad3d-4e0f-ba1a-ce688acc822c.jpg', '1606fd029bdaa1fa9fadb35249335b3cf912a35795e0ba6f8b5b16172cbe34cf', 202073, NULL, 'unknown', 0, 0, 'virustotal', NULL, '{"reason": "VIRUSTOTAL_API_KEY not configured", "removed": false, "sniffed": "image/jpeg"}', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, '2026-07-10 16:56:50.264423+00', '2026-07-10 16:56:50.264423+00', '2026-07-10 16:56:50.264423+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.storage_scan_results (id, bucket, object_path, sha256, size_bytes, content_type, verdict, engines_total, engines_hit, vendor, vendor_scan_id, details, uploaded_by, action_taken, scanned_at, created_at, updated_at, reviewed_at, reviewed_by, review_note) VALUES ('6bcc2820-35ae-4c57-98be-20b7766fe180', 'blog-images', '0dfff600-83bc-49f2-8f06-80149ad32ee0.jpg', '08076914296a264b37d6bd7be168c65f547b28e81314de5ec4217e116340d06e', 1480963, NULL, 'unknown', 0, 0, 'virustotal', NULL, '{"reason": "VIRUSTOTAL_API_KEY not configured", "removed": false, "sniffed": "image/jpeg"}', '8e90113a-821f-45cf-b02d-3cda748ff52f', NULL, '2026-07-10 18:57:55.907999+00', '2026-07-10 18:57:55.907999+00', '2026-07-10 18:57:55.907999+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_roles (id, user_id, role) VALUES ('7a3537fd-ef42-40dd-93cd-b5eb852cec67', 'e58b1dab-7997-46e4-b591-235b869b93a3', 'user') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (id, user_id, role) VALUES ('19ecd0c7-3241-4718-a8b5-9018cae22dec', '0582d8d5-23a8-4dde-bb42-63084344397d', 'employer') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (id, user_id, role) VALUES ('dc58bc83-446a-45d0-8c25-2c226f0de64b', 'df49dae2-3410-47d3-a755-d3fa274cc108', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (id, user_id, role) VALUES ('c27d059a-fecb-45c0-8740-ef9610dd4f2b', '59b81655-615c-494b-a53c-e0374c9fc36f', 'admin') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (id, user_id, role) VALUES ('aef68b61-ed83-42e4-978d-c09f1f39187f', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'reviewer') ON CONFLICT DO NOTHING;
INSERT INTO public.user_roles (id, user_id, role) VALUES ('52bfe9d9-9deb-4fe9-a0c8-a6cd74e2b03c', '8e90113a-821f-45cf-b02d-3cda748ff52f', 'admin') ON CONFLICT DO NOTHING;


--
-- Data for Name: webhook_deliveries; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.webhook_deliveries (id, endpoint_name, verified, status_code, reason, headers, body_preview, created_at) VALUES ('01a7e801-6803-4ce1-ab71-b23898cba252', 'nonexistent', false, 404, 'endpoint_not_found_or_inactive', '{"host": "edge-runtime.supabase.com", "cf-ray": "9f9370203b5b06dc-AMS", "baggage": "sb-request-id=019e0e6b-501e-7fe1-8939-b3db89a1396a", "cdn-loop": "cloudflare; loops=1", "cf-ew-via": "15", "cf-worker": "supabase.co", "cf-visitor": "{\"scheme\":\"https\"}", "user-agent": "Go-http-client/2.0", "traceparent": "00-019e0e6b501e7fe18939b3db89a1396a-44c31955d072262d-00", "cf-ipcountry": "NL", "content-type": "application/json", "x-request-id": "019e0e6b-5016-74df-8521-c70c21413bb2", "authorization": "none", "sb-request-id": "019e0e6b-501e-7fe1-8939-b3db89a1396a", "content-length": "10", "accept-encoding": "gzip, br", "x-amzn-trace-id": "Root=1-69ff9866-7d9d6e2548e116a55804171e", "x-forwarded-for": "34.7.47.250,34.7.47.250, 3.2.59.181", "cf-connecting-ip": "34.7.47.250", "x-forwarded-port": "443", "x-forwarded-proto": "https"}', '', '2026-05-09 20:26:15.638218+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: webhook_endpoints; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

\unrestrict jcM89NuMEDDi7XPGGqnHwhTjZhfRI2qTineQqiZ6QkSiXa133LickM2uYNMRWJy

