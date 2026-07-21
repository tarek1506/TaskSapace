import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { setError('Please fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')

    const { error: err } = await signUp(email, password)
    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }

    // Update user metadata with name
    await supabase.auth.updateUser({ data: { name } })

    setLoading(false)
    navigate('/workspaces')
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 dark:bg-[#0f1117]">
      <div className="fixed top-20 right-20 w-72 h-72 bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-20 w-96 h-96 bg-violet-200/20 dark:bg-violet-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200 dark:shadow-violet-900/30 mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your account</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Get started with TaskSpace today</p>
        </div>

        <div className="glass-card rounded-3xl p-8 bg-white/80 dark:bg-gray-800/80 dark:border dark:border-gray-700 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-center">
                {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              leftIcon={<User size={15} />}
              id="signup-name"
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              leftIcon={<Mail size={15} />}
              id="signup-email"
              autoComplete="email"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
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
              id="signup-password"
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
              id="btn-signup"
            >
              Create Account
              <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-violet-600 font-medium hover:text-violet-700 transition-colors"
              id="link-login"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
