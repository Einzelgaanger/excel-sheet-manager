
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { FileSpreadsheet, Eye, Download, Edit, Calendar, User, MessageCircle, ChevronDown, File, Image, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { CommentsDialog } from './CommentsDialog'
import { toast } from '@/hooks/use-toast'

type Sheet = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  data: any
  columns: string[]
  file_type: string
  file_url: string | null
  file_size: number | null
}

interface SheetCardProps {
  sheet: Sheet
  onView: (sheet: Sheet) => void
  onEdit?: (sheet: Sheet) => void
  onDownload: (sheet: Sheet, format: string) => void
}

export function SheetCard({ sheet, onView, onEdit, onDownload }: SheetCardProps) {
  const { profile } = useAuth()
  const [showComments, setShowComments] = useState(false)
  const [commentsCount, setCommentsCount] = useState(0)
  const [creatorName, setCreatorName] = useState<string>('')

  // Fetch comments count and creator name
  useState(() => {
    const fetchData = async () => {
      // Get comments count
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('sheet_id', sheet.id)
      
      setCommentsCount(count || 0)

      // Get creator name
      const { data: creator } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', sheet.created_by)
        .single()
      
      setCreatorName(creator?.full_name || creator?.email || 'Unknown')
    }
    fetchData()
  })

  const getFileIcon = () => {
    if (sheet.file_type?.includes('image')) return Image
    if (sheet.file_type?.includes('pdf')) return FileText
    if (sheet.file_type?.includes('spreadsheet') || sheet.file_type?.includes('csv')) return FileSpreadsheet
    return File
  }

  const getFileTypeLabel = () => {
    if (sheet.file_type?.includes('csv')) return 'CSV'
    if (sheet.file_type?.includes('spreadsheet')) return 'Excel'
    if (sheet.file_type?.includes('pdf')) return 'PDF'
    if (sheet.file_type?.includes('image')) return 'Image'
    if (sheet.file_type?.includes('text')) return 'Text'
    if (sheet.file_type?.includes('json')) return 'JSON'
    return 'File'
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const downloadFormats = [
    { format: 'csv', label: 'CSV', icon: FileSpreadsheet },
    { format: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
    { format: 'json', label: 'JSON', icon: FileText },
  ]

  const truncateTitle = (title: string, maxLength: number = 40) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  const IconComponent = getFileIcon()

  return (
    <>
      <Card className="group hover:shadow-xl transition-all duration-300 border-2 border-red-100 hover:border-red-300 bg-gradient-to-br from-white to-red-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 rounded-xl group-hover:from-red-200 group-hover:to-red-300 transition-colors">
                <IconComponent className="h-6 w-6 text-red-700" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle 
                  className="text-lg font-semibold text-gray-900 group-hover:text-red-700 transition-colors leading-tight"
                  title={sheet.name}
                >
                  {truncateTitle(sheet.name)}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                    {getFileTypeLabel()}
                  </Badge>
                  {sheet.file_size && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                      {formatFileSize(sheet.file_size)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="h-4 w-4" />
              <span className="truncate max-w-24" title={creatorName}>
                {creatorName}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">
                {formatDistanceToNow(new Date(sheet.updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={() => setShowComments(true)}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">{commentsCount}</span>
            </Button>
            
            <div className="flex items-center space-x-1">
              <Button
                onClick={() => onView(sheet)}
                size="sm"
                variant="outline"
                className="hover:bg-red-50 hover:border-red-300 hover:text-red-700 border-red-200"
              >
                <Eye className="h-4 w-4 mr-1" />
                <span className="text-xs">View</span>
              </Button>

              {(profile?.can_download || profile?.is_admin) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="hover:bg-green-50 hover:border-green-300 hover:text-green-700 border-green-200"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    {downloadFormats.map(({ format, label, icon: Icon }) => (
                      <DropdownMenuItem
                        key={format}
                        onClick={() => onDownload(sheet, format)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {profile?.is_admin && onEdit && (
                <Button
                  onClick={() => onEdit(sheet)}
                  size="sm"
                  variant="outline"
                  className="hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 border-orange-200"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  <span className="text-xs">Edit</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CommentsDialog
        open={showComments}
        onOpenChange={setShowComments}
        sheetId={sheet.id}
        sheetName={sheet.name}
      />
    </>
  )
}
