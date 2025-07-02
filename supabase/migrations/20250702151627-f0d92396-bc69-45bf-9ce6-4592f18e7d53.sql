
-- Drop the existing policy for creating projects
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

-- Create a new policy that allows authenticated users to create projects
CREATE POLICY "Users can create projects" 
  ON public.projects 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);
