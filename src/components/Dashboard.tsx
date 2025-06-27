
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Header } from './Header'
import { SheetCard } from './SheetCard'
import { SheetViewer } from './SheetViewer'
import { CreateSheetDialog } from './CreateSheetDialog'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { Search, Plus, FileSpreadsheet } from 'lucide-react'
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
}

export function Dashboard() {
  const { profile } = useAuth()
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [filteredSheets, setFilteredSheets] = useState<Sheet[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
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

  const handleCreateSheet = async (sheetData: { name: string; description: string; data: any[]; columns: string[] }) => {
    if (!profile?.id || !mounted) return

    try {
      console.log('Creating sheet with data:', sheetData)
      
      const { data, error } = await supabase
        .from('sheets')
        .insert([{
          name: sheetData.name,
          description: sheetData.description,
          data: sheetData.data,
          columns: sheetData.columns,
          created_by: profile.id
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      if (mounted) {
        console.log('Sheet created successfully:', data)
        setSheets(prev => [data, ...prev])
        toast({
          title: 'Success',
          description: 'Sheet created successfully!',
        })
      }
    } catch (error) {
      console.error('Error creating sheet:', error)
      if (mounted) {
        toast({
          title: 'Error',
          description: 'Failed to create sheet. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleDownloadSheet = (sheet: Sheet) => {
    if (!profile?.can_download && !profile?.is_admin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to download files.',
        variant: 'destructive',
      })
      return
    }

    try {
      const csvContent = convertToCSV(sheet.data, sheet.columns)
      downloadCSV(csvContent, `${sheet.name}.csv`)
      
      toast({
        title: 'Download Started',
        description: `${sheet.name} is being downloaded as CSV.`,
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

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Sheets</h2>
            <p className="mt-1 text-gray-600">
              {sheets.length} sheet{sheets.length !== 1 ? 's' : ''} available
              {profile && (
                <span className="ml-2 text-sm text-blue-600">
                  • Role: {profile.is_admin ? 'Admin' : profile.can_download ? 'Viewer + Downloader' : 'Viewer'}
                </span>
              )}
            </p>
          </div>
          
          {profile?.is_admin && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sheet
            </Button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search sheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                  <div className="h-8 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSheets.length === 0 ? (
          <div className="text-center py-12">
            <FileSpreadsheet className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No sheets found' : 'No sheets available'}
            </h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              {searchQuery 
                ? 'Try adjusting your search terms or clear the search to see all sheets.'
                : 'Get started by creating your first data sheet.'
              }
            </p>
            {!searchQuery && profile?.is_admin && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Sheet
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                onView={setSelectedSheet}
                onEdit={profile?.is_admin ? setSelectedSheet : undefined}
                onDownload={profile?.can_download || profile?.is_admin ? handleDownloadSheet : undefined}
              />
            ))}
          </div>
        )}
      </main>

      <CreateSheetDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateSheet={handleCreateSheet}
      />
    </div>
  )
}
