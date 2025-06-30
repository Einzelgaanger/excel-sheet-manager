
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from './Header'
import { CreateProjectDialog } from './CreateProjectDialog'
import { ProjectCard } from './ProjectCard'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Search, Plus, Folder, Users } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

type Project = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  member_count?: number
  role?: string
}

export function ProjectDashboard() {
  const { profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(true)

  const fetchProjects = useCallback(async () => {
    if (!mounted || !profile) return
    
    try {
      setLoading(true)
      
      // Fetch projects where user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select(`
          role,
          project:projects (
            id,
            name,
            description,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', profile.id)

      if (memberError) throw memberError

      // Get member counts for each project
      const projectsWithCounts = await Promise.all(
        (memberProjects || []).map(async (member: any) => {
          const { count } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', member.project.id)

          return {
            ...member.project,
            member_count: count || 0,
            role: member.role
          }
        })
      )

      if (mounted) {
        console.log('Fetched projects:', projectsWithCounts)
        setProjects(projectsWithCounts)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      if (mounted) {
        toast({
          title: 'Error',
          description: 'Failed to load projects. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      if (mounted) {
        setLoading(false)
      }
    }
  }, [mounted, profile])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (profile && mounted) {
      fetchProjects()
    }
  }, [profile, fetchProjects, mounted])

  useEffect(() => {
    // Filter projects based on search query
    const filtered = projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    setFilteredProjects(filtered)
  }, [projects, searchQuery])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
              My Projects
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-600 mt-2">
              <span className="text-sm sm:text-base">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
              {profile && (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-sm">•</span>
                  <span className="text-xs sm:text-sm">Welcome back,</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    {profile.full_name || profile.email}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg text-sm w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="sm:hidden">New Project</span>
              <span className="hidden sm:inline">Create Project</span>
            </Button>
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="relative max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-400 focus:ring-blue-200 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 sm:p-6 animate-pulse shadow-md border border-blue-100 aspect-[4/3]">
                <div className="h-4 bg-blue-100 rounded mb-2"></div>
                <div className="h-3 bg-blue-100 rounded mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-blue-100 rounded flex-1"></div>
                  <div className="h-8 bg-blue-100 rounded flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <Folder className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-blue-400 mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-600 text-sm sm:text-base max-w-sm mx-auto mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms or clear the search to see all projects.'
                : 'Create your first project to start collaborating with your team.'
              }
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onUpdate={fetchProjects}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onProjectCreated={fetchProjects}
      />
    </div>
  )
}
