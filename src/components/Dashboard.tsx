
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Header } from './Header'
import { SheetCard } from './SheetCard'
import { SheetViewer } from './SheetViewer'
import { FileUploadDialog } from './FileUploadDialog'
import { ActivityLogs } from './ActivityLogs'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Search, Plus, FileSpreadsheet, Activity } from 'lucide-react'
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Button
              onClick={() => setShowActivityLogs(false)}
              variant="outline"
              className="mb-4 border-red-200 text-red-700 hover:bg-red-50"
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
              Algum Africa Capital LLP
            </h2>
            <p className="text-lg font-medium text-red-700 mb-2">Data Management System</p>
            <p className="text-gray-600">
              {sheets.length} file{sheets.length !== 1 ? 's' : ''} available
              {profile && (
                <span className="ml-2 text-sm">
                  • Role: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {profile.is_admin ? 'Admin' : profile.can_download ? 'Viewer + Downloader' : 'Viewer'}
                  </Badge>
                </span>
              )}
            </p>
          </div>
          
          <div className="flex gap-2">
            {profile?.is_admin && (
              <>
                <Button
                  onClick={() => setShowActivityLogs(true)}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Activity Logs
                </Button>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-red-200 focus:border-red-400 focus:ring-red-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 animate-pulse shadow-md border border-red-100">
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
          <div className="text-center py-12">
            <FileSpreadsheet className="h-16 w-16 mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No files found' : 'No files available'}
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              {searchQuery 
                ? 'Try adjusting your search terms or clear the search to see all files.'
                : 'Get started by uploading your first file.'
              }
            </p>
            {!searchQuery && profile?.is_admin && (
              <Button
                onClick={() => setShowUploadDialog(true)}
                className="mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                onView={() => handleViewSheet(sheet)}
                onEdit={profile?.is_admin ? () => handleViewSheet(sheet) : undefined}
                onDownload={profile?.can_download || profile?.is_admin ? handleDownloadSheet : undefined}
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
    </div>
  )
}
