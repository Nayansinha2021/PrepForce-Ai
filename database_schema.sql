-- Run this in your Supabase SQL Editor

-- 1. User Profiles Table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  interviews_left INT DEFAULT 2,
  default_language TEXT DEFAULT 'javascript',
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own profile') THEN
    CREATE POLICY "Users can manage their own profile" ON public.user_profiles FOR ALL USING (auth.uid() = id);
  END IF;
END $$;

-- 2. Interviews Table
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'General Candidate',
  status TEXT DEFAULT 'in_progress',
  parsed_resume_context JSONB,
  scorecard JSONB,
  behavioral_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own interviews') THEN
    CREATE POLICY "Users can manage their own interviews" ON public.interviews FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own interview messages') THEN
    CREATE POLICY "Users can manage their own interview messages" ON public.messages FOR ALL USING (auth.uid() = (SELECT user_id FROM public.interviews WHERE id = interview_id));
  END IF;
END $$;

-- 4. Job Templates Table
CREATE TABLE IF NOT EXISTS public.job_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own templates') THEN
    CREATE POLICY "Users can manage their own templates" ON public.job_templates FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Coding Attempts Table
CREATE TABLE IF NOT EXISTS public.coding_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  language TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  execution_output TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coding_attempts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own coding attempts') THEN
    CREATE POLICY "Users can manage their own coding attempts" ON public.coding_attempts FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Safe Column Migrations (runs harmlessly if columns already exist)
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS behavioral_data JSONB;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'javascript';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- NOTE: To make yourself an admin, run this SQL inside the Supabase SQL editor:
-- UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';


