-- Create new admin user with confirmed email + admin role
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  admin_email text := 'admin@techvinex.com';
  admin_pw text := 'TvxAdmin!2026#Secure';
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
    SELECT id INTO new_user_id FROM auth.users WHERE email = admin_email;
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
      admin_email, crypt(admin_pw, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, '',
      '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', admin_email, 'email_verified', true),
      'email', new_user_id::text, now(), now(), now());
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new_user_id, admin_email, 'Techvinex Admin')
  ON CONFLICT (user_id) DO NOTHING;
END $$;