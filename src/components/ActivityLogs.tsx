
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Activity, Search, Download, Eye, Upload, Edit, MessageCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

type ActivityLog = {
  id: string
  user_name: string
  user_email: string
  action_type: string
  sheet_name: string | null
  details: string | null
  created_at: string
}

export function ActivityLogs() {
  const { profile } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedAction, setSelectedAction] = useState<string>('all')

  useEffect(() => {
    if (profile?.is_admin) {
      fetchLogs()
    }
  }, [profile])

  useEffect(() => {
    filterLogs()
  }, [logs, searchQuery, selectedAction])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching activity logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load activity logs.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = logs

    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action_type === selectedAction)
    }

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.sheet_name && log.sheet_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setFilteredLogs(filtered)
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'view':
        return <Eye className="h-4 w-4" />
      case 'download':
        return <Download className="h-4 w-4" />
      case 'upload':
        return <Upload className="h-4 w-4" />
      case 'edit':
        return <Edit className="h-4 w-4" />
      case 'comment':
        return <MessageCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getActionBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'view':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'download':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'upload':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'edit':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'comment':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (!profile?.is_admin) {
    return (
      <div className="text-center py-12">
        <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">Only administrators can view activity logs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-red-700">Activity Logs</h2>
          <p className="text-gray-600">Monitor all user activities and system events</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-red-200 focus:border-red-400"
          />
        </div>
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-2 border border-red-200 rounded-md focus:border-red-400 focus:outline-none"
        >
          <option value="all">All Actions</option>
          <option value="view">Views</option>
          <option value="download">Downloads</option>
          <option value="upload">Uploads</option>
          <option value="edit">Edits</option>
          <option value="comment">Comments</option>
        </select>
      </div>

      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity ({filteredLogs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading activity logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No activity logs found.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getActionBadgeColor(log.action_type)}`}>
                          {getActionIcon(log.action_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {log.user_name}
                            </Badge>
                            <Badge className={getActionBadgeColor(log.action_type)}>
                              {log.action_type.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{log.user_email}</p>
                          {log.sheet_name && (
                            <p className="text-sm font-medium text-gray-900">
                              Sheet: {log.sheet_name}
                            </p>
                          )}
                          {log.details && (
                            <p className="text-sm text-gray-700 mt-1">{log.details}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
