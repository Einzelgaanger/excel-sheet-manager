import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArrowLeft, Download, ChevronDown, FileSpreadsheet, FileText, Image, File, Calendar, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
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

interface SheetViewerProps {
  sheet: Sheet
  onClose: () => void
  onUpdate: () => void
}

export function SheetViewer({ sheet, onClose, onUpdate }: SheetViewerProps) {
  const { profile } = useAuth()
  const [creatorName, setCreatorName] = useState<string>('')

  useEffect(() => {
    const fetchCreatorName = async () => {
      const { data: creator } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', sheet.created_by)
        .single()
      
      setCreatorName(creator?.full_name || creator?.email || 'Unknown')
    }
    fetchCreatorName()
  }, [sheet.created_by])

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

  const isSpreadsheet = sheet.file_type === 'text/csv' || 
                       sheet.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                       sheet.file_type === 'application/vnd.ms-excel'

  const isImage = sheet.file_type?.includes('image')
  const isPDF = sheet.file_type?.includes('pdf')

  const IconComponent = getFileIcon()

  const handleDownload = async (format: string) => {
    if (!profile?.can_download && !profile?.is_admin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to download files.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Log the download activity
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: profile.id,
          user_name: profile.full_name || profile.email,
          user_email: profile.email,
          action_type: 'download',
          sheet_id: sheet.id,
          sheet_name: sheet.name,
          details: `Downloaded as ${format.toUpperCase()}`
        }])

      if (format === 'csv') {
        const csvContent = convertToCSV(sheet.data, sheet.columns)
        downloadFile(csvContent, `${sheet.name}.csv`, 'text/csv')
      } else if (format === 'json') {
        const jsonContent = JSON.stringify(sheet.data, null, 2)
        downloadFile(jsonContent, `${sheet.name}.json`, 'application/json')
      } else if (format === 'xlsx') {
        // For Excel, we'll use a library like xlsx
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(sheet.data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
        XLSX.writeFile(wb, `${sheet.name}.xlsx`)
      }
      
      toast({
        title: 'Download Started',
        description: `${sheet.name} is being downloaded as ${format.toUpperCase()}.`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download Error',
        description: 'Failed to download the file. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const convertToCSV = (data: any[], columns: string[]) => {
    if (!data || !columns || data.length === 0) {
      return columns.join(',') + '\n'
    }

    const header = columns.join(',')
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col] || ''
        const stringValue = String(value)
        // Escape commas, quotes, and newlines in CSV
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
    return [header, ...rows].join('\n')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleDirectDownload = () => {
    if (!profile?.can_download && !profile?.is_admin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to download files.',
        variant: 'destructive',
      })
      return
    }

    if (isImage || isPDF) {
      // For images and PDFs, download the original file
      if (sheet.file_url) {
        const link = document.createElement('a')
        link.href = sheet.file_url
        link.download = sheet.name
        link.click()
      }
    } else {
      // For CSV, use the default CSV download
      handleDownload('csv')
    }
  }

  const downloadFormats = [
    { format: 'csv', label: 'CSV', icon: FileSpreadsheet },
    { format: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
    { format: 'json', label: 'JSON', icon: FileText },
  ]

  const renderContent = () => {
    if (isSpreadsheet) {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {sheet.columns.map((column: string) => (
                  <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sheet.data.map((row: any, index: number) => (
                <tr key={index}>
                  {sheet.columns.map((column: string) => (
                    <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (isImage && sheet.file_url) {
      return (
        <div className="flex justify-center">
          <img src={sheet.file_url} alt={sheet.name} className="max-w-full max-h-96 rounded-lg" />
        </div>
      )
    }

    if (isPDF && sheet.file_url) {
      return (
        <div className="flex justify-center">
          <embed
            src={sheet.file_url}
            type="application/pdf"
            width="100%"
            height="600px"
            className="rounded-lg"
          />
        </div>
      )
    }

    return <div className="text-gray-600">No preview available for this file type.</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      {/* Header */}
      <div className="bg-white border-b border-red-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="hover:bg-red-50 text-red-700 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-red-700 flex-shrink-0" />
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate" title={sheet.name}>
                      {sheet.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
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
            </div>

            {(profile?.can_download || profile?.is_admin) && (
              <div className="flex-shrink-0">
                {isSpreadsheet ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg text-sm px-3 sm:px-4">
                        <Download className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Download</span>
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      {downloadFormats.map(({ format, label, icon: Icon }) => (
                        <DropdownMenuItem
                          key={format}
                          onClick={() => handleDownload(format)}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    onClick={handleDirectDownload}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg text-sm px-3 sm:px-4"
                  >
                    <Download className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* File Info Card */}
        <Card className="mb-4 sm:mb-6 border-red-100">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">File Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-600">Created by:</span>
                <span className="font-medium truncate">{creatorName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-600">Updated:</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(sheet.updated_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            {sheet.description && (
              <div className="mt-3 sm:mt-4">
                <p className="text-gray-600 text-sm leading-relaxed">{sheet.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Content */}
        <Card className="border-red-100">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900">
              {isSpreadsheet ? 'Data Preview' : 'File Preview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
