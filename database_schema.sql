-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.job_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
  ON public.job_templates
  FOR ALL
  USING (auth.uid() = user_id);

-- Add missing behavioral_data column to interviews table if it doesn't exist
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS behavioral_data JSONB;

-- Feature Expansion: Coding Challenges & User Settings
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'javascript';

CREATE TABLE IF NOT EXISTS public.coding_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  language TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  execution_output TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for coding_attempts
ALTER TABLE public.coding_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own coding attempts"
  ON public.coding_attempts
  FOR ALL
  USING (auth.uid() = user_id);

-- Migration to support administrative roles & account actions on user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- NOTE: To make yourself an admin, run this SQL inside the Supabase SQL editor:
-- UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';

