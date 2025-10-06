import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { 
  Bell, 
  BookOpen, 
  Award, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  CheckCircle,
  Calendar,
  Users,
  Shield
} from 'lucide-react-native'
import { auth, db } from '@/config/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

interface UserInfo {
  name: string;
  department: string;
}

interface DashboardStats {
  completedTrainings: number;
  activeCertifications: number;
  pendingTrainings: number;
  reportsSubmitted: number;
}

export default function Home() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    completedTrainings: 12,
    activeCertifications: 5,
    pendingTrainings: 3,
    reportsSubmitted: 2
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user.email || '');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (email: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', email));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserInfo({
          name: userData.name || 'User',
          department: userData.department || 'Not assigned'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 3) return 'Welcome';
    if (hour < 12) return 'Good morning';
    if (hour < 16) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    {
      id: 'training',
      title: 'Start Training',
      subtitle: 'Continue learning',
      icon: BookOpen,
      color: '#FF6B35',
      bgColor: 'rgba(255, 107, 53, 0.1)',
      onPress: () => router.push('/training')
    },
    {
      id: 'certificates',
      title: 'View Certificates',
      subtitle: 'Check status',
      icon: Award,
      color: '#1B365D',
      bgColor: 'rgba(27, 54, 93, 0.1)',
      onPress: () => router.push('/_sitemap')
    },
    {
      id: 'report',
      title: 'Report Incident',
      subtitle: 'Quick reporting',
      icon: AlertTriangle,
      color: '#B03A2E',
      bgColor: 'rgba(176, 58, 46, 0.1)',
      onPress: () => router.push('/incidents/new' as any)
    },
    {
      id: 'profile',
      title: 'My Profile',
      subtitle: 'Update info',
      icon: Users,
      color: '#16A085',
      bgColor: 'rgba(22, 160, 133, 0.1)',
      onPress: () => router.push('/profile')
    }
  ];

  const recentActivity = [
    {
      id: 1,
      title: 'Completed: Fire Safety Training',
      time: '2 hours ago',
      type: 'training',
      icon: CheckCircle,
      color: '#16A085'
    },
    {
      id: 2,
      title: 'Certificate Renewal Reminder',
      time: '1 day ago',
      type: 'certificate',
      icon: Clock,
      color: '#F39C12'
    },
    {
      id: 3,
      title: 'Safety Report Submitted',
      time: '3 days ago',
      type: 'report',
      icon: Shield,
      color: '#3498DB'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()}, {userInfo?.name?.split(' ')[0] || 'User'}!
            </Text>
            <Text style={styles.department}>{userInfo?.department}</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => Alert.alert('Notifications', 'No new notifications')}
          >
            <Bell size={24} color="#6B7280" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Dashboard Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 107, 53, 0.1)' }]}>
                <BookOpen size={24} color="#FF6B35" />
              </View>
              <Text style={styles.statNumber}>{stats.completedTrainings}</Text>
              <Text style={styles.statLabel}>Trainings Completed</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(27, 54, 93, 0.1)' }]}>
                <Award size={24} color="#1B365D" />
              </View>
              <Text style={styles.statNumber}>{stats.activeCertifications}</Text>
              <Text style={styles.statLabel}>Active Certificates</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(241, 196, 15, 0.1)' }]}>
                <Clock size={24} color="#F1C40F" />
              </View>
              <Text style={styles.statNumber}>{stats.pendingTrainings}</Text>
              <Text style={styles.statLabel}>Pending Trainings</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(176, 58, 46, 0.1)' }]}>
                <AlertTriangle size={24} color="#B03A2E" />
              </View>
              <Text style={styles.statNumber}>{stats.reportsSubmitted}</Text>
              <Text style={styles.statLabel}>Reports Submitted</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionCard}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: action.bgColor }]}>
                    <IconComponent size={28} color={action.color} />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {recentActivity.map((activity) => {
              const IconComponent = activity.icon;
              return (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                    <IconComponent size={20} color={activity.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Safety Tip of the Day */}
        <View style={styles.tipContainer}>
          <View style={styles.tipHeader}>
            <Shield size={20} color="#16A085" />
            <Text style={styles.tipTitle}>Safety Tip of the Day</Text>
          </View>
          <Text style={styles.tipContent}>
            Always wear proper PPE when entering construction zones. Your safety is our priority.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  department: {
    fontSize: 16,
    color: '#6B7280',
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  quickActionsContainer: {
    marginBottom: 32,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  recentActivityContainer: {
    marginBottom: 32,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  tipContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#16A085',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16A085',
    marginLeft: 8,
  },
  tipContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});