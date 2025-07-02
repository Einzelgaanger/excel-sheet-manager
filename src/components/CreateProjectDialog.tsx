
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { FolderPlus } from 'lucide-react'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: () => void
}

export function CreateProjectDialog({ open, onOpenChange, onProjectCreated }: CreateProjectDialogProps) {
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile || !name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a project name.',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    
    try {
      console.log('Creating project with:', { 
        name: name.trim(), 
        description: description.trim(), 
        created_by: profile.id 
      })
      
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: name.trim(),
          description: description.trim() || null,
          created_by: profile.id
        }])
        .select()
        .single()

      if (projectError) {
        console.error('Project creation error:', projectError)
        throw projectError
      }

      console.log('Project created successfully:', project)

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('project_members')
        .insert([{
          project_id: project.id,
          user_id: profile.id,
          role: 'admin',
          invited_by: profile.id
        }])

      if (memberError) {
        console.error('Member creation error:', memberError)
        // Don't throw here - project was created successfully
        console.warn('Failed to add creator as member, but project creation succeeded')
      } else {
        console.log('Creator added as admin member successfully')
      }

      toast({
        title: 'Project Created',
        description: `"${name}" has been created successfully.`,
      })

      // Reset form
      setName('')
      setDescription('')
      
      onProjectCreated()
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Error creating project:', error)
      
      let errorMessage = 'Failed to create project. Please try again.'
      
      if (error?.code === '42501') {
        errorMessage = 'You do not have permission to create projects. Please check your authentication status.'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <FolderPlus className="h-5 w-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Create a new project to organize and collaborate on your data files.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name..."
              required
              disabled={isCreating}
              className="border-blue-200 focus:border-blue-400"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description (optional)..."
              disabled={isCreating}
              className="border-blue-200 focus:border-blue-400"
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isCreating || !profile}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
