
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Save, X, Plus, Trash2, Search, Download } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Header } from './Header'

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
  const [data, setData] = useState<any[]>(sheet.data || [])
  const [columns, setColumns] = useState<string[]>(sheet.columns || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredData, setFilteredData] = useState<any[]>(data)
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddRowDialog, setShowAddRowDialog] = useState(false)
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [saving, setSaving] = useState(false)

  const isSpreadsheet = sheet.file_type === 'text/csv' || 
                       sheet.file_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                       sheet.file_type === 'application/vnd.ms-excel'
  
  const isImage = sheet.file_type?.includes('image')
  const isPDF = sheet.file_type?.includes('pdf')

  useEffect(() => {
    // Filter data based on search query
    if (!searchQuery) {
      setFilteredData(data)
    } else {
      const filtered = data.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
      setFilteredData(filtered)
    }
  }, [data, searchQuery])

  const handleCellEdit = (rowIndex: number, column: string, value: any) => {
    if (!profile?.is_admin) return
    setEditingCell({ row: rowIndex, col: column })
    setEditValue(String(value || ''))
  }

  const handleSaveCell = () => {
    if (editingCell) {
      const newData = [...data]
      newData[editingCell.row][editingCell.col] = editValue
      setData(newData)
      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleAddRow = () => {
    const newRow: any = {}
    columns.forEach(col => {
      newRow[col] = ''
    })
    setData([...data, newRow])
    setShowAddRowDialog(false)
  }

  const handleDeleteRow = (rowIndex: number) => {
    if (!profile?.is_admin) return
    const newData = data.filter((_, index) => index !== rowIndex)
    setData(newData)
  }

  const handleAddColumn = () => {
    if (!profile?.is_admin) return
    if (newColumnName.trim() && !columns.includes(newColumnName.trim())) {
      const newColumns = [...columns, newColumnName.trim()]
      const newData = data.map(row => ({
        ...row,
        [newColumnName.trim()]: ''
      }))
      setColumns(newColumns)
      setData(newData)
      setNewColumnName('')
      setShowAddColumnDialog(false)
    }
  }

  const handleDeleteColumn = (columnToDelete: string) => {
    if (!profile?.is_admin) return
    const newColumns = columns.filter(col => col !== columnToDelete)
    const newData = data.map(row => {
      const { [columnToDelete]: deleted, ...rest } = row
      return rest
    })
    setColumns(newColumns)
    setData(newData)
  }

  const handleSave = async () => {
    if (!profile?.is_admin) return
    setSaving(true)
    try {
      console.log('Saving sheet data:', { data, columns })
      
      const { error } = await supabase
        .from('sheets')
        .update({
          data,
          columns,
          updated_at: new Date().toISOString()
        })
        .eq('id', sheet.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Sheet updated successfully!',
      })
      onUpdate()
    } catch (error) {
      console.error('Error saving sheet:', error)
      toast({
        title: 'Error',
        description: 'Failed to save changes. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = () => {
    if (!profile?.can_download && !profile?.is_admin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to download files.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (isImage || isPDF) {
        // For images and PDFs, download the original file
        if (sheet.file_url) {
          const link = document.createElement('a')
          link.href = sheet.file_url
          link.download = sheet.name
          link.click()
          
          toast({
            title: 'Download Started',
            description: `${sheet.name} is being downloaded.`,
          })
        }
      } else if (isSpreadsheet) {
        // For CSV files, download as CSV
        const csvContent = convertToCSV(data, columns)
        downloadCSV(csvContent, `${sheet.name}.csv`)
        
        toast({
          title: 'Download Started',
          description: `${sheet.name} is being downloaded as CSV.`,
        })
      }
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Download Error',
        description: 'Failed to download the file. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const renderFileContent = () => {
    if (isImage && sheet.file_url) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <img 
              src={sheet.file_url} 
              alt={sheet.name}
              className="max-w-full max-h-96 mx-auto rounded-lg shadow-md"
            />
          </div>
        </div>
      )
    }

    if (isPDF && sheet.file_url) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center space-y-4">
            <iframe 
              src={sheet.file_url}
              className="w-full h-96 border rounded-lg"
              title={sheet.name}
            />
            <p className="text-sm text-gray-600">
              PDF Preview - <a href={sheet.file_url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Open in new tab</a>
            </p>
          </div>
        </div>
      )
    }

    if (isSpreadsheet) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span title={column}>{column.length > 20 ? `${column.substring(0, 20)}...` : column}</span>
                        {profile?.is_admin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            onClick={() => handleDeleteColumn(column)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                  {profile?.is_admin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingCell?.row === rowIndex && editingCell?.col === column ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSaveCell}>
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`${
                              profile?.is_admin ? 'cursor-pointer hover:bg-gray-100 p-2 rounded' : ''
                            }`}
                            onClick={() => 
                              profile?.is_admin && handleCellEdit(rowIndex, column, row[column])
                            }
                            title={String(row[column] || '')}
                          >
                            {String(row[column] || '').length > 50 
                              ? `${String(row[column] || '').substring(0, 50)}...`
                              : String(row[column] || '') || '—'
                            }
                          </div>
                        )}
                      </td>
                    ))}
                    {profile?.is_admin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Preview not available for this file type.</p>
          {sheet.file_url && (
            <a 
              href={sheet.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-red-600 hover:underline mt-2 inline-block"
            >
              Download to view file
            </a>
          )}
        </div>
      </div>
    )
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {(profile?.can_download || profile?.is_admin) && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              
              {profile?.is_admin && isSpreadsheet && (
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* File Details Header */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{sheet.name}</h1>
          {sheet.description && (
            <p className="text-gray-600 mb-4">{sheet.description}</p>
          )}
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            {isSpreadsheet && (
              <>
                <span>{data.length} rows</span>
                <span>{columns.length} columns</span>
              </>
            )}
            <span>File size: {sheet.file_size ? `${(sheet.file_size / 1024).toFixed(1)} KB` : 'Unknown'}</span>
            {profile && (
              <span>
                Role: {profile.is_admin ? 'Admin' : profile.can_download ? 'Viewer + Downloader' : 'Viewer'}
              </span>
            )}
          </div>
        </div>

        {isSpreadsheet && (
          <div className="mb-6 flex items-center justify-between">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search data..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {profile?.is_admin && (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddColumnDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddRowDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </Button>
              </div>
            )}
          </div>
        )}

        {renderFileContent()}

        {isSpreadsheet && filteredData.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <p className="text-gray-500">No data found matching your search.</p>
          </div>
        )}

        {isSpreadsheet && data.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No data available. {profile?.is_admin ? 'Add some rows to get started.' : ''}</p>
          </div>
        )}
      </div>

      {/* Add Row Dialog */}
      <Dialog open={showAddRowDialog} onOpenChange={setShowAddRowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Row</DialogTitle>
            <DialogDescription>
              A new empty row will be added to the sheet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRow}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Enter a name for the new column.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="columnName">Column Name</Label>
              <Input
                id="columnName"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Enter column name..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
