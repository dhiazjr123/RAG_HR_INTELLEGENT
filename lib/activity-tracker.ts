// lib/activity-tracker.ts
// Helper untuk tracking aktivitas user

export type ActivityType = 'document_upload' | 'query' | 'profile_update';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: number; // Unix timestamp in ms
  metadata?: {
    documentName?: string;
    queryText?: string;
    [key: string]: any;
  };
}

// Helper untuk mendapatkan storage key
function getActivityKey(userId: string | null): string {
  if (!userId) return 'user_activities_guest';
  return `user_activities_${userId}`;
}

// Load aktivitas dari localStorage
export function loadActivities(userId: string | null): Activity[] {
  try {
    const key = getActivityKey(userId);
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as Activity[];
  } catch {
    return [];
  }
}

// Save aktivitas ke localStorage
export function saveActivities(userId: string | null, activities: Activity[]) {
  try {
    const key = getActivityKey(userId);
    // Simpan maksimal 100 aktivitas terbaru
    const limited = activities.slice(0, 100);
    localStorage.setItem(key, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to save activities:', error);
  }
}

// Tambah aktivitas baru
export function addActivity(
  userId: string | null,
  type: ActivityType,
  description: string,
  metadata?: Activity['metadata']
) {
  const activities = loadActivities(userId);
  const newActivity: Activity = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    type,
    description,
    timestamp: Date.now(),
    metadata,
  };
  
  // Tambahkan di awal array (terbaru di atas)
  activities.unshift(newActivity);
  saveActivities(userId, activities);
  return newActivity;
}

// Hitung statistik dari aktivitas
export function calculateStats(userId: string | null) {
  const activities = loadActivities(userId);
  
  // Documents processed
  const documentsProcessed = activities.filter(a => a.type === 'document_upload').length;
  
  // Queries made
  const queriesMade = activities.filter(a => a.type === 'query').length;
  
  // Days active (hitung hari unik)
  const uniqueDays = new Set<string>();
  activities.forEach(activity => {
    const date = new Date(activity.timestamp);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    uniqueDays.add(dayKey);
  });
  const daysActive = uniqueDays.size;
  
  // Recent activities (10 terbaru)
  const recentActivities = activities.slice(0, 10);
  
  return {
    documentsProcessed,
    queriesMade,
    daysActive,
    recentActivities,
  };
}

// Format waktu relatif (e.g., "2 hours ago")
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

// Hapus aktivitas berdasarkan ID
export function removeActivity(userId: string | null, activityId: string) {
  const activities = loadActivities(userId);
  const filtered = activities.filter(a => a.id !== activityId);
  saveActivities(userId, filtered);
  return filtered;
}

// Hapus semua aktivitas
export function clearAllActivities(userId: string | null) {
  saveActivities(userId, []);
}

// Format aktivitas untuk display
export function formatActivityDescription(activity: Activity): string {
  switch (activity.type) {
    case 'document_upload':
      return `Processed document "${activity.metadata?.documentName || 'Unknown'}"`;
    case 'query':
      const queryText = activity.metadata?.queryText || 'Unknown query';
      const truncated = queryText.length > 50 ? queryText.slice(0, 50) + '...' : queryText;
      return `Asked query about "${truncated}"`;
    case 'profile_update':
      return 'Updated profile information';
    default:
      return activity.description;
  }
}

