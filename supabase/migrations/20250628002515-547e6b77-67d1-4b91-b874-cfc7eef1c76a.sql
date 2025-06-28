
-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sheet_id UUID REFERENCES public.sheets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity logs table for admin tracking
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'view', 'download', 'upload', 'edit', 'comment'
  sheet_id UUID REFERENCES public.sheets(id) ON DELETE CASCADE,
  sheet_name TEXT,
  details TEXT, -- Additional details about the action
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add file_type and file_url columns to sheets table
ALTER TABLE public.sheets 
ADD COLUMN file_type TEXT DEFAULT 'csv',
ADD COLUMN file_url TEXT,
ADD COLUMN file_size BIGINT;

-- Enable RLS on comments table
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policy for comments - anyone can read comments
CREATE POLICY "Anyone can view comments" 
  ON public.comments 
  FOR SELECT 
  USING (true);

-- Create policy for comments - authenticated users can create comments
CREATE POLICY "Authenticated users can create comments" 
  ON public.comments 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Enable RLS on activity_logs table
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for activity logs - only admins can view
CREATE POLICY "Admins can view activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create policy for activity logs - anyone can insert (for tracking)
CREATE POLICY "Anyone can create activity logs" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sheet-files', 'sheet-files', true);

-- Create storage policies
CREATE POLICY "Anyone can view files" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'sheet-files');

CREATE POLICY "Authenticated users can upload files" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'sheet-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own files" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'sheet-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'sheet-files' AND auth.uid()::text = (storage.foldername(name))[1]);
