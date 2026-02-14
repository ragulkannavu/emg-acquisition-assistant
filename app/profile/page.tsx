'use client';

import { useAuth } from '@/lib/auth-context';
import { getUserProfile, saveUserProfile, type UserProfile } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, Save, Check } from 'lucide-react';

const ROLES = [
  'Student',
  'Researcher',
  'Professor',
  'Lab Technician',
  'Clinician',
  'Engineer',
  'Other',
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    role: '',
    institution: '',
    bio: '',
    email: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load profile from Firestore
  useEffect(() => {
    if (!user) return;
    setLoadingProfile(true);
    getUserProfile(user.uid)
      .then((data) => {
        if (data) {
          setProfile(data);
        } else {
          // Pre-fill from Google account
          setProfile({
            displayName: user.displayName || '',
            role: '',
            institution: '',
            bio: '',
            email: user.email || '',
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveUserProfile(user.uid, { ...profile, email: user.email || '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-16 flex justify-center">
          <Activity className="h-8 w-8 animate-pulse text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="items-center text-center">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="h-20 w-20 rounded-full border-2 border-border mb-2"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary mb-2">
                {profile.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <CardTitle className="text-xl">Your Profile</CardTitle>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </CardHeader>

          <CardContent>
            {loadingProfile ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading profile...</div>
            ) : (
              <div className="space-y-5">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    placeholder="Your name"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  />
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={profile.role}
                    onValueChange={(value) => setProfile({ ...profile, role: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Institution */}
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution / Organization</Label>
                  <Input
                    id="institution"
                    placeholder="e.g. MIT, Stanford, Company Name"
                    value={profile.institution}
                    onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself and your research..."
                    rows={3}
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  />
                </div>

                {/* Save button */}
                <Button
                  className="w-full gap-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved!
                    </>
                  ) : saving ? (
                    <>
                      <Activity className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
