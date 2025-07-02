
-- First, let's completely drop all existing policies on the projects table
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Project admins can update projects" ON public.projects;

-- Recreate the policies with proper conditions
CREATE POLICY "Users can create projects" 
  ON public.projects 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view projects they are members of" 
  ON public.projects 
  FOR SELECT 
  TO authenticated
  USING (public.is_project_member(id, auth.uid()));

CREATE POLICY "Project admins can update projects" 
  ON public.projects 
  FOR UPDATE 
  TO authenticated
  USING (public.is_project_admin(id, auth.uid()));
