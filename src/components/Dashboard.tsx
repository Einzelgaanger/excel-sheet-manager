
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Header } from './Header'
import { SheetCard } from './SheetCard'
import { SheetViewer } from './SheetViewer'
import { FileUploadDialog } from './FileUploadDialog'
import { ActivityLogs } from './ActivityLogs'
import { BulkDownloadDialog } from './BulkDownloadDialog'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Search, Plus, FileSpreadsheet, Activity, Download } from 'lucide-react'
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

export function Dashboard() {
  const { profile } = useAuth()
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [filteredSheets, setFilteredSheets] = useState<Sheet[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showBulkDownloadDialog, setShowBulkDownloadDialog] = useState(false)
  const [showActivityLogs, setShowActivityLogs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(true)

  const fetchSheets = useCallback(async () => {
    if (!mounted) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sheets')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      if (mounted) {
        console.log('Fetched sheets:', data)
        setSheets(data || [])
      }
    } catch (error) {
      console.error('Error fetching sheets:', error)
      if (mounted) {
        toast({
          title: 'Error',
          description: 'Failed to load sheets. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      if (mounted) {
        setLoading(false)
      }
    }
  }, [mounted])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (profile && mounted) {
      fetchSheets()
    }
  }, [profile, fetchSheets, mounted])

  useEffect(() => {
    // Filter sheets based on search query
    const filtered = sheets.filter(sheet =>
      sheet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sheet.description && sheet.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    setFilteredSheets(filtered)
  }, [sheets, searchQuery])

  const handleViewSheet = async (sheet: Sheet) => {
    if (profile) {
      // Log the view activity
      await supabase
        .from('activity_logs')
        .insert([{
          user_id: profile.id,
          user_name: profile.full_name || profile.email,
          user_email: profile.email,
          action_type: 'view',
          sheet_id: sheet.id,
          sheet_name: sheet.name,
          details: `Viewed sheet: ${sheet.name}`
        }])
    }
    setSelectedSheet(sheet)
  }

  const handleDownloadSheet = async (sheet: Sheet, format: string = 'csv') => {
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

  // Show activity logs for admins
  if (showActivityLogs) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
        <Header />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
          <div className="mb-4 sm:mb-6">
            <Button
              onClick={() => setShowActivityLogs(false)}
              variant="outline"
              className="mb-4 border-red-200 text-red-700 hover:bg-red-50 text-sm"
            >
              ← Back to Dashboard
            </Button>
          </div>
          <ActivityLogs />
        </main>
      </div>
    )
  }

  // Show selected sheet viewer
  if (selectedSheet) {
    return (
      <SheetViewer
        sheet={selectedSheet}
        onClose={() => setSelectedSheet(null)}
        onUpdate={fetchSheets}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
              Data Management System
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-600 mt-2">
              <span className="text-sm sm:text-base">
                {sheets.length} file{sheets.length !== 1 ? 's' : ''} available
              </span>
              {profile && (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-sm">•</span>
                  <span className="text-xs sm:text-sm">Role:</span>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                    {profile.is_admin ? 'Admin' : profile.can_download ? 'Viewer + Downloader' : 'Viewer'}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {(profile?.can_download || profile?.is_admin) && sheets.length > 0 && (
              <Button
                onClick={() => setShowBulkDownloadDialog(true)}
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50 text-sm w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Bulk Download</span>
                <span className="hidden sm:inline">Bulk Download</span>
              </Button>
            )}
            {profile?.is_admin && (
              <>
                <Button
                  onClick={() => setShowActivityLogs(true)}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 text-sm w-full sm:w-auto"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Activity</span>
                  <span className="hidden sm:inline">Activity Logs</span>
                </Button>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg text-sm w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Upload</span>
                  <span className="hidden sm:inline">Upload File</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="relative max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-red-200 focus:border-red-400 focus:ring-red-200 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 sm:p-6 animate-pulse shadow-md border border-red-100 aspect-[4/3]">
                <div className="h-4 bg-red-100 rounded mb-2"></div>
                <div className="h-3 bg-red-100 rounded mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-red-100 rounded flex-1"></div>
                  <div className="h-8 bg-red-100 rounded flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <FileSpreadsheet className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-red-400 mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No files found' : 'No files available'}
            </h3>
            <p className="text-gray-600 text-sm sm:text-base max-w-sm mx-auto mb-4">
              {searchQuery 
                ? 'Try adjusting your search terms or clear the search to see all files.'
                : 'Get started by uploading your first file.'
              }
            </p>
            {!searchQuery && profile?.is_admin && (
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredSheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                onView={() => handleViewSheet(sheet)}
                onEdit={profile?.is_admin ? () => handleViewSheet(sheet) : undefined}
                onDownload={handleDownloadSheet}
              />
            ))}
          </div>
        )}
      </main>

      <FileUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={fetchSheets}
      />

      <BulkDownloadDialog
        open={showBulkDownloadDialog}
        onOpenChange={setShowBulkDownloadDialog}
        sheets={sheets}
        userProfile={profile}
      />
    </div>
  )
}
