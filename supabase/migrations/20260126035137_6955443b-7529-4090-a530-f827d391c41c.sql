-- Phase 1: Extend harvests and pest_reports tables

-- Add classification and photo_url to harvests table
ALTER TABLE public.harvests 
ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'primera' CHECK (classification IN ('primera', 'segunda', 'merma'));

-- Add photo evidence to harvests (if not exists already - there's no photo_url column currently)
ALTER TABLE public.harvests 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add plants inspection fields to pest_reports for automatic incidence calculation
ALTER TABLE public.pest_reports 
ADD COLUMN IF NOT EXISTS plants_inspected INTEGER;

ALTER TABLE public.pest_reports 
ADD COLUMN IF NOT EXISTS plants_affected INTEGER;

-- Add comment to clarify incidence calculation logic
COMMENT ON COLUMN public.pest_reports.plants_inspected IS 'Number of plants inspected during report';
COMMENT ON COLUMN public.pest_reports.plants_affected IS 'Number of affected plants found during inspection';
COMMENT ON COLUMN public.pest_reports.incidence_percent IS 'Calculated as (plants_affected/plants_inspected)*100 or manually entered';
COMMENT ON COLUMN public.harvests.classification IS 'Quality classification: primera (export), segunda (local), merma (loss)';