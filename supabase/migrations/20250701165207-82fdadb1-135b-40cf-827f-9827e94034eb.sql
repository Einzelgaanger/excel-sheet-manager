
-- First, let's drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view project members for their projects" ON public.project_members;
DROP POLICY IF EXISTS "Project admins can manage members" ON public.project_members;

-- Create a security definer function to check if user is a member of a project
CREATE OR REPLACE FUNCTION public.is_project_member(project_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_members.project_id = is_project_member.project_id 
    AND project_members.user_id = is_project_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a security definer function to check if user is a project admin
CREATE OR REPLACE FUNCTION public.is_project_admin(project_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_members.project_id = is_project_admin.project_id 
    AND project_members.user_id = is_project_admin.user_id
    AND project_members.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create new policies using the security definer functions
CREATE POLICY "Users can view project members for their projects" 
  ON public.project_members 
  FOR SELECT 
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Project admins can manage members" 
  ON public.project_members 
  FOR ALL 
  USING (public.is_project_admin(project_id, auth.uid()));

-- Also fix the other policies that reference project_members to avoid recursion
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Project admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project admins can manage invitations" ON public.project_invitations;
DROP POLICY IF EXISTS "Users can view sheets in their projects" ON public.sheets;
DROP POLICY IF EXISTS "Project members can create sheets" ON public.sheets;
DROP POLICY IF EXISTS "Project editors can update sheets" ON public.sheets;
DROP POLICY IF EXISTS "Users can view comments in their projects" ON public.comments;
DROP POLICY IF EXISTS "Project members can create comments" ON public.comments;
DROP POLICY IF EXISTS "Project admins can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Project members can create activity logs" ON public.activity_logs;

-- Recreate policies using the security definer functions
CREATE POLICY "Users can view projects they are members of" 
  ON public.projects 
  FOR SELECT 
  USING (public.is_project_member(id, auth.uid()));

CREATE POLICY "Project admins can update projects" 
  ON public.projects 
  FOR UPDATE 
  USING (public.is_project_admin(id, auth.uid()));

CREATE POLICY "Project admins can manage invitations" 
  ON public.project_invitations 
  FOR ALL 
  USING (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "Users can view sheets in their projects" 
  ON public.sheets 
  FOR SELECT 
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can create sheets" 
  ON public.sheets 
  FOR INSERT 
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Project editors can update sheets" 
  ON public.sheets 
  FOR UPDATE 
  USING (
    public.is_project_admin(project_id, auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_members.project_id = sheets.project_id 
      AND project_members.user_id = auth.uid() 
      AND project_members.role = 'editor'
    )
  );

CREATE POLICY "Users can view comments in their projects" 
  ON public.comments 
  FOR SELECT 
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Project members can create comments" 
  ON public.comments 
  FOR INSERT 
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Project admins can view activity logs" 
  ON public.activity_logs 
  FOR SELECT 
  USING (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "Project members can create activity logs" 
  ON public.activity_logs 
  FOR INSERT 
  WITH CHECK (public.is_project_member(project_id, auth.uid()));
