-- Create table for multiple photos per pest report
CREATE TABLE public.pest_report_photos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pest_report_id UUID NOT NULL REFERENCES public.pest_reports(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pest_report_photos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view pest report photos"
ON public.pest_report_photos
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create pest report photos"
ON public.pest_report_photos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admin/Agronoma can delete pest report photos"
ON public.pest_report_photos
FOR DELETE
USING (is_admin_or_agronoma(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_pest_report_photos_report_id ON public.pest_report_photos(pest_report_id);