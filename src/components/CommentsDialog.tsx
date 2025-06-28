
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: string
  user_name: string
  user_email: string
  comment_text: string
  created_at: string
}

interface CommentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheetId: string
  sheetName: string
}

export function CommentsDialog({ open, onOpenChange, sheetId, sheetName }: CommentsDialogProps) {
  const { profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = async () => {
    if (!open) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching comments:', error)
        throw error
      }

      setComments(data || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load comments. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchComments()
    }
  }, [open, sheetId])

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !profile) return

    try {
      setSubmitting(true)
      const { error } = await supabase
        .from('comments')
        .insert([{
          sheet_id: sheetId,
          user_id: profile.id,
          user_name: profile.full_name || profile.email,
          user_email: profile.email,
          comment_text: newComment.trim()
        }])

      if (error) throw error

      // Log the comment activity
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: profile.id,
          user_name: profile.full_name || profile.email,
          user_email: profile.email,
          action_type: 'comment',
          sheet_id: sheetId,
          sheet_name: sheetName,
          details: `Added comment: "${newComment.trim().substring(0, 50)}${newComment.trim().length > 50 ? '...' : ''}"`
        }])

      setNewComment('')
      fetchComments() // Refresh comments
      
      toast({
        title: 'Success',
        description: 'Comment added successfully!',
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <MessageCircle className="h-5 w-5" />
            Comments - {sheetName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                <span className="ml-2 text-gray-600">Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-red-100 text-red-700 text-xs">
                        {comment.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-red-900">{comment.user_name}</p>
                        <p className="text-xs text-red-600">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment */}
          {profile && (
            <div className="border-t border-red-200 pt-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="border-red-200 focus:border-red-400 focus:ring-red-200"
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Add Comment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
