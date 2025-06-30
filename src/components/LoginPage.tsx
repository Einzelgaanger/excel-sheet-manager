
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { FileSpreadsheet, Shield, Users, BarChart3 } from 'lucide-react'

export function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-red-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center sm:justify-start h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <img 
                src="/algumlogo.svg" 
                alt="Algum Africa Capital LLP" 
                className="h-8 w-auto sm:h-10"
              />
              <div className="text-center sm:text-left hidden sm:block">
                <p className="text-xs sm:text-sm text-gray-600">Data Management System</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent mb-3 sm:mb-4">
              Welcome to Algum Africa Capital
            </h2>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
              Secure data management platform for financial analytics and business intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
            {/* Login Card */}
            <Card className="border-2 border-red-100 shadow-xl bg-gradient-to-br from-white to-red-50">
              <CardHeader className="text-center pb-4 sm:pb-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Access Your Dashboard
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  Sign in with your Google account to access the data management system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 bg-red-50 p-3 rounded-lg">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span>Secure authentication with Google OAuth</span>
                </div>
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg py-3 text-sm sm:text-base"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card className="border-2 border-red-100 shadow-xl bg-gradient-to-br from-white to-yellow-50">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Platform Features
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  Comprehensive data management tools for your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <FileSpreadsheet className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Multi-Format Support</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Upload and view CSV, Excel, PDF, and image files</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Secure Access Control</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Role-based permissions and activity tracking</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Team Collaboration</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Comments and real-time data sharing</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <BarChart3 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Analytics Dashboard</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Comprehensive activity logs and insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Secure • Professional • Scalable
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
