import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Bell,
  BookOpen,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Shield,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Hourglass,
} from 'lucide-react-native'
import { auth, db } from '@/config/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { useLanguage } from '@/providers/languageContext' // Added
import { doc, getDoc, collection, arrayUnion, query, where, onSnapshot, getDocs, updateDoc } from 'firebase/firestore'
import { getAIRecommendations } from '@/config/recommendationService'
import { useAlert } from '@/contexts/AlertContext'

const SAFETY_TIPS = [
  "Always wear proper PPE when entering construction zones. Your safety is our priority.",
  "Never bypass safety guards on machinery. They are there to protect you.",
  "Report all near-miss incidents immediately. Prevention starts with awareness.",
  "Keep emergency exits clear at all times. Lives depend on quick evacuation.",
  "Inspect your tools and equipment before each use. Damaged tools can be deadly.",
  "Stay hydrated and take regular breaks, especially in hot weather conditions.",
  "Follow the lockout/tagout procedures before servicing equipment.",
  "Use the buddy system when working in confined spaces.",
  "Keep your work area clean and organized to prevent trips and falls.",
  "Never use damaged electrical cords or equipment. Report them immediately.",
  "Wear high-visibility clothing when working near moving vehicles or equipment.",
  "Always use three points of contact when climbing ladders.",
  "Read and understand Safety Data Sheets (SDS) before handling chemicals.",
  "Never remove safety labels or warning signs from equipment.",
  "Report workplace hazards to your supervisor immediately.",
  "Ensure proper ventilation when working with fumes or in enclosed spaces.",
  "Store flammable materials in designated areas away from ignition sources.",
  "Use proper lifting techniques: bend your knees, keep your back straight.",
  "Attend all safety training sessions. Knowledge saves lives.",
  "If you're unsure about a task, ask for help. It's better to be safe than sorry.",
];

const getTipOfTheDay = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return SAFETY_TIPS[dayOfYear % SAFETY_TIPS.length];
};

interface UserInfo {
  name: string;
  department: string;
}

interface DashboardStats {
  completedTrainings: number;
  pendingTrainings: number;
  reportsSubmitted: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  subtopicsCount?: number;
}

interface Recommendation {
  courseId: string;
  reason: string;
  relevanceScore: number;
}

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage(); // Added

  const { showAlert } = useAlert();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    completedTrainings: 0,
    pendingTrainings: 0,
    reportsSubmitted: 0
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [tipOfTheDay, setTipOfTheDay] = useState('');
  const [lastFetchDate, setLastFetchDate] = useState<string>('');
  const [lastEnrollmentState, setLastEnrollmentState] = useState<string>('');
  const fadeAnim = useState(new Animated.Value(1))[0];
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const handleQuickEnrollment = async (courseId: string, courseTitle: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      showAlert({
        message: 'Please log in to enroll in courses',
        icon: AlertTriangle,
        iconColor: '#EF4444',
        iconBgColor: '#FEE2E2',
        buttons: [
          { text: 'OK', onPress: () => { }, style: 'default' }
        ]
      });
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.email);

      await updateDoc(userDocRef, {
        courses: arrayUnion(courseId)
      });

      showAlert({
        message: `Successfully enrolled in "${courseTitle}"! Opening course...`,
        icon: CheckCircle,
        iconColor: '#10B981',
        iconBgColor: '#D1FAE5',
        autoClose: true,
        autoCloseDelay: 2000
      });

      setTimeout(() => {
        router.push(`/course/${courseId}` as any);
      }, 2000);

    } catch (error) {
      console.error('Error enrolling:', error);
      showAlert({
        message: 'Failed to enroll in course. Please try again.',
        icon: AlertTriangle,
        iconColor: '#EF4444',
        iconBgColor: '#FEE2E2',
        buttons: [
          { text: 'OK', onPress: () => { }, style: 'default' }
        ]
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        await fetchUserData(user.email);
      }
    });
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    setTipOfTheDay(getTipOfTheDay());
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  // Listen to enrollment changes
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.email),
      async (userDoc) => {
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserInfo({
            name: userData.name || 'User',
            department: userData.department || 'Not assigned'
          });
          setEnrolledCourseIds(userData.courses || []);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'courses'),
      (snapshot) => {
        const coursesList: Course[] = [];
        snapshot.forEach((doc) => {
          coursesList.push({ id: doc.id, ...doc.data() } as Course);
        });
        setCourses(coursesList);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (enrolledCourseIds.length === 0 || courses.length === 0) {
        setRecommendations([]);
        return;
      }

      const today = new Date().toDateString();
      const enrollmentKey = [...enrolledCourseIds].sort().join(',');

      if (
        lastFetchDate === today &&
        lastEnrollmentState === enrollmentKey &&
        recommendations.length > 0
      ) {
        return;
      }

      if (lastEnrollmentState === enrollmentKey && recommendations.length > 0) {
        return;
      }

      setLoadingRecommendations(true);

      try {
        const enrolled = courses.filter(c => enrolledCourseIds.includes(c.id));
        const available = courses.filter(c => !enrolledCourseIds.includes(c.id));

        if (enrolled.length > 0 && available.length > 0) {
          const recs = await getAIRecommendations(enrolled, available);
          setRecommendations(recs);
          setLastFetchDate(today);
          setLastEnrollmentState(enrollmentKey);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [enrolledCourseIds, courses]);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     Animated.timing(fadeAnim, {
  //       toValue: 0,
  //       duration: 300,
  //       useNativeDriver: true,
  //     }).start(() => {
  //       setCurrentTipIndex((prevIndex) => (prevIndex + 1) % SAFETY_TIPS.length)

  //       Animated.timing(fadeAnim, {
  //         toValue: 1,
  //         duration: 300,
  //         useNativeDriver: true,
  //       }).start()
  //     })
  //   }, )

  //   return () => clearInterval(interval)
  // }, [])

  const fetchUserData = async (email: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', email));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserInfo({
          name: userData.name || t('common.user'),
          department: userData.department || t('common.notAssigned')
        });
        setEnrolledCourseIds(userData.courses || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Real-time stats listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !user.email || courses.length === 0) return;

    const email = user.email;
    const uid = user.uid;

    // Listen to courseProgress changes
    const unsubscribeProgress = onSnapshot(
      collection(db, 'users', email, 'courseProgress'),
      async (progressSnapshot) => {
        // Fetch fresh enrolled courses
        const userDoc = await getDoc(doc(db, 'users', email));
        const enrolledIds = userDoc.exists() ? (userDoc.data().courses || []) : [];

        let completedCount = 0;
        let pendingCount = 0;

        progressSnapshot.forEach((progressDoc) => {
          const data = progressDoc.data();
          const courseId = progressDoc.id;
          
          // Only count if user is still enrolled
          if (!enrolledIds.includes(courseId)) {
            return;
          }

          // Find the course to get subtopics count
          const course = courses.find(c => c.id === courseId);
          const totalSubtopics = course?.subtopicsCount || 0;
          const completedSubtopics = (data.completedSubtopics || []).length;

          if (totalSubtopics > 0 && completedSubtopics === totalSubtopics) {
            completedCount++;
          } else if (completedSubtopics > 0) {
            pendingCount++;
          }
        });

        // Add courses with no progress started (but are enrolled)
        const coursesWithNoProgress = enrolledIds.filter((id: string) => {
          return !progressSnapshot.docs.find(doc => doc.id === id);
        });
        pendingCount += coursesWithNoProgress.length;

        setStats(prev => ({
          ...prev,
          completedTrainings: completedCount,
          pendingTrainings: pendingCount
        }));
      }
    );

    // Listen to incidents changes for reports count
    const reportsQuery = query(
      collection(db, 'incidents'),
      where('reportedByUid', '==', uid)
    );

    const unsubscribeReports = onSnapshot(reportsQuery, (reportsSnapshot) => {
      setStats(prev => ({
        ...prev,
        reportsSubmitted: reportsSnapshot.size
      }));
    });

    return () => {
      unsubscribeProgress();
      unsubscribeReports();
    };
  }, [courses, auth.currentUser]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 3) return t('home.greetings.welcome');
    if (hour < 12) return t('home.greetings.morning');
    if (hour < 16) return t('home.greetings.afternoon');
    return t('home.greetings.evening');
  };

  const quickActions = [
    {
      id: 'training',
      title: t('home.quickActions.startTraining'),
      subtitle: t('home.quickActions.continueLearn'),
      icon: BookOpen,
      color: '#FF6B35',
      bgColor: 'rgba(255, 107, 53, 0.1)',
      onPress: () => router.push('/training')
    },
    {
      id: 'certificates',
      title: t('home.quickActions.viewCertificates'),
      subtitle: t('home.quickActions.checkStatus'),
      icon: Award,
      color: '#1B365D',
      bgColor: 'rgba(27, 54, 93, 0.1)',
      onPress: () => router.push('/_sitemap')
    },
    {
      id: 'report',
      title: t('home.quickActions.reportIncident'),
      subtitle: t('home.quickActions.quickReporting'),
      icon: AlertTriangle,
      color: '#B03A2E',
      bgColor: 'rgba(176, 58, 46, 0.1)',
      onPress: () => router.push('/incidents/new' as any)
    },
    {
      id: 'profile',
      title: t('home.quickActions.myProfile'),
      subtitle: t('home.quickActions.updateInfo'),
      icon: Users,
      color: '#16A085',
      bgColor: 'rgba(22, 160, 133, 0.1)',
      onPress: () => router.push('/profile')
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Background (Scrollable) */}
        <View style={styles.headerBackground}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={styles.greeting}>
                Hi {userInfo?.name?.split(' ')[0] || t('common.user')},{'\n'}
                <Text style={styles.greetingTime}>{getGreeting()}!</Text>
              </Text>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => router.push('/notifications')}
              >
                <Bell size={24} color="#F97316" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Safety Tip Banner */}
            <View style={styles.headerTipBanner}>
              <View style={styles.headerTipIcon}>
                <Shield size={18} color="#F97316" />
              </View>
              <View style={[styles.headerTipContent, { opacity: fadeAnim }]}>
                <Text style={styles.headerTipTitle}>{t('home.safetyTip.title')}</Text>
                <Text style={styles.headerTipText}>
                  {tipOfTheDay}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Curved White Content */}
        <View style={styles.curvedContent}>
          {/* Dashboard Stats */}
          <View style={styles.statsContainer}>
          <View style={styles.recommendationsHeader}>
            <TrendingUp style={{marginBottom: 10}} size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>{t('home.stats.yourProgress')}</Text>
          </View>
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 107, 53, 0.1)' }]}>
                  <BookOpen size={24} color="#FF6B35" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>{stats.completedTrainings}</Text>
                  <Text style={styles.statLabel}>{t('home.stats.trainingsCompleted')}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(241, 196, 15, 0.1)' }]}>
                  <Clock size={24} color="#F1C40F" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>{stats.pendingTrainings}</Text>
                  <Text style={styles.statLabel}>{t('home.stats.pendingTrainings')</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(176, 58, 46, 0.1)' }]}>
                  <AlertTriangle size={24} color="#B03A2E" />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statNumber}>{stats.reportsSubmitted}</Text>
                  <Text style={styles.statLabel}>{t('home.stats.reportsSubmitted')}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

          {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.recommendationsHeader}>
            <Hourglass style={{marginBottom: 14}} size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>{t('home.quickActionsTitle')}</Text>
          </View>

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

          {/* AI Recommendations */}
          {enrolledCourseIds.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <View style={styles.recommendationsHeader}>
                <Sparkles style={{ marginBottom: 10 }} size={24} color="#FF6B35" />
                <Text style={styles.sectionTitle}>AI Recommended Courses</Text>
              </View>

              {loadingRecommendations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF6B35" />
                  <Text style={styles.loadingText}>Finding perfect courses...</Text>
                </View>
              ) : recommendations.length > 0 ? (
                <View style={styles.recommendationsList}>
                  {recommendations.map((rec, index) => {
                    const course = courses.find(c => c.id === rec.courseId);
                    if (!course) return null;
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.recommendationCard}
                        onPress={async () => {
                          // Check enrollment status from Firebase directly
                          const user = auth.currentUser;
                          if (!user || !user.email) return;

                          try {
                            const userDoc = await getDoc(doc(db, 'users', user.email));
                            const enrolledIds = userDoc.exists() ? (userDoc.data().courses || []) : [];
                            const isEnrolled = enrolledIds.includes(rec.courseId);

                            if (isEnrolled) {
                              // User is already enrolled, go directly to course
                              router.push(`/course/${rec.courseId}` as any);
                            } else {
                              // User not enrolled, show enrollment modal
                              showAlert({
                                message: `Would you like to enroll in "${course.title}"?`,
                                icon: BookOpen,
                                iconColor: '#FF6B35',
                                iconBgColor: '#FFF5F2',
                                buttons: [
                                  {
                                    text: 'Cancel',
                                    onPress: () => { },
                                    style: 'cancel'
                                  },
                                  {
                                    text: 'Enroll Now',
                                    onPress: () => handleQuickEnrollment(rec.courseId, course.title),
                                    style: 'default'
                                  }
                                ]
                              });
                            }
                          } catch (error) {
                            console.error('Error checking enrollment:', error);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.recommendationCardHeader}>
                          <View style={styles.recommendationBadge}>
                            <Sparkles size={12} color="#F59E0B" />
                            <Text style={styles.recommendationScore}>
                              {Math.round(rec.relevanceScore * 100)}% match
                            </Text>
                          </View>
                          <ArrowRight size={20} color="#9CA3AF"/>
                        </View>

                        <Text style={styles.recommendationTitle} numberOfLines={2}>
                          {course.title}
                        </Text>

                        <Text style={styles.recommendationReason} numberOfLines={2}>
                          {rec.reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyRecommendations}>
                  <BookOpen size={32} color="#D1D5DB" />
                  <Text style={styles.emptyRecommendationsText}>
                    Complete more courses to get personalized recommendations
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  
  // Scrollable Header
  headerBackground: {
    backgroundColor: '#ff8a37ff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  headerContent: {
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    marginStart: 2,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  greetingTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginEnd: 6,
    marginTop: 6,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Safety Tip Banner
  headerTipBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 108,
  },
  headerTipIcon: {
    width: 34,
    height: 34,
    borderRadius: 20,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 12,
  },
  headerTipContent: {
    flex: 1,
  },
  headerTipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
    marginBottom: 6,
  },
  headerTipText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    flexWrap: 'wrap',
  },

  // Curved White Content
  curvedContent: {
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 100,
    marginTop: -30,
    minHeight: 800,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },

  // Stats Container
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statRow: {
    paddingVertical: 0,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 8,
  },


  // Quick Actions - Row Layout
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
    fontSize: 14,
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


  // AI Recommendations
  recommendationsContainer: {
    marginBottom: 32,
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  recommendationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  recommendationScore: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  recommendationReason: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  emptyRecommendations: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyRecommendationsText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
})