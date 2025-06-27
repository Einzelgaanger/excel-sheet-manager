
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, FileSpreadsheet, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface CreateSheetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateSheet: (data: { name: string; description: string; data: any[]; columns: string[] }) => void
}

export function CreateSheetDialog({ open, onOpenChange, onCreateSheet }: CreateSheetDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
      setFile(selectedFile)
      if (!name) {
        setName(selectedFile.name.replace('.csv', ''))
      }
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file.',
        variant: 'destructive',
      })
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const parseCSV = (csv: string): { data: any[]; columns: string[] } => {
    const lines = csv.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { data: [], columns: [] }

    const columns = lines[0].split(',').map(col => col.trim().replace(/"/g, ''))
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(val => val.trim().replace(/"/g, ''))
      const row: any = {}
      columns.forEach((col, index) => {
        row[col] = values[index] || ''
      })
      return row
    })

    return { data, columns }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the sheet.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      let sheetData: any[] = []
      let columns: string[] = []

      if (file) {
        const fileContent = await file.text()
        const parsed = parseCSV(fileContent)
        sheetData = parsed.data
        columns = parsed.columns
      } else {
        // Create empty sheet with sample structure
        columns = ['Column A', 'Column B', 'Column C']
        sheetData = [
          { 'Column A': 'Sample Data 1', 'Column B': 'Value 1', 'Column C': 'Info 1' },
          { 'Column A': 'Sample Data 2', 'Column B': 'Value 2', 'Column C': 'Info 2' },
        ]
      }

      await onCreateSheet({
        name: name.trim(),
        description: description.trim(),
        data: sheetData,
        columns,
      })

      // Reset form
      setName('')
      setDescription('')
      setFile(null)
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating sheet:', error)
      toast({
        title: 'Error',
        description: 'Failed to create sheet. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Create New Sheet</span>
          </DialogTitle>
          <DialogDescription>
            Add a new data sheet by uploading a CSV file or creating an empty sheet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Sheet Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter sheet name..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Source (Optional)</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-green-600" />
                  <p className="text-sm font-medium text-green-700">{file.name}</p>
                  <p className="text-xs text-gray-500">CSV file ready to upload</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFile(null)}
                  >
                    Remove File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drop a CSV file here or{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    Leave empty to create a blank sheet with sample data
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sheet
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
