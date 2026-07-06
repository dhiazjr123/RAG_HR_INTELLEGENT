// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Camera, Mail, Phone, MapPin, Calendar, Edit3, Save, X, Loader2, 
  Trash2, ChevronDown, ChevronUp, Plus, Check, Shield, Award, Activity as ActivityIcon, Sparkles
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { loadActivities, calculateStats, formatTimeAgo, formatActivityDescription, addActivity, removeActivity, Activity } from "@/lib/activity-tracker";
import { useDocuments, DocumentsProvider } from "@/components/documents-context";
import { cn } from "@/lib/utils";

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
  skills: string[];
  accent: "blue" | "emerald" | "violet" | "amber";
  avatarFrame: "none" | "gradient" | "neon-blue" | "neon-gold";
}

interface ActivityStats {
  documentsProcessed: number;
  queriesMade: number;
  daysActive: number;
  recentActivities: Activity[];
}

const ACCENT_COLORS = {
  blue: {
    name: "Classic Blue",
    gradient: "from-blue-500 to-indigo-500",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    hoverBorder: "hover:border-blue-500/40",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
    bullet: "bg-blue-500",
    btn: "bg-blue-600 hover:bg-blue-500",
  },
  emerald: {
    name: "Forest Emerald",
    gradient: "from-emerald-500 to-teal-500",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    hoverBorder: "hover:border-emerald-500/40",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    bullet: "bg-emerald-500",
    btn: "bg-emerald-600 hover:bg-emerald-500",
  },
  violet: {
    name: "Mystic Violet",
    gradient: "from-violet-500 to-fuchsia-500",
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    hoverBorder: "hover:border-violet-500/40",
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.15)]",
    bullet: "bg-violet-500",
    btn: "bg-violet-600 hover:bg-violet-500",
  },
  amber: {
    name: "Sunfire Amber",
    gradient: "from-amber-500 to-orange-500",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    hoverBorder: "hover:border-amber-500/40",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    bullet: "bg-amber-500",
    btn: "bg-amber-600 hover:bg-amber-500",
  },
};

const AVATAR_FRAMES = {
  none: {
    name: "No Frame",
    class: "p-0 rounded-full",
  },
  gradient: {
    name: "Cosmic Gradient",
    class: "p-[3px] bg-gradient-to-tr from-violet-500 via-blue-500 to-emerald-500 rounded-full shadow-lg shadow-blue-500/20",
  },
  "neon-blue": {
    name: "Neon Cyber",
    class: "p-[3px] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)] rounded-full animate-pulse",
  },
  "neon-gold": {
    name: "Neon Golden Star",
    class: "p-[3px] bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] rounded-full animate-pulse",
  },
};

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
  const [newSkill, setNewSkill] = useState("");
  
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
    avatar: "/placeholder-user.jpg",
    skills: ["HR Management", "CV Screening", "RAG Systems", "AI Recruiting"],
    accent: "blue",
    avatarFrame: "gradient"
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
      
      let avatarUrl = metadata.avatar_url || "/placeholder-user.jpg";
      if (avatarUrl.startsWith('http') && avatarUrl.includes('supabase')) {
        avatarUrl = `${avatarUrl}?t=${Date.now()}`;
      }

      const rawSkills = metadata.skills;
      const skillsArray = Array.isArray(rawSkills) 
        ? rawSkills 
        : ["HR Management", "CV Screening", "RAG Systems", "AI Recruiting"];

      const data: ProfileData = {
        name: metadata.full_name || metadata.name || metadata.username || user.email?.split("@")[0] || "",
        email: user.email || "",
        phone: metadata.phone || "",
        location: metadata.location || "",
        joinDate: createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        department: metadata.department || "",
        role: metadata.role || "",
        bio: metadata.bio || "",
        avatar: avatarUrl,
        skills: skillsArray,
        accent: (metadata.accent as ProfileData["accent"]) || "blue",
        avatarFrame: (metadata.avatar_frame as ProfileData["avatarFrame"]) || "gradient"
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
    const stats = calculateStats(currentUserId);
    setActivityStats(stats);
  }, [documents, recentQueries, currentUserId]);

  // Handler untuk hapus aktivitas
  const handleRemoveActivity = (activityId: string) => {
    if (!currentUserId) return;
    removeActivity(currentUserId, activityId);
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

      if (!file.type.startsWith('image/')) {
        throw new Error("File harus berupa gambar");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file maksimal 5MB");
      }

      const previewUrl = URL.createObjectURL(file);
      setProfileData(prev => ({ ...prev, avatar: previewUrl }));

      const oldAvatarUrl = profileData.avatar;
      if (oldAvatarUrl && oldAvatarUrl.startsWith('http') && oldAvatarUrl.includes('supabase')) {
        try {
          const urlParts = oldAvatarUrl.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const pathParts = urlParts[1].split('/');
            const bucket = pathParts[0];
            const filePath = pathParts.slice(1).join('/');
            await supabase.storage.from(bucket).remove([filePath]);
          }
        } catch (e) {
          console.warn("Gagal menghapus foto lama:", e);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
      const fileData = await file.arrayBuffer();

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
            const { data } = supabase.storage
              .from(bucketName)
              .getPublicUrl(fileName);
            publicUrl = data.publicUrl;
            break;
          } else {
            lastError = uploadError;
            continue;
          }
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }

      if (!publicUrl) {
        const errorMsg = lastError?.message || "Unknown error";
        throw new Error(
          `Gagal upload foto: ${errorMsg}. ` +
          `Silakan buat bucket 'avatars' atau 'documents' di Supabase Storage.`
        );
      }

      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      setProfileData(prev => ({ ...prev, avatar: urlWithCache }));
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl
        }
      });

      if (updateError) {
        console.warn("Gagal update metadata:", updateError);
      }

      setTimeout(() => {
        URL.revokeObjectURL(previewUrl);
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 100));
      setSuccess("Foto profil berhasil diupload!");
      setTimeout(() => setSuccess(null), 3000);
      return publicUrl;
    } catch (err: any) {
      const errorMsg = err.message || "Gagal upload foto";
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
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
          avatar_url: profileData.avatar,
          skills: profileData.skills,
          accent: profileData.accent,
          avatar_frame: profileData.avatarFrame,
        }
      });

      if (updateError) throw updateError;

      setOriginalData({ ...profileData });
      setIsEditing(false);
      
      if (currentUserId) {
        addActivity(currentUserId, 'profile_update', 'Memperbarui informasi profil pengguna');
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
    setNewSkill("");
  };

  const handleAddSkill = () => {
    const s = newSkill.trim();
    if (!s) return;
    if (profileData.skills.includes(s)) return;
    setProfileData(prev => ({
      ...prev,
      skills: [...prev.skills, s]
    }));
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const activeAccent = ACCENT_COLORS[profileData.accent] || ACCENT_COLORS.blue;
  const activeFrame = AVATAR_FRAMES[profileData.avatarFrame] || AVATAR_FRAMES.none;

  return (
    <div className="min-h-screen bg-figma-auth relative overflow-hidden pb-12">
      {/* Decorative Glow Orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-border bg-card/70 glass soft-shadow sticky top-0 z-[70]">
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
            <h1 className="text-xl font-semibold text-gradient">Profile Settings</h1>
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
                      Save Changes
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

      <div className="container mx-auto px-6 py-8 relative">
        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 text-sm text-red-500 border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3.5 flex items-center gap-2 animate-bounce">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 text-sm text-emerald-500 border border-emerald-500/30 bg-emerald-500/10 rounded-xl px-4 py-3.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT: Profile Overview Card */}
            <div className="lg:col-span-1 space-y-6">
              <Card className={cn("p-6 glass soft-shadow transition-all duration-500 border-2 relative overflow-hidden", activeAccent.border, activeAccent.glow)}>
                {/* Visual Top Decorative Banner */}
                <div className={cn("absolute top-0 left-0 w-full h-2 bg-gradient-to-r", activeAccent.gradient)} />
                
                <div className="flex flex-col items-center text-center space-y-5 pt-3">
                  {/* Styled Avatar Frame */}
                  <div className="relative">
                    <div className={cn("transition-all duration-500", activeFrame.class)}>
                      <div className="p-1 bg-[#0b1533] rounded-full">
                        <Avatar className="h-28 w-28 border-2 border-border/80" key={profileData.avatar}>
                          <AvatarImage 
                            src={profileData.avatar} 
                            alt={profileData.name}
                            onError={(e) => {
                              console.error("Failed to load avatar image:", profileData.avatar);
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder-user.jpg";
                            }}
                          />
                          <AvatarFallback className="text-3xl font-bold bg-muted/40">
                            {profileData.name
                              ? profileData.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)
                              : "HR"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
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
                            e.target.value = '';
                          }}
                        />
                        <label htmlFor="avatar-upload">
                          <Button
                            type="button"
                            size="sm"
                            className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full btn-gradient cursor-pointer hover:scale-110 active:scale-95 shadow-md shadow-primary/30"
                            asChild
                          >
                            <span>
                              <Camera className="h-4.5 w-4.5" />
                            </span>
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                  
                  {/* Name and Department */}
                  <div className="space-y-2 w-full">
                    {isEditing ? (
                      <div className="space-y-1 text-left">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Nama Lengkap</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                          className="w-full text-lg font-bold text-center bg-background/50 border border-border/80 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                          placeholder="Nama lengkap"
                        />
                      </div>
                    ) : (
                      <h2 className="text-2xl font-bold tracking-tight text-white hover:text-primary transition-colors duration-300">
                        {profileData.name || "No Name"}
                      </h2>
                    )}
                    
                    {isEditing ? (
                      <div className="space-y-1 text-left pt-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Jabatan</label>
                        <input
                          type="text"
                          value={profileData.role}
                          onChange={(e) => setProfileData({...profileData, role: e.target.value})}
                          className="w-full text-xs text-center bg-background/50 border border-border/80 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Jabatan"
                        />
                      </div>
                    ) : (
                      <Badge className={cn("text-xs font-semibold px-2.5 py-0.5 select-none transition-all duration-500", activeAccent.badge)}>
                        {profileData.role || "No Role"}
                      </Badge>
                    )}
                    
                    {isEditing ? (
                      <div className="space-y-1 text-left pt-1">
                        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Departemen</label>
                        <input
                          type="text"
                          value={profileData.department}
                          onChange={(e) => setProfileData({...profileData, department: e.target.value})}
                          className="w-full text-xs text-center text-muted-foreground bg-background/50 border border-border/80 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Departemen"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-1">
                        <Shield className="h-3.5 w-3.5 text-primary/70" />
                        {profileData.department || "No Department"}
                      </p>
                    )}
                  </div>

                  <hr className="w-full border-border/60" />

                  {/* Profile Meta Fields */}
                  <div className="w-full space-y-4 text-left">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">E-mail</p>
                        <p className="text-sm font-medium text-foreground truncate">{profileData.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Telepon</p>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                            className="w-full bg-background/50 border border-border/80 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Nomor telepon"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground">{profileData.phone || "-"}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Lokasi</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={profileData.location}
                            onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                            className="w-full bg-background/50 border border-border/80 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Lokasi"
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground">{profileData.location || "-"}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tanggal Bergabung</p>
                        <p className="text-sm font-medium text-foreground">{profileData.joinDate}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Dynamic Theme Personalizer Card (Editing Mode Only) */}
              {isEditing && (
                <Card className={cn("p-5 glass border border-border/60 soft-shadow animate-fade-in")}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Kustomisasi Tema & Frame
                  </h4>
                  
                  {/* Theme Accent Picker */}
                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-semibold text-foreground">Aksen Warna Profil</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(ACCENT_COLORS) as Array<keyof typeof ACCENT_COLORS>).map((colorKey) => {
                        const col = ACCENT_COLORS[colorKey];
                        const isSelected = profileData.accent === colorKey;
                        return (
                          <button
                            key={colorKey}
                            type="button"
                            onClick={() => setProfileData(prev => ({ ...prev, accent: colorKey }))}
                            className={cn(
                              "h-10 rounded-xl border flex flex-col items-center justify-center relative transition-all duration-300",
                              isSelected ? "border-white bg-white/10 scale-105" : "border-border/60 bg-muted/20 hover:bg-muted/40"
                            )}
                            title={col.name}
                          >
                            <span className={cn("h-4 w-4 rounded-full bg-gradient-to-r", col.gradient)} />
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Avatar Frame Picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-foreground">Bingkai Foto Profil (Avatar Frame)</label>
                    <select
                      value={profileData.avatarFrame}
                      onChange={(e) => setProfileData(prev => ({ ...prev, avatarFrame: e.target.value as ProfileData["avatarFrame"] }))}
                      className="w-full text-xs bg-background border border-border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {(Object.keys(AVATAR_FRAMES) as Array<keyof typeof AVATAR_FRAMES>).map((frameKey) => (
                        <option key={frameKey} value={frameKey}>
                          {AVATAR_FRAMES[frameKey].name}
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>
              )}
            </div>

            {/* RIGHT: Profile Details & Stats */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* About / Bio Card */}
              <Card className="p-6 glass soft-shadow border border-border/60">
                <div className="flex items-center gap-2 mb-4">
                  <Award className={cn("h-5 w-5 transition-all duration-500", activeAccent.text)} />
                  <h3 className="text-lg font-semibold text-white">About User</h3>
                </div>
                {isEditing ? (
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    className="w-full h-32 p-3 border border-border/80 rounded-xl bg-background/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    placeholder="Tell us about yourself and your role..."
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {profileData.bio || "Bio kosong. Klik 'Edit Profile' untuk menambahkan penjelasan singkat tentang diri Anda."}
                  </p>
                )}
              </Card>

              {/* Skills & Expertise Section */}
              <Card className="p-6 glass soft-shadow border border-border/60">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className={cn("h-5 w-5 transition-all duration-500", activeAccent.text)} />
                    <h3 className="text-lg font-semibold text-white">Skills & Expertise</h3>
                  </div>
                  {isEditing && (
                    <Badge variant="outline" className="text-[10px]">
                      {profileData.skills.length} skills
                    </Badge>
                  )}
                </div>

                {/* Input Skill Baru (Editing Mode) */}
                {isEditing && (
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Tambah keahlian baru..."
                      className="flex-1 bg-background/50 border border-border/80 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button 
                      size="sm" 
                      onClick={handleAddSkill}
                      className={cn("rounded-xl transition-all", activeAccent.btn)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                )}

                {/* Skill badges container */}
                <div className="flex flex-wrap gap-2">
                  {profileData.skills.length > 0 ? (
                    profileData.skills.map((skill) => (
                      <Badge 
                        key={skill} 
                        className={cn(
                          "px-3 py-1 text-xs border transition-all duration-500 rounded-full flex items-center gap-1.5", 
                          activeAccent.badge
                        )}
                      >
                        {skill}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="rounded-full hover:bg-black/30 p-0.5 text-muted-foreground hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Belum ada skill yang ditambahkan.</p>
                  )}
                </div>
              </Card>

              {/* Statistics Section */}
              <Card className="p-6 glass soft-shadow border border-border/60">
                <div className="flex items-center gap-2 mb-4">
                  <ActivityIcon className={cn("h-5 w-5 transition-all duration-500", activeAccent.text)} />
                  <h3 className="text-lg font-semibold text-white">HR Screening Performance</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Card 1 */}
                  <div className="relative group overflow-hidden p-4 rounded-xl border border-border/65 bg-muted/15 transition-all hover:bg-muted/25 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CV Processed</p>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold tracking-tight text-white">{activityStats.documentsProcessed}</span>
                      <span className="text-xs text-muted-foreground">files</span>
                    </div>
                    {/* Visual bar tracker */}
                    <div className="w-full bg-muted/60 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (activityStats.documentsProcessed / 40) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="relative group overflow-hidden p-4 rounded-xl border border-border/65 bg-muted/15 transition-all hover:bg-muted/25 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Queries Made</p>
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold tracking-tight text-white">{activityStats.queriesMade}</span>
                      <span className="text-xs text-muted-foreground">questions</span>
                    </div>
                    <div className="w-full bg-muted/60 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (activityStats.queriesMade / 100) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="relative group overflow-hidden p-4 rounded-xl border border-border/65 bg-muted/15 transition-all hover:bg-muted/25 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Days Active</p>
                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold tracking-tight text-white">{activityStats.daysActive}</span>
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                    <div className="w-full bg-muted/60 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (activityStats.daysActive / 10) * 100)}%` }}
                      />
                    </div>
                  </div>

                </div>
              </Card>

              {/* Recent Activity Timeline Card */}
              <Card className="p-6 glass soft-shadow border border-border/60">
                <div className="flex items-center gap-2 mb-6">
                  <ActivityIcon className={cn("h-5 w-5 transition-all duration-500", activeAccent.text)} />
                  <h3 className="text-lg font-semibold text-white">Recent Activity Timeline</h3>
                </div>
                
                <div className="space-y-4 relative pl-4 border-l border-border/50">
                  {activityStats.recentActivities.length > 0 ? (
                    <>
                      {/* Tampilkan 5 pertama */}
                      {activityStats.recentActivities.slice(0, 5).map((activity) => {
                        const color = 
                          activity.type === 'document_upload' ? 'bg-emerald-500 text-emerald-950 border-emerald-400' :
                          activity.type === 'query' ? 'bg-blue-500 text-blue-950 border-blue-400' :
                          'bg-purple-500 text-purple-950 border-purple-400';
                        return (
                          <div key={activity.id} className="relative flex items-start gap-4 p-3.5 rounded-xl border border-border/30 bg-muted/10 group hover:bg-muted/20 transition-all duration-300">
                            {/* Buleit timeline */}
                            <div className={cn("absolute -left-[23px] top-[18px] h-3 w-3 rounded-full border-2", 
                              activity.type === 'document_upload' ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                              activity.type === 'query' ? 'bg-blue-500 border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                              'bg-purple-500 border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                            )} />
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white tracking-wide">{formatActivityDescription(activity)}</p>
                              <p className="text-xs text-muted-foreground/75 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                            </div>
                            
                            <button
                              onClick={() => handleRemoveActivity(activity.id)}
                              className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 shrink-0 self-center border border-transparent hover:border-red-500/20"
                              title="Hapus aktivitas dari log"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                      
                      {/* Expand/Collapse Button */}
                      {activityStats.recentActivities.length > 5 && (
                        <>
                          <button 
                            onClick={() => setExpandedActivities(!expandedActivities)}
                            type="button"
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-border/50 bg-muted/10 hover:bg-muted/20 rounded-xl transition-all text-xs font-semibold text-muted-foreground hover:text-foreground mt-4"
                          >
                            <span>
                              {expandedActivities ? 'Tampilkan lebih sedikit' : `Tampilkan ${activityStats.recentActivities.length - 5} aktivitas lainnya`}
                            </span>
                            {expandedActivities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          
                          {/* Expanded Activities */}
                          {expandedActivities && (
                            <div className="space-y-4 mt-4 animate-fade-in">
                              {activityStats.recentActivities.slice(5).map((activity) => (
                                <div key={activity.id} className="relative flex items-start gap-4 p-3.5 rounded-xl border border-border/30 bg-muted/10 group hover:bg-muted/20 transition-all duration-300">
                                  <div className={cn("absolute -left-[23px] top-[18px] h-3 w-3 rounded-full border-2", 
                                    activity.type === 'document_upload' ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                    activity.type === 'query' ? 'bg-blue-500 border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                                    'bg-purple-500 border-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                                  )} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white tracking-wide">{formatActivityDescription(activity)}</p>
                                    <p className="text-xs text-muted-foreground/75 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveActivity(activity.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 shrink-0 self-center border border-transparent hover:border-red-500/20"
                                    title="Hapus aktivitas"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border/80 rounded-xl bg-muted/5">
                      <p className="text-sm">Belum ada catatan aktivitas. Mulailah dengan mengunggah CV atau mengajukan kriteria screening!</p>
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
