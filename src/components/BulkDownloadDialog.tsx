
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Download, FileSpreadsheet, Calendar } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

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

type UserProfile = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  can_view: boolean
  can_download: boolean
}

interface BulkDownloadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheets: Sheet[]
  userProfile: UserProfile | null
}

export function BulkDownloadDialog({ open, onOpenChange, sheets, userProfile }: BulkDownloadDialogProps) {
  const [selectedSheets, setSelectedSheets] = useState<string[]>([])
  const [format, setFormat] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)

  const handleSheetToggle = (sheetId: string) => {
    setSelectedSheets(prev => 
      prev.includes(sheetId) 
        ? prev.filter(id => id !== sheetId)
        : [...prev, sheetId]
    )
  }

  const handleSelectAll = () => {
    if (selectedSheets.length === sheets.length) {
      setSelectedSheets([])
    } else {
      setSelectedSheets(sheets.map(sheet => sheet.id))
    }
  }

  const handleDownload = async () => {
    if (selectedSheets.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to download.',
        variant: 'destructive',
      })
      return
    }

    if (!format) {
      toast({
        title: 'No format selected',
        description: 'Please select a download format.',
        variant: 'destructive',
      })
      return
    }

    setIsDownloading(true)

    try {
      const selectedSheetData = sheets.filter(sheet => selectedSheets.includes(sheet.id))
      
      // Log the bulk download activity
      if (userProfile) {
        await supabase
          .from('activity_logs')
          .insert([{
            user_id: userProfile.id,
            user_name: userProfile.full_name || userProfile.email,
            user_email: userProfile.email,
            action_type: 'bulk_download',
            details: `Bulk downloaded ${selectedSheetData.length} files as ${format.toUpperCase()}: ${selectedSheetData.map(s => s.name).join(', ')}`
          }])
      }

      if (format === 'xlsx') {
        await downloadAsExcel(selectedSheetData)
      } else if (format === 'csv') {
        await downloadAsMultiCSV(selectedSheetData)
      } else if (format === 'json') {
        await downloadAsJSON(selectedSheetData)
      }

      toast({
        title: 'Download Started',
        description: `${selectedSheetData.length} files are being downloaded as ${format.toUpperCase()}.`,
      })

      // Reset selections and close dialog
      setSelectedSheets([])
      setFormat('')
      onOpenChange(false)

    } catch (error) {
      console.error('Bulk download error:', error)
      toast({
        title: 'Download Error',
        description: 'Failed to download the files. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const downloadAsExcel = async (sheetsData: Sheet[]) => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    sheetsData.forEach((sheet, index) => {
      const ws = XLSX.utils.json_to_sheet(sheet.data || [])
      // Ensure sheet name is valid for Excel (max 31 chars, no special chars)
      const sheetName = sheet.name.replace(/[\\\/\?\*\[\]]/g, '').substring(0, 31) || `Sheet${index + 1}`
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    XLSX.writeFile(wb, `bulk_download_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const downloadAsMultiCSV = async (sheetsData: Sheet[]) => {
    let combinedContent = ''
    
    sheetsData.forEach((sheet, index) => {
      if (index > 0) combinedContent += '\n\n'
      combinedContent += `=== ${sheet.name} ===\n`
      combinedContent += convertToCSV(sheet.data, sheet.columns)
    })

    downloadFile(combinedContent, `bulk_download_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
  }

  const downloadAsJSON = async (sheetsData: Sheet[]) => {
    const jsonData = sheetsData.reduce((acc, sheet) => {
      acc[sheet.name] = {
        data: sheet.data || [],
        columns: sheet.columns || [],
        metadata: {
          description: sheet.description,
          created_at: sheet.created_at,
          updated_at: sheet.updated_at,
          file_type: sheet.file_type
        }
      }
      return acc
    }, {} as Record<string, any>)

    const jsonContent = JSON.stringify(jsonData, null, 2)
    downloadFile(jsonContent, `bulk_download_${new Date().toISOString().split('T')[0]}.json`, 'application/json')
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

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-5 w-5 text-red-600" />
            Bulk Download Files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Download Format</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose format..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (.xlsx) - Single file with multiple sheets</SelectItem>
                <SelectItem value="csv">CSV (.csv) - Combined file with sections</SelectItem>
                <SelectItem value="json">JSON (.json) - Structured data format</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Files to Download</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedSheets.length === sheets.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2">
              {sheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="flex items-center space-x-3 p-3 rounded-md hover:bg-gray-50 border"
                >
                  <Checkbox
                    checked={selectedSheets.includes(sheet.id)}
                    onCheckedChange={() => handleSheetToggle(sheet.id)}
                  />
                  <FileSpreadsheet className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{sheet.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {sheet.file_type?.toUpperCase() || 'CSV'}
                      </Badge>
                    </div>
                    {sheet.description && (
                      <p className="text-xs text-gray-500 truncate">{sheet.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(sheet.updated_at).toLocaleDateString()}
                      </span>
                      <span>{formatFileSize(sheet.file_size)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedSheets.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>{selectedSheets.length}</strong> file{selectedSheets.length !== 1 ? 's' : ''} selected
                {format && (
                  <>
                    {' '}• Will be downloaded as <strong>{format.toUpperCase()}</strong>
                    {format === 'xlsx' && ' (single file with multiple sheets)'}
                    {format === 'csv' && ' (single file with separated sections)'}
                    {format === 'json' && ' (structured data format)'}
                  </>
                )}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDownloading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={selectedSheets.length === 0 || !format || isDownloading}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
