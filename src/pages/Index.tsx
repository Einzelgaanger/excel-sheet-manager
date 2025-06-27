
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/components/LoginPage'
import { Dashboard } from '@/components/Dashboard'

const Index = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <Dashboard /> : <LoginPage />
}

export default Index
