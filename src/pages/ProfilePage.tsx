import { useState, useRef } from 'react'
import { Camera, Save, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { TopHeader } from '@/components/layout/Sidebar'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', user.id)

    if (error) {
      setError('Failed to save profile: ' + error.message)
    } else {
      setSuccess('Profile saved successfully!')
      setTimeout(() => setSuccess(''), 3000)
      await refreshProfile()
    }
    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB')
      return
    }

    setUploadingAvatar(true)
    setError('')

    try {
      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath])
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setAvatarUrl(urlData.publicUrl)
      setSuccess('Avatar updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
      await refreshProfile()
    } catch (err: any) {
      console.error('Avatar upload error:', err)
      setError(err.message || 'Failed to upload avatar')
    }

    setUploadingAvatar(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const hasChanges = profile && (
    fullName !== (profile.full_name || '') ||
    avatarUrl !== (profile.avatar_url || '')
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopHeader title="Profile" subtitle="Manage your account" />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-lg space-y-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar
                    email={user?.email || ''}
                    name={profile?.full_name || user?.email || ''}
                    src={avatarUrl}
                    size="lg"
                    className="w-24 h-24 text-2xl"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white shadow-lg transition-colors disabled:opacity-50"
                    title="Change avatar"
                  >
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={14} />
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-input"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Profile Photo</p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, or GIF. Max 2MB.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="mt-3 text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                  >
                    <Upload size={12} />
                    {avatarUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {success}
                </div>
              )}

              <Input
                label="Email"
                value={user?.email || ''}
                disabled
                id="profile-email"
              />

              <Input
                label="Display Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your display name"
                id="profile-name"
              />

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveProfile}
                loading={saving}
                disabled={!hasChanges || !fullName.trim()}
                id="btn-save-profile"
              >
                <Save size={14} />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">User ID</span>
                <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                  {user?.id?.slice(0, 8)}…
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Account created</span>
                <span className="text-sm text-gray-700">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Unknown'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
