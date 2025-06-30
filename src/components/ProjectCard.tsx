
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Folder, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

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

interface ProjectCardProps {
  project: Project
  onUpdate: () => void
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const handleOpenProject = () => {
    // Navigate to project workspace
    window.location.href = `/project/${project.id}`
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'editor':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'viewer':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <Card className="border border-blue-100 hover:border-blue-200 transition-colors cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
              {project.name}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 mt-1 line-clamp-2">
              {project.description || 'No description provided'}
            </CardDescription>
          </div>
          {project.role && (
            <Badge 
              variant="outline" 
              className={`ml-2 text-xs ${getRoleBadgeColor(project.role)} capitalize`}
            >
              {project.role}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{project.member_count || 0} member{(project.member_count || 0) !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleOpenProject}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm"
          >
            <Folder className="h-4 w-4 mr-2" />
            Open
          </Button>
          {project.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
