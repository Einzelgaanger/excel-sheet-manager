
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { Database, FileSpreadsheet, Shield } from 'lucide-react'

export function LoginPage() {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Database className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Data Hub</h1>
          <p className="text-gray-600">Secure Excel sheet management platform</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in with your company Google account to access your data sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
              <div className="space-y-2">
                <Shield className="h-5 w-5 mx-auto text-blue-600" />
                <p>Admin Access</p>
              </div>
              <div className="space-y-2">
                <FileSpreadsheet className="h-5 w-5 mx-auto text-green-600" />
                <p>View Sheets</p>
              </div>
              <div className="space-y-2">
                <Database className="h-5 w-5 mx-auto text-purple-600" />
                <p>Download Data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Secured by enterprise-grade authentication
        </p>
      </div>
    </div>
  )
}
