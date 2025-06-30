
-- Drop existing foreign key constraints and rename tables
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_sheet_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_sheet_id_fkey;

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_members table for collaboration
CREATE TABLE public.project_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'editor', 'viewer'
  invited_by UUID REFERENCES public.user_profiles(id) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create project_invitations table
CREATE TABLE public.project_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES public.user_profiles(id) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add project_id to sheets table
ALTER TABLE public.sheets 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update existing sheets to have a default project (optional - you can skip this if starting fresh)
-- INSERT INTO public.projects (name, description, created_by) 
-- SELECT 'Default Project', 'Legacy data', created_by FROM public.sheets LIMIT 1;

-- Enable RLS on new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects they are members of" 
  ON public.projects 
  FOR SELECT 
  USING (
    id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects" 
  ON public.projects 
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project admins can update projects" 
  ON public.projects 
  FOR UPDATE 
  USING (
    id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for project_members
CREATE POLICY "Users can view project members for their projects" 
  ON public.project_members 
  FOR SELECT 
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project admins can manage members" 
  ON public.project_members 
  FOR ALL 
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for project_invitations
CREATE POLICY "Project admins can manage invitations" 
  ON public.project_invitations 
  FOR ALL 
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Update sheets RLS to be project-based
DROP POLICY IF EXISTS "Anyone can view sheets" ON public.sheets;
DROP POLICY IF EXISTS "Authenticated users can upload sheets" ON public.sheets;
DROP POLICY IF EXISTS "Sheet creators can edit their sheets" ON public.sheets;

CREATE POLICY "Users can view sheets in their projects" 
  ON public.sheets 
  FOR SELECT 
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create sheets" 
  ON public.sheets 
  FOR INSERT 
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Project editors can update sheets" 
  ON public.sheets 
  FOR UPDATE 
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
    )
  );

-- Update comments and activity_logs to reference project_id as well
ALTER TABLE public.comments ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.activity_logs ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update comments RLS
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;

CREATE POLICY "Users can view comments in their projects" 
  ON public.comments 
  FOR SELECT 
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create comments" 
  ON public.comments 
  FOR INSERT 
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update activity_logs RLS
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can create activity logs" ON public.activity_logs;

CREATE POLICY "Project admins can view activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Project members can create activity logs" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );
