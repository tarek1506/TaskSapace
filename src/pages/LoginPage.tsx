import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError(err.message || 'Invalid email or password')
    } else {
      navigate('/workspaces')
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 dark:bg-[#0f1117]">
      {/* Decorative circles */}
      <div className="fixed top-20 left-20 w-72 h-72 bg-violet-200/30 dark:bg-violet-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-pink-200/20 dark:bg-pink-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200 dark:shadow-violet-900/30 mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to TaskSpace</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8 bg-white/80 dark:bg-gray-800/80 dark:border dark:border-gray-700 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-center">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              leftIcon={<Mail size={15} />}
              id="login-email"
              autoComplete="email"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock size={15} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
              id="login-password"
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              id="btn-login"
            >
              Sign In
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-violet-600 font-medium hover:text-violet-700 transition-colors"
              id="link-signup"
            >
              Create workspace
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          Connect your Supabase project to enable authentication
        </p>
      </div>
    </div>
  )
}
