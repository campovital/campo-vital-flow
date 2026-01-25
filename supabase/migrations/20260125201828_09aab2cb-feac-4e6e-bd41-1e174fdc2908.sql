-- Create storage bucket for pest report photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pest-photos', 
  'pest-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload pest photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pest-photos');

-- Allow public read access to pest photos
CREATE POLICY "Public can view pest photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pest-photos');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own pest photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pest-photos' AND auth.uid()::text = (storage.foldername(name))[1]);