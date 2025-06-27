
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, Eye, Download, Edit, Calendar, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'

type Sheet = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  data: any
  columns: string[]
}

interface SheetCardProps {
  sheet: Sheet
  onView: (sheet: Sheet) => void
  onEdit?: (sheet: Sheet) => void
  onDownload: (sheet: Sheet) => void
}

export function SheetCard({ sheet, onView, onEdit, onDownload }: SheetCardProps) {
  const { profile } = useAuth()

  const rowCount = Array.isArray(sheet.data) ? sheet.data.length : 0
  const columnCount = sheet.columns?.length || 0

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-blue-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {sheet.name}
              </CardTitle>
              <CardDescription className="mt-1">
                {sheet.description || 'No description available'}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {rowCount} rows
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Updated {formatDistanceToNow(new Date(sheet.updated_at), { addSuffix: true })}</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>{columnCount} columns</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Button
            onClick={() => onView(sheet)}
            size="sm"
            variant="outline"
            className="flex-1 hover:bg-blue-50 hover:border-blue-300"
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>

          {profile?.can_download && (
            <Button
              onClick={() => onDownload(sheet)}
              size="sm"
              variant="outline"
              className="flex-1 hover:bg-green-50 hover:border-green-300"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}

          {profile?.is_admin && onEdit && (
            <Button
              onClick={() => onEdit(sheet)}
              size="sm"
              variant="outline"
              className="flex-1 hover:bg-orange-50 hover:border-orange-300"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
