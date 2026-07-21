--
-- PostgreSQL database dump
--

\restrict 0QR2oUgIpnvQ5ScAWHHMVKGvLk4ct57cfTCfK30Ia9xHTZmAsjsSuWoJKTGwGTo

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
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) VALUES ('668d9064-5df1-441f-92d2-e854fa55c1b1', 'blog-images', 'a7623d59-4a97-4e17-abc9-2e2338740fd5.jpg', '8e90113a-821f-45cf-b02d-3cda748ff52f', '2026-07-07 05:37:09.665955+00', '2026-07-07 05:37:09.665955+00', '2026-07-07 05:37:09.665955+00', '{"eTag": "\"e9b21a0d672b33e602a26203ffe8c690\"", "size": 346364, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-07T05:37:10.000Z", "contentLength": 346364, "httpStatusCode": 200}', 'b24bd597-52b7-4174-9cf9-f62f2070bcb8', '8e90113a-821f-45cf-b02d-3cda748ff52f', '{}') ON CONFLICT DO NOTHING;
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) VALUES ('a7852479-5513-41f5-99b6-d8ed2387c619', 'blog-images', 'e51dd014-b6ba-4416-910e-edf1080ce4f0.jpg', '8e90113a-821f-45cf-b02d-3cda748ff52f', '2026-07-10 15:49:22.931074+00', '2026-07-10 15:49:22.931074+00', '2026-07-10 15:49:22.931074+00', '{"eTag": "\"62344480350a87a9eb219ca14d916c8e\"", "size": 2558320, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-10T15:49:23.000Z", "contentLength": 2558320, "httpStatusCode": 200}', '5b37f4bd-f5d9-4701-9a6d-285a228a8603', '8e90113a-821f-45cf-b02d-3cda748ff52f', '{}') ON CONFLICT DO NOTHING;
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) VALUES ('018d9bd0-a19b-498f-bb86-b1419a8bf928', 'blog-images', 'f3b32311-74f9-48b3-ba94-782f41fc79fe.jpg', '8e90113a-821f-45cf-b02d-3cda748ff52f', '2026-07-10 16:09:01.964134+00', '2026-07-10 16:09:01.964134+00', '2026-07-10 16:09:01.964134+00', '{"eTag": "\"09b9f8fb3db1238e35dcfe5291b09244\"", "size": 1507880, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-10T16:09:02.000Z", "contentLength": 1507880, "httpStatusCode": 200}', '33554665-43a0-4fca-b8f1-438858909474', '8e90113a-821f-45cf-b02d-3cda748ff52f', '{}') ON CONFLICT DO NOTHING;
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) VALUES ('2a45bd15-9704-4cde-91c9-c28bcdb05c49', 'blog-images', '0a800f36-1ba3-41cd-8eac-3ef6d37c0e3e.jpg', '8e90113a-821f-45cf-b02d-3cda748ff52f', '2026-07-10 16:34:17.410159+00', '2026-07-10 16:34:17.410159+00', '2026-07-10 16:34:17.410159+00', '{"eTag": "\"e1c00d6d607046c0b1aefba72ccdf985\"", "size": 249636, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-10T16:34:18.000Z", "contentLength": 249636, "httpStatusCode": 200}', '4e818797-f304-4960-ab84-54ba2d69d23e', '8e90113a-821f-45cf-b02d-3cda748ff52f', '{}') ON CONFLICT DO NOTHING;
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) VALUES ('be320831-09fb-4836-8745-6f14d21286d0', 'blog-images', '2287d21d-8bfe-4153-bcf6-4c3c17c59f77.jpg', '8e90113a-821f-45cf-b02d-3cda748ff52f', '2026-07-10 16:50:38.622236+00', '2026-07-10 16:50:38.622236+00', '2026-07-10 16:50:38.622236+00', '{"eTag": "\"e8c21cee1155c25800fa5c3509bd9745\"", "size": 46409, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-10T16:50:39.000Z", "contentLength": 46409, "httpStatusCode": 200}', '78e28dfe-149e-40b2-9210-7a7fecd636a2', '8e90113a-821f-45cf-b02d-3cda748ff52f', '{}') ON CONFLICT DO NOTHING;
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) VALUES ('d26a27f6-dfc8-414f-bcdd-942a583d4b96', 'blog-images', 'c91d0eb7-ad3d-4e0f-ba1a-ce688acc822c.jpg', '8e90113a-821f-45cf-b02d-3cda748ff52f', '2026-07-10 16:56:48.143737+00', '2026-07-10 16:56:48.143737+00', '2026-07-10 16:56:48.143737+00', '{"eTag": "\"5f893d273899fe26ab5e20182a5e0759\"", "size": 202073, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-10T16:56:49.000Z", "contentLength": 202073, "httpStatusCode": 200}', 'db834a1f-b5e7-46bc-8087-308721678bec', '8e90113a-821f-45cf-b02d-3cda748ff52f', '{}') ON CONFLICT DO NOTHING;
INSERT INTO storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) VALUES ('fb135df4-8acd-452b-b483-eb8afbe69ef9', 'blog-images', '0dfff600-83bc-49f2-8f06-80149ad32ee0.jpg', '8e90113a-821f-45cf-b02d-3cda748ff52f', '2026-07-10 18:57:49.328921+00', '2026-07-10 18:57:49.328921+00', '2026-07-10 18:57:49.328921+00', '{"eTag": "\"a5d949fa2f959294e79b305cdf217b3a\"", "size": 1480963, "mimetype": "image/jpeg", "cacheControl": "max-age=3600", "lastModified": "2026-07-10T18:57:50.000Z", "contentLength": 1480963, "httpStatusCode": 200}', '130ac0ce-5bf1-4b95-bc95-ca02053f3dbc', '8e90113a-821f-45cf-b02d-3cda748ff52f', '{}') ON CONFLICT DO NOTHING;


--
-- PostgreSQL database dump complete
--

\unrestrict 0QR2oUgIpnvQ5ScAWHHMVKGvLk4ct57cfTCfK30Ia9xHTZmAsjsSuWoJKTGwGTo

