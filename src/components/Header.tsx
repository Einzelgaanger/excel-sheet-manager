
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, FileSpreadsheet } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export function Header() {
  const { profile } = useAuth()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="bg-white shadow-sm border-b border-red-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-100 to-red-200 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-red-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Algum Africa Capital LLP
              </h1>
              <p className="text-sm text-red-600">Data Management System</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name || profile.email} />
                      <AvatarFallback className="bg-red-100 text-red-700">
                        {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white border-red-200" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">{profile.full_name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
                    <p className="text-xs text-red-600">
                      {profile.is_admin ? 'Administrator' : profile.can_download ? 'Viewer + Downloader' : 'Viewer'}
                    </p>
                  </div>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 hover:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
