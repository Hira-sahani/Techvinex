DO $$
DECLARE
  admin_user_id uuid;
  admin_email text := 'admin@techvinex.com';
  admin_pw text := 'TvxAdmin!2026#Secure';
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE lower(email) = lower(admin_email)
  ORDER BY created_at ASC
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_user_id,
      'authenticated',
      'authenticated',
      admin_email,
      crypt(admin_pw, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false,
      '',
      '',
      '',
      ''
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt(admin_pw, gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        aud = 'authenticated',
        role = 'authenticated',
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
          || '{"provider":"email","providers":["email"]}'::jsonb,
        updated_at = now()
    WHERE id = admin_user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.identities
    WHERE user_id = admin_user_id
      AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id::text,
      admin_user_id,
      jsonb_build_object('sub', admin_user_id::text, 'email', admin_email, 'email_verified', true),
      'email',
      admin_user_id::text,
      now(),
      now(),
      now()
    );
  ELSE
    UPDATE auth.identities
    SET identity_data = jsonb_build_object('sub', admin_user_id::text, 'email', admin_email, 'email_verified', true),
        provider_id = COALESCE(NULLIF(provider_id, ''), admin_user_id::text),
        updated_at = now()
    WHERE user_id = admin_user_id
      AND provider = 'email';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (admin_user_id, admin_email, 'Techvinex Admin')
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = now();
END $$;