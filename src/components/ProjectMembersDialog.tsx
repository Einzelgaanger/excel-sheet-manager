
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { UserPlus, Mail, Trash2 } from 'lucide-react'

interface ProjectMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  userRole: string
}

type ProjectMember = {
  id: string
  role: string
  user_id: string
  joined_at: string
  user_profiles: {
    full_name: string | null
    email: string
    avatar_url: string | null
  }
}

type PendingInvitation = {
  id: string
  email: string
  role: string
  created_at: string
}

export function ProjectMembersDialog({ open, onOpenChange, projectId, userRole }: ProjectMembersDialogProps) {
  const { profile } = useAuth()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('viewer')
  const [isInviting, setIsInviting] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          id,
          role,
          user_id,
          joined_at,
          user_profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .order('joined_at', { ascending: true })

      if (membersError) throw membersError

      const { data: invitationsData, error: invitationsError } = await supabase
        .from('project_invitations')
        .select('id, email, role, created_at')
        .eq('project_id', projectId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })

      if (invitationsError) throw invitationsError

      setMembers(membersData || [])
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast({
        title: 'Error',
        description: 'Failed to load project members.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && projectId) {
      fetchMembers()
    }
  }, [open, projectId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!profile || !inviteEmail.trim()) return

    setIsInviting(true)
    
    try {
      // Check if user is already a member
      const existingMember = members.find(m => m.user_profiles.email === inviteEmail.trim())
      if (existingMember) {
        toast({
          title: 'User Already Member',
          description: 'This user is already a member of the project.',
          variant: 'destructive',
        })
        return
      }

      // Check if invitation already exists
      const existingInvitation = invitations.find(i => i.email === inviteEmail.trim())
      if (existingInvitation) {
        toast({
          title: 'Invitation Already Sent',
          description: 'An invitation has already been sent to this email.',
          variant: 'destructive',
        })
        return
      }

      // Generate invitation token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      // Create invitation
      const { error } = await supabase
        .from('project_invitations')
        .insert([{
          project_id: projectId,
          email: inviteEmail.trim(),
          role: inviteRole,
          invited_by: profile.id,
          token
        }])

      if (error) throw error

      toast({
        title: 'Invitation Sent',
        description: `Invitation sent to ${inviteEmail}`,
      })

      // Reset form
      setInviteEmail('')
      setInviteRole('viewer')
      
      // Refresh data
      fetchMembers()
      
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast({
        title: 'Error',
        description: 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      toast({
        title: 'Role Updated',
        description: 'Member role has been updated successfully.',
      })

      fetchMembers()
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: 'Error',
        description: 'Failed to update member role.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast({
        title: 'Member Removed',
        description: 'Member has been removed from the project.',
      })

      fetchMembers()
    } catch (error) {
      console.error('Error removing member:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove member.',
        variant: 'destructive',
      })
    }
  }

  const canManageMembers = userRole === 'admin'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Project Members</DialogTitle>
          <DialogDescription>
            Manage project members and send invitations.
          </DialogDescription>
        </DialogHeader>
        
        {canManageMembers && (
          <form onSubmit={handleInvite} className="space-y-4 border-b pb-6">
            <h3 className="font-medium">Invite New Member</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  disabled={isInviting}
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole} disabled={isInviting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              disabled={isInviting || !inviteEmail.trim()}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        )}

        <div className="space-y-6">
          {/* Current Members */}
          <div>
            <h3 className="font-medium mb-4">Members ({members.length})</h3>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.user_profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.user_profiles.full_name?.[0] || member.user_profiles.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.user_profiles.full_name || member.user_profiles.email}
                        </p>
                        <p className="text-sm text-gray-500">{member.user_profiles.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canManageMembers && member.user_id !== profile?.id ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleRoleChange(member.id, newRole)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      )}
                      {canManageMembers && member.user_id !== profile?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div>
              <h3 className="font-medium mb-4">Pending Invitations ({invitations.length})</h3>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-500">Invited {new Date(invitation.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {invitation.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
