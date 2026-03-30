
-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interview_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agree_to_remain BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_date TEXT;

-- payout_history table
CREATE TABLE public.payout_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payouts" ON public.payout_history FOR SELECT USING (auth.uid() = user_id);

-- payout_accounts table
CREATE TABLE public.payout_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  country TEXT,
  payment_provider TEXT,
  email TEXT,
  business_country TEXT,
  business_type TEXT,
  business_structure TEXT,
  legal_business_name TEXT,
  trading_name TEXT,
  product_description TEXT,
  currency TEXT,
  bank_country TEXT,
  account_holder_name TEXT,
  iban TEXT,
  sort_code TEXT,
  account_number TEXT,
  tax_full_name TEXT,
  tax_country TEXT,
  tax_signature TEXT,
  tax_agreed BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  verified_phone TEXT,
  id_uploaded BOOLEAN DEFAULT false,
  selfie_uploaded BOOLEAN DEFAULT false,
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payout account" ON public.payout_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payout account" ON public.payout_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payout account" ON public.payout_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_payout_accounts_updated_at BEFORE UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email TEXT NOT NULL,
  referral_code TEXT,
  status TEXT DEFAULT 'pending',
  reward_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);
