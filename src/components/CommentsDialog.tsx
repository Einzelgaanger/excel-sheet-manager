
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

type Comment = {
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

  useEffect(() => {
    if (open) {
      fetchComments()
    }
  }, [open, sheetId])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load comments.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !profile) return

    setSubmitting(true)
    try {
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

      // Log the activity
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: profile.id,
          user_name: profile.full_name || profile.email,
          user_email: profile.email,
          action_type: 'comment',
          sheet_id: sheetId,
          sheet_name: sheetName,
          details: `Commented: "${newComment.trim().substring(0, 50)}${newComment.length > 50 ? '...' : ''}"`
        }])

      setNewComment('')
      fetchComments()
      toast({
        title: 'Success',
        description: 'Comment added successfully!',
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: 'Error',
        description: 'Failed to add comment.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <MessageCircle className="h-5 w-5" />
            Comments - {sheetName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          <ScrollArea className="flex-1 max-h-96">
            <div className="space-y-4 pr-4">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No comments yet. Be the first to comment!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        {comment.user_name}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="border-t pt-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Write your comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] border-red-200 focus:border-red-400"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
