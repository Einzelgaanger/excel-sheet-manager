
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, User, ChevronDown } from 'lucide-react'

export function Header() {
  const { profile, signOut } = useAuth()

  return (
    <header className="bg-white border-b border-red-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm sm:text-lg">A</span>
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent">
                Algum Africa Capital LLP
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Data Management System</p>
            </div>
          </div>

          {profile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-2 sm:px-3 py-2 hover:bg-red-50">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-red-100 text-red-700 text-xs sm:text-sm">
                      {profile.full_name?.[0] || profile.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900 max-w-32 truncate">
                      {profile.full_name || profile.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {profile.is_admin ? 'Admin' : profile.can_download ? 'Downloader' : 'Viewer'}
                    </span>
                  </div>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56">
                <DropdownMenuItem className="flex items-center gap-2 sm:hidden">
                  <User className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">
                      {profile.full_name || profile.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {profile.is_admin ? 'Admin' : profile.can_download ? 'Downloader' : 'Viewer'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
