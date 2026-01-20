// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Mail, Phone, MapPin, Calendar, Edit3, Save, X, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { loadActivities, calculateStats, formatTimeAgo, formatActivityDescription, addActivity, removeActivity, Activity } from "@/lib/activity-tracker";
import { useDocuments, DocumentsProvider } from "@/components/documents-context";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  department: string;
  role: string;
  bio: string;
  avatar: string;
}

interface ActivityStats {
  documentsProcessed: number;
  queriesMade: number;
  daysActive: number;
  recentActivities: Activity[];
}

function ProfileContent() {
  const router = useRouter();
  const supabase = createClient();
  const { documents, recentQueries } = useDocuments();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<ProfileData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    documentsProcessed: 0,
    queriesMade: 0,
    daysActive: 0,
    recentActivities: []
  });
  const [expandedActivities, setExpandedActivities] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    location: "",
    joinDate: "",
    department: "",
    role: "",
    bio: "",
    avatar: "/placeholder-user.jpg"
  });

  // Load user data from Supabase
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) {
        router.push("/login");
        return;
      }

      const metadata = user.user_metadata || {};
      const createdAt = user.created_at ? new Date(user.created_at) : new Date();
      
      // Tambahkan cache buster pada avatar URL jika dari Supabase Storage
      let avatarUrl = metadata.avatar_url || "/placeholder-user.jpg";
      if (avatarUrl.startsWith('http') && avatarUrl.includes('supabase')) {
        avatarUrl = `${avatarUrl}?t=${Date.now()}`;
      }

      const data: ProfileData = {
        name: metadata.full_name || metadata.name || metadata.username || user.email?.split("@")[0] || "",
        email: user.email || "",
        phone: metadata.phone || "",
        location: metadata.location || "",
        joinDate: createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        department: metadata.department || "",
        role: metadata.role || "",
        bio: metadata.bio || "",
        avatar: avatarUrl
      };

      setProfileData(data);
      setOriginalData(data);
      setCurrentUserId(user.id);
      
      // Load activity stats
      const stats = calculateStats(user.id);
      setActivityStats(stats);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data profil");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Update activity stats ketika documents atau queries berubah
  useEffect(() => {
    if (!currentUserId) return;
    
    // Update stats dari aktivitas yang sudah tersimpan
    const stats = calculateStats(currentUserId);
    setActivityStats(stats);
  }, [documents, recentQueries, currentUserId]);

  // Handler untuk hapus aktivitas
  const handleRemoveActivity = (activityId: string) => {
    if (!currentUserId) return;
    
    removeActivity(currentUserId, activityId);
    
    // Update stats setelah hapus
    const stats = calculateStats(currentUserId);
    setActivityStats(stats);
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      setError(null);
      setUploadingAvatar(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User tidak ditemukan");

      // Validasi file
      if (!file.type.startsWith('image/')) {
        throw new Error("File harus berupa gambar");
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        throw new Error("Ukuran file maksimal 5MB");
      }

      // Preview sementara (tampilkan foto yang dipilih sebelum upload)
      const previewUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, avatar: previewUrl }));

      // Hapus foto lama jika ada (dari Supabase Storage)
      const oldAvatarUrl = profileData.avatar;
      if (oldAvatarUrl && oldAvatarUrl.startsWith('http') && oldAvatarUrl.includes('supabase')) {
        try {
          // Extract path dari URL untuk delete
          const urlParts = oldAvatarUrl.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('/');
            const bucket = pathParts[0];
            const filePath = pathParts.slice(1).join('/');
            await supabase.storage.from(bucket).remove([filePath]);
          }
        } catch (e) {
          console.warn("Gagal menghapus foto lama:", e);
          // Continue anyway, not critical
        }
      }

      // Upload foto baru ke Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
      const fileData = await file.arrayBuffer();

      // Coba upload ke berbagai bucket yang mungkin ada
      const bucketsToTry = ['avatars', 'documents', 'public'];
      let publicUrl: string | null = null;
      let lastError: any = null;

      for (const bucketName of bucketsToTry) {
        try {
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileData, {
              contentType: file.type,
              upsert: true
            });

          if (!uploadError) {
            // Berhasil upload, ambil public URL
            const { data } = supabase.storage
              .from(bucketName)
              .getPublicUrl(fileName);
            publicUrl = data.publicUrl;
            console.log("Upload berhasil ke bucket:", bucketName);
            console.log("Public URL:", publicUrl);
            break;
          } else {
            console.warn(`Upload gagal ke bucket ${bucketName}:`, uploadError);
            lastError = uploadError;
            // Jika error bukan "bucket not found", lanjutkan ke bucket berikutnya
            if (!uploadError.message?.includes('not found') && !uploadError.message?.includes('Bucket')) {
              // Error lain, coba bucket berikutnya
              continue;
            }
          }
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }

      // Jika semua bucket gagal
      if (!publicUrl) {
        const errorMsg = lastError?.message || "Unknown error";
        throw new Error(
          `Gagal upload foto: ${errorMsg}. ` +
          `Silakan buat bucket 'avatars' atau 'documents' di Supabase Storage. ` +
          `Buka Supabase Dashboard → Storage → New Bucket → Nama: 'avatars' → Public bucket: ON`
        );
      }

      // Tambahkan timestamp untuk bypass cache
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      
      // Update state dengan URL dari Supabase (dengan cache buster)
      setProfileData(prev => ({ ...prev, avatar: urlWithCache }));
      
      // Simpan ke metadata juga langsung (tanpa cache buster untuk storage)
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl
        }
      });

      if (updateError) {
        console.warn("Gagal update metadata:", updateError);
      }

      // Revoke preview URL setelah update state
      setTimeout(() => {
        URL.revokeObjectURL(previewUrl);
      }, 100);

      // Force re-render dengan delay kecil
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setSuccess("Foto profil berhasil diupload!");
      setTimeout(() => setSuccess(null), 3000);
      
      console.log("Avatar URL updated:", urlWithCache);
      
      return publicUrl;
    } catch (err: any) {
      const errorMsg = err.message || "Gagal upload foto";
      console.error("Error uploading avatar:", err);
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
      
      // Revert ke foto lama jika ada
      if (originalData) {
        setProfileData(prev => ({ ...prev, avatar: originalData.avatar }));
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User tidak ditemukan");

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.name,
          name: profileData.name,
          phone: profileData.phone,
          location: profileData.location,
          department: profileData.department,
          role: profileData.role,
          bio: profileData.bio,
          avatar_url: profileData.avatar
        }
      });

      if (updateError) throw updateError;

      setOriginalData({ ...profileData });
    setIsEditing(false);
      
      // Track activity
      if (currentUserId) {
        addActivity(currentUserId, 'profile_update', 'Updated profile information');
        const stats = calculateStats(currentUserId);
        setActivityStats(stats);
      }
      
      setSuccess("Profil berhasil diperbarui!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan profil");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setProfileData({ ...originalData });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-figma-auth">
      {/* Header */}
      <div className="border-b border-border bg-card/70 glass soft-shadow">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => router.back()}
              className="ring-ambient btn-gradient transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 hover:-translate-x-1 group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gradient">Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancel}
                  disabled={saving}
                  className="ring-ambient transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 active:scale-95 group"
                >
                  <X className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                  Cancel
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={handleSave}
                  disabled={saving}
                  className="ring-ambient btn-gradient transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:scale-110" />
                      Save
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                disabled={loading}
                className="ring-ambient btn-gradient transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 group"
              >
                <Edit3 className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-md px-4 py-3">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded-md px-4 py-3">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 glass soft-shadow">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24" key={profileData.avatar}>
                    <AvatarImage 
                      src={profileData.avatar} 
                      alt={profileData.name}
                      onError={(e) => {
                        console.error("Failed to load avatar image:", profileData.avatar);
                        // Fallback ke placeholder jika gambar gagal load
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-user.jpg";
                      }}
                    />
                    <AvatarFallback className="text-2xl">
                      {profileData.name
                        ? profileData.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  {isEditing && !uploadingAvatar && (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="avatar-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            await handleAvatarUpload(file);
                          }
                          // Reset input agar bisa upload file yang sama lagi
                          e.target.value = '';
                        }}
                      />
                      <label htmlFor="avatar-upload">
                    <Button
                          type="button"
                      size="sm"
                          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full btn-gradient cursor-pointer"
                          asChild
                    >
                          <span>
                      <Camera className="h-4 w-4" />
                          </span>
                    </Button>
                      </label>
                    </>
                  )}
                </div>
                
                <div className="space-y-2 w-full">
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full text-2xl font-bold text-center bg-background border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nama lengkap"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gradient">{profileData.name || "No name"}</h2>
                  )}
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.role}
                      onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                      className="w-full text-sm text-center bg-background border border-border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Jabatan"
                    />
                  ) : (
                  <Badge variant="secondary" className="text-sm">
                      {profileData.role || "No role"}
                  </Badge>
                  )}
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                      className="w-full text-sm text-center text-muted-foreground bg-background border border-border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Departemen"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{profileData.department || "No department"}</p>
                  )}
                </div>

                <div className="w-full space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="email"
                        value={profileData.email}
                        disabled
                        className="flex-1 bg-muted/50 border border-border rounded-md px-2 py-1 text-sm cursor-not-allowed"
                      />
                    ) : (
                      <span className="break-all">{profileData.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Nomor telepon"
                      />
                    ) : (
                      <span>{profileData.phone || "No phone"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                        className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Lokasi"
                      />
                    ) : (
                      <span>{profileData.location || "No location"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Joined {profileData.joinDate}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio Section */}
            <Card className="p-6 glass soft-shadow">
              <h3 className="text-lg font-semibold mb-4 text-gradient">About</h3>
              {isEditing ? (
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                  className="w-full h-32 p-3 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-muted-foreground leading-relaxed">
                  {profileData.bio || "No bio available. Click 'Edit Profile' to add one."}
                </p>
              )}
            </Card>

            {/* Activity Stats */}
            <Card className="p-6 glass soft-shadow">
              <h3 className="text-lg font-semibold mb-4 text-gradient">Activity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                  <div className="text-2xl font-bold text-gradient">{activityStats.documentsProcessed}</div>
                  <div className="text-sm text-muted-foreground">Documents Processed</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-teal-500/10">
                  <div className="text-2xl font-bold text-gradient">{activityStats.queriesMade}</div>
                  <div className="text-sm text-muted-foreground">Queries Made</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10">
                  <div className="text-2xl font-bold text-gradient">{activityStats.daysActive}</div>
                  <div className="text-sm text-muted-foreground">Days Active</div>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6 glass soft-shadow">
              <h3 className="text-lg font-semibold mb-4 text-gradient">Recent Activity</h3>
              <div className="space-y-3">
                {activityStats.recentActivities.length > 0 ? (
                  <>
                    {/* Tampilkan 5 pertama */}
                    {activityStats.recentActivities.slice(0, 5).map((activity) => {
                      const color = 
                        activity.type === 'document_upload' ? 'bg-green-500' :
                        activity.type === 'query' ? 'bg-blue-500' :
                        'bg-purple-500';
                      return (
                        <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors">
                          <div className={`h-2 w-2 rounded-full ${color}`}></div>
                  <div className="flex-1">
                            <p className="text-sm font-medium">{formatActivityDescription(activity)}</p>
                            <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveActivity(activity.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                            title="Hapus aktivitas"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                  </div>
                      );
                    })}
                    
                    {/* Divider untuk expand/collapse jika lebih dari 5 */}
                    {activityStats.recentActivities.length > 5 && (
                      <>
                        <div 
                          onClick={() => setExpandedActivities(!expandedActivities)}
                          className="flex items-center justify-center gap-2 py-3 cursor-pointer hover:bg-muted/30 rounded-lg transition-colors border-t border-b border-border"
                        >
                          <span className="text-xs text-muted-foreground">
                            {expandedActivities ? 'Tampilkan lebih sedikit' : `Tampilkan ${activityStats.recentActivities.length - 5} aktivitas lainnya`}
                          </span>
                          {expandedActivities ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                </div>
                        
                        {/* Aktivitas tambahan (expandable) */}
                        {expandedActivities && activityStats.recentActivities.slice(5).map((activity) => {
                          const color = 
                            activity.type === 'document_upload' ? 'bg-green-500' :
                            activity.type === 'query' ? 'bg-blue-500' :
                            'bg-purple-500';
                          return (
                            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 group hover:bg-muted/50 transition-colors">
                              <div className={`h-2 w-2 rounded-full ${color}`}></div>
                  <div className="flex-1">
                                <p className="text-sm font-medium">{formatActivityDescription(activity)}</p>
                                <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                              <button
                                onClick={() => handleRemoveActivity(activity.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                                title="Hapus aktivitas"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                </div>
                          );
                        })}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No activity yet. Start by uploading a document or asking a query!</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <DocumentsProvider>
      <ProfileContent />
    </DocumentsProvider>
  );
}
