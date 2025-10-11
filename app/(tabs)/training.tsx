import { auth, db } from '@/config/firebaseConfig'
import { useRouter } from 'expo-router'
import { collection, updateDoc, getDoc, getDocs, arrayUnion, arrayRemove, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { BookOpen, Users, Award, CheckCircle, Clock, Edit, Eye, FileText, Plus, Search, Trash2, TrendingUp, Video, Bold, Activity, Languages } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSnackbar } from '@/contexts/SnackbarContext'  
import { sendNotification } from '@/utils/notifications'
import { useLanguage } from '@/providers/languageContext'
import { translateText, translateBatch, clearTranslationCache } from '@/utils/googleTranslate' // Added

interface Course {
  id: string
  title: string
  description: string
  createdBy: string
  createdAt: any
  updatedAt?: any
  subtopicsCount?: number
  enrolledCount?: number
}

export default function Training() {
  const router = useRouter()
  const { language, t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'view' | 'create' | 'analytics'>('view')
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(new Set())
  const [myCourses, setMyCourses] = useState<Course[]>([])
  const [courseProgress, setCourseProgress] = useState<Map<string, { completed: number; total: number }>>(new Map())
  const { showSnackbar } = useSnackbar()
  const [userRole, setUserRole] = useState<'Employee' | 'Instructor'>('Employee');

  // Translation State - New
  const [translatedCourses, setTranslatedCourses] = useState<Map<string, { title: string; description: string }>>(new Map())
  const [isTranslating, setIsTranslating] = useState(false)

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<{
    totalCoursesCreated: number;
    totalEnrollments: number;
    totalCompletions: number;
    averageCompletionRate: number;
    averageQuizScore: number;
    totalQuizAttempts: number;
    courseAnalytics: any[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Listen to user role changes
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.email),
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const jobTitle = userData.jobTitle || 'Employee';
          setUserRole(jobTitle as 'Employee' | 'Instructor');
          
          // If user switches to Employee, reset to 'view' tab
          if (jobTitle === 'Employee' && (activeTab === 'create' || activeTab === 'analytics')) {
            setActiveTab('view');
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // Update the useEffect to use emails
  useEffect(() => {
    if (!auth.currentUser || !auth.currentUser.email) return
    
    const userDocRef = doc(db, 'users', auth.currentUser.email)
    const userUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data()
        const enrolledIds = new Set<string>(userData.courses || [])
        setEnrolledCourses(enrolledIds)
      }
    })
    
    const q = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc')
    )
    const coursesUnsubscribe = onSnapshot(q, (snapshot) => {
      const coursesList: Course[] = []
      const myCreatedCourses: Course[] = []
      
      snapshot.forEach((doc) => {
        const courseData = { id: doc.id, ...doc.data() } as Course
        coursesList.push(courseData)
        
        if (courseData.createdBy === auth.currentUser?.uid) {
          myCreatedCourses.push(courseData)
        }
      })
      
      setCourses(coursesList)
      setMyCourses(myCreatedCourses)
      setFilteredCourses(coursesList)
      setLoading(false)
    })
    return () => {
      userUnsubscribe()
      coursesUnsubscribe()
    }
  }, [])

  // Translation Effect - Translate all courses when language changes
  useEffect(() => {
    const translateAllCourses = async () => {
      if (courses.length === 0 || language === 'en') {
        setTranslatedCourses(new Map())
        clearTranslationCache()
        return
      }

      console.log(`🌐 Translating ${courses.length} courses to ${language}...`)
      setIsTranslating(true)

      try {
        const translationsMap = new Map<string, { title: string; description: string }>()

        // Translate courses in batches for better performance
        const batchSize = 5
        for (let i = 0; i < courses.length; i += batchSize) {
          const batch = courses.slice(i, i + batchSize)
          
          const textsToTranslate = batch.flatMap(course => [course.title, course.description])
          const translations = await translateBatch(textsToTranslate, language)
          
          batch.forEach((course, index) => {
            const titleIndex = index * 2
            const descIndex = index * 2 + 1
            
            translationsMap.set(course.id, {
              title: translations[titleIndex],
              description: translations[descIndex]
            })
          })
        }

        setTranslatedCourses(translationsMap)
        console.log('✅ All courses translated!')
      } catch (error) {
        console.error('❌ Translation error:', error)
        Alert.alert(
          t('common.error'),
          'Failed to translate courses. Showing original text.'
        )
      } finally {
        setIsTranslating(false)
      }
    }

    translateAllCourses()
  }, [courses, language])

  // Fetch progress for enrolled courses
  useEffect(() => {
    if (!auth.currentUser || !auth.currentUser.email || enrolledCourses.size === 0) return

    const progressMap = new Map<string, { completed: number; total: number }>()
    
    const unsubscribes = Array.from(enrolledCourses).map(courseId => {
      const progressRef = doc(db, 'users', auth.currentUser!.email!, 'courseProgress', courseId)
      
      return onSnapshot(progressRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          const completed = (data.completedSubtopics || []).length
          
          // Get total subtopics from course
          const course = courses.find(c => c.id === courseId)
          const total = course?.subtopicsCount || 0
          
          progressMap.set(courseId, { completed, total })
          setCourseProgress(new Map(progressMap))
        }
      })
    })

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [enrolledCourses, courses])

  useEffect(() => {
    let filtered = courses

    if (searchQuery) {
      filtered = filtered.filter(course => {
        const translatedCourse = translatedCourses.get(course.id)
        const titleToSearch = translatedCourse?.title || course.title
        const descToSearch = translatedCourse?.description || course.description
        
        return titleToSearch.toLowerCase().includes(searchQuery.toLowerCase()) ||
               descToSearch.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }

    setFilteredCourses(filtered)
  }, [courses, searchQuery, translatedCourses])

  // Fetch analytics when analytics tab is active
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchInstructorAnalytics();
    }
  }, [activeTab, myCourses]);

  const fetchInstructorAnalytics = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setAnalyticsLoading(true);

    try {
      if (myCourses.length === 0) {
        setAnalyticsData({
          totalCoursesCreated: 0,
          totalEnrollments: 0,
          totalCompletions: 0,
          averageCompletionRate: 0,
          averageQuizScore: 0,
          totalQuizAttempts: 0,
          courseAnalytics: []
        });
        setAnalyticsLoading(false);
        return;
      }

      const courseIds = myCourses.map(c => c.id);
      const coursesMap = new Map();
      myCourses.forEach(course => {
        const translatedCourse = translatedCourses.get(course.id)
        coursesMap.set(course.id, {
          title: translatedCourse?.title || course.title,
          subtopicsCount: course.subtopicsCount || 0
        });
      });

      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      let totalEnrollments = 0;
      let totalCompletions = 0;
      const courseEnrollments = new Map<string, number>();
      const courseCompletions = new Map<string, number>();

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const enrolledCourses = userData.courses || [];
        
        courseIds.forEach(courseId => {
          if (enrolledCourses.includes(courseId)) {
            totalEnrollments++;
            courseEnrollments.set(courseId, (courseEnrollments.get(courseId) || 0) + 1);
          }
        });

        const progressSnapshot = await getDocs(
          collection(db, 'users', userDoc.id, 'courseProgress')
        );

        progressSnapshot.forEach(progressDoc => {
          const courseId = progressDoc.id;
          if (courseIds.includes(courseId)) {
            const progressData = progressDoc.data();
            const completed = (progressData.completedSubtopics || []).length;
            const total = coursesMap.get(courseId)?.subtopicsCount || 0;
            
            if (total > 0 && completed === total) {
              totalCompletions++;
              courseCompletions.set(courseId, (courseCompletions.get(courseId) || 0) + 1);
            }
          }
        });
      }

      const quizSnapshot = await getDocs(
        query(collection(db, 'quizAttempts'), where('courseId', 'in', courseIds.slice(0, 10)))
      );

      const courseScores = new Map<string, number[]>();
      const courseQuizCounts = new Map<string, number>();

      quizSnapshot.forEach(doc => {
        const data = doc.data();
        const courseId = data.courseId;
        
        if (!courseScores.has(courseId)) {
          courseScores.set(courseId, []);
        }
        courseScores.get(courseId)!.push(data.score || 0);
        courseQuizCounts.set(courseId, (courseQuizCounts.get(courseId) || 0) + 1);
      });

      const courseAnalytics: any[] = [];
      let totalQuizScores = 0;
      let totalQuizAttempts = 0;

      courseIds.forEach(courseId => {
        const enrollments = courseEnrollments.get(courseId) || 0;
        const completions = courseCompletions.get(courseId) || 0;
        const scores = courseScores.get(courseId) || [];
        const avgScore = scores.length > 0 
          ? scores.reduce((a, b) => a + b, 0) / scores.length 
          : 0;
        const quizAttempts = courseQuizCounts.get(courseId) || 0;

        totalQuizScores += avgScore * scores.length;
        totalQuizAttempts += quizAttempts;

        courseAnalytics.push({
          courseId,
          courseTitle: coursesMap.get(courseId)?.title || 'Unknown Course',
          totalEnrollments: enrollments,
          totalCompletions: completions,
          completionRate: enrollments > 0 ? (completions / enrollments) * 100 : 0,
          averageScore: avgScore,
          totalQuizAttempts: quizAttempts,
          subtopicsCount: coursesMap.get(courseId)?.subtopicsCount || 0
        });
      });

      courseAnalytics.sort((a, b) => b.totalEnrollments - a.totalEnrollments);

      setAnalyticsData({
        totalCoursesCreated: courseIds.length,
        totalEnrollments,
        totalCompletions,
        averageCompletionRate: totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0,
        averageQuizScore: totalQuizAttempts > 0 ? totalQuizScores / totalQuizAttempts : 0,
        totalQuizAttempts,
        courseAnalytics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    Alert.alert(
      t('trainingPage.deleteCourse'),
      t('trainingPage.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'courses', courseId))
              showSnackbar({
                message: t('trainingPage.deleteSuccess'),
                type: 'success',
                duration: 3000
              })
            } catch (error) {
              console.error('Error deleting course:', error)
              showSnackbar({
                message: t('trainingPage.deleteError'),
                type: 'error',
                duration: 3000
              })
            }
          }
        }
      ]
    )
  }

  // Update handleEnrollment to use email
  const handleEnrollment = async (courseId: string, courseTitle: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      showSnackbar({
        message: t('trainingPage.loginToEnroll'),
        type: 'error',
        duration: 3000
      });
      return;
    }
    
    try {
      const userDocRef = doc(db, 'users', user.email);
      
      if (enrolledCourses.has(courseId)) {
        // Unenroll - remove from array
        await updateDoc(userDocRef, {
          courses: arrayRemove(courseId)
        });
        showSnackbar({
          message: `${t('trainingPage.unenrollSuccess')} "${courseTitle}"`,
          type: 'success',
          duration: 3000
        });
      } else {
        // Enroll - add to array
        await updateDoc(userDocRef, {
          courses: arrayUnion(courseId)
        });
        
        showSnackbar({
          message: `${t('trainingPage.enrollSuccess')} "${courseTitle}"`,
          type: 'success',
          duration: 3000
        });

        // ENROLLMENT NOTIFICATION TO INSTRUCTOR
        try {
          const courseSnap = await getDoc(doc(db, 'courses', courseId));
          if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            const instructorUid = courseData.createdBy;

            // Get instructor's name (current user who enrolled)
            const userSnap = await getDoc(doc(db, 'users', user.email));
            const userName = userSnap.exists() ? userSnap.data().name : 'A student';

            // Send notification to course creator
            if (instructorUid && instructorUid !== user.uid) {
              await sendNotification(
                instructorUid,
                'New Enrollment',
                `${userName} enrolled in your course "${courseTitle}"`,
                'info'
              );
            }
          }
        } catch (notifError) {
          console.error('Error sending enrollment notification:', notifError);
          // Don't fail enrollment if notification fails
        }
      }
    } catch (error) {
      console.error('Error updating enrollment:', error);
      showSnackbar({
        message: t('trainingPage.enrollmentError'),
        type: 'error',
        duration: 3000
      });
    }
  };

  const renderCourseCard = ({ item, mode = 'view' }: { item: Course; mode?: 'view' | 'create' }) => {
    const isEnrolled = enrolledCourses.has(item.id)
    const isOwner = auth.currentUser?.uid === item.createdBy
    
    const progress = courseProgress.get(item.id)
    const progressPercentage = progress && progress.total > 0 
      ? (progress.completed / progress.total) * 100 
      : 0
    const isCompleted = progressPercentage === 100

    // Use translated content if available
    const translatedCourse = translatedCourses.get(item.id)
    const displayTitle = translatedCourse?.title || item.title
    const displayDescription = translatedCourse?.description || item.description

    return (
      <TouchableOpacity 
        style={styles.courseCard}
        onPress={() => {
          if (mode === 'view' && !isEnrolled && !isOwner) {
            showSnackbar({
              message: t('trainingPage.enrollToView'),
              type: 'warning',
              duration: 3000
            })
            return
          }
          router.push(`/course/${item.id}` as any)
        }}
        activeOpacity={0.7}
      >
        <View style={styles.accentBar} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <BookOpen size={14} color="#FF6B35" />
              <Text style={styles.badgeText}>{t('trainingPage.course')}</Text>
              {isCompleted && isEnrolled && (
                <View style={styles.completedBadgeCard}>
                  <Text style={styles.completedBadgeText}>✓ {t('trainingPage.completed')}</Text>
                </View>
              )}
            </View>
            {language !== 'en' && translatedCourse && (
              <View style={styles.translatedBadge}>
                <Languages size={12} color="#3B82F6" />
              </View>
            )}
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{displayTitle}</Text>

          <Text style={styles.descriptionText} numberOfLines={3}>
            {displayDescription}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.metaContainer}>
              <Clock size={12} color="#9CA3AF" />
              <Text style={styles.metaText}>
                {item.createdAt?.toDate?.()?.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                }) || t('trainingPage.recent')}
              </Text>
            </View>
            
            {item.subtopicsCount && (
              <View style={styles.attachmentBadge}>
                <FileText size={12} color="#6B7280" />
                <Text style={styles.attachmentCount}>
                  {item.subtopicsCount} {item.subtopicsCount === 1 ? t('trainingPage.topic') : t('trainingPage.topics')}
                </Text>
              </View>
            )}
          </View>

          {/* Progress bar - only show if enrolled and not completed */}
          {isEnrolled && !isCompleted && progress && progress.total > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>{t('trainingPage.progress')}</Text>
                <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
              </View>
              <View style={styles.progressBarCard}>
                <View style={[styles.progressBarFillCard, { width: `${progressPercentage}%` }]} />
              </View>
              <Text style={styles.progressSubtext}>
                {progress.completed} {t('trainingPage.of')} {progress.total} {t('trainingPage.topicsCompleted')}
              </Text>
            </View>
          )}

          {/* Different actions based on mode */}
          {mode === 'view' ? (
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[
                  styles.enrollButton,
                  isEnrolled && styles.enrolledButton
                ]}
                onPress={(e) => {
                  e.stopPropagation()
                  handleEnrollment(item.id, displayTitle)
                }}
              >
                <Text style={[
                  styles.enrollButtonText,
                  isEnrolled && styles.enrolledButtonText
                ]}>
                  {isEnrolled ? `✓ ${t('trainingPage.enrolled')}` : t('trainingPage.enroll')}
                </Text>
              </TouchableOpacity>
              
              {isEnrolled && (
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => router.push(`/course/${item.id}`)}
                >
                  <Eye size={16} color="#FFFFFF" />
                  <Text style={styles.viewButtonText}>{t('trainingPage.view')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push(`/course/${item.id}`)}
              >
                <Eye size={16} color="#6B7280" />
                <Text style={styles.actionText}>{t('trainingPage.view')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={(e) => {
                  e.stopPropagation()
                  handleDeleteCourse(item.id)
                }}
              >
                <Trash2 size={16} color="#EF4444" />
                <Text style={[styles.actionText, styles.deleteText]}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'view':
        return (
          <View style={styles.listContainer}>
            <View style={styles.searchWrapper}>
              <View style={styles.searchContainer}>
                <Search size={18} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('trainingPage.searchPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Text style={styles.clearButton}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Translation Indicator */}
            {isTranslating && (
              <View style={styles.translatingBanner}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.translatingText}>
                  {language === 'si' ? 'පාඨමාලා පරිවර්තනය කරමින්...' : 
                   language === 'ta' ? 'பாடநெறிகளை மொழிபெயர்க்கிறது...' : 
                   'Translating courses...'}
                </Text>
              </View>
            )}

            {searchQuery.length > 0 && (
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsText}>
                  {filteredCourses.length} {filteredCourses.length === 1 ? t('trainingPage.result') : t('trainingPage.results')} {t('trainingPage.found')}
                </Text>
              </View>
            )}

            <FlatList
              data={filteredCourses}
              renderItem={({ item }) => renderCourseCard({ item, mode: 'view' })}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <View style={styles.iconCircle}>
                    <BookOpen size={32} color="#D1D5DB" />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {searchQuery ? t('trainingPage.noCoursesFound') : t('trainingPage.noTrainingCourses')}
                  </Text>
                  <Text style={styles.emptyStateDescription}>
                    {searchQuery 
                      ? t('trainingPage.adjustSearch') 
                      : t('trainingPage.noCoursesAvailable')}
                  </Text>
                </View>
              }
            />
          </View>
        )

      case 'create':
        return (
          <View style={styles.listContainer}>
            <View style={styles.createHeader}>
              <Text style={styles.createTitle}>{t('trainingPage.myCourses')}</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/course/new')}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>{t('trainingPage.newCourse')}</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={myCourses}
              renderItem={({ item }) => renderCourseCard({ item, mode: 'create' })}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <View style={styles.iconCircle}>
                    <Plus size={32} color="#FF6B35" />
                  </View>
                  <Text style={styles.emptyStateTitle}>{t('trainingPage.createFirstCourse')}</Text>
                  <Text style={styles.emptyStateDescription}>
                    {t('trainingPage.buildCourses')}
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.push('/course/new')}
                  >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('trainingPage.createTrainingCourse')}</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        )

      case 'analytics':
        if (analyticsLoading) {
          return (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIconContainer}>
                <Activity size={40} color="#FF6B35" />
              </View>
              <Text style={styles.loadingText}>{t('analytics.analyzingData')}</Text>
              <Text style={styles.loadingSubtext}>{t('analytics.pleaseWait')}</Text>
            </View>
          );
        }

        if (!analyticsData || analyticsData.totalCoursesCreated === 0) {
          return (
            <View style={styles.emptyStateContainer}>
              <View style={styles.iconCircle}>
                <TrendingUp size={32} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitle}>{t('trainingPage.noAnalytics')}</Text>
              <Text style={styles.emptyStateDescription}>
                {t('trainingPage.createCoursesAnalytics')}
              </Text>
            </View>
          );
        }

        return (
          <ScrollView 
            style={styles.listContainer}
            contentContainerStyle={styles.analyticsContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Overview Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <BookOpen size={20} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{analyticsData.totalCoursesCreated}</Text>
                <Text style={styles.statLabel}>{t('trainingPage.coursesCreated')}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#FCE7F3' }]}>
                  <Users size={20} color="#EC4899" />
                </View>
                <Text style={styles.statValue}>{analyticsData.totalEnrollments}</Text>
                <Text style={styles.statLabel}>{t('trainingPage.totalEnrollments')}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#D1FAE5' }]}>
                  <CheckCircle size={20} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{analyticsData.totalCompletions}</Text>
                <Text style={styles.statLabel}>{t('trainingPage.completions')}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Award size={20} color="#F59E0B" />
                </View>
                <Text style={styles.statValue}>{Math.round(analyticsData.averageQuizScore)}%</Text>
                <Text style={styles.statLabel}>{t('trainingPage.avgQuizScore')}</Text>
              </View>
            </View>

            {/* Overall Performance */}
            <View style={styles.analyticsSection}>
              <Text style={styles.analyticsSectionTitle}>{t('trainingPage.overallPerformance')}</Text>
              <View style={styles.performanceCard}>
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceLabel}>{t('trainingPage.completionRate')}</Text>
                  <Text style={[styles.performanceValue, { color: '#10B981' }]}>
                    {Math.round(analyticsData.averageCompletionRate)}%
                  </Text>
                </View>
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceLabel}>{t('trainingPage.totalQuizAttempts')}</Text>
                  <Text style={styles.performanceValue}>{analyticsData.totalQuizAttempts}</Text>
                </View>
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceLabel}>{t('trainingPage.averageQuizScore')}</Text>
                  <Text style={styles.performanceValue}>
                    {Math.round(analyticsData.averageQuizScore)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Per-Course Analytics */}
            <View style={styles.analyticsSection}>
              <Text style={styles.analyticsSectionTitle}>{t('trainingPage.coursePerformance')}</Text>
              {analyticsData.courseAnalytics.map((course: any, index: number) => (
                <View key={index} style={styles.analyticsCourseCard}>
                  <Text style={styles.analyticsCourseTitle} numberOfLines={1}>
                    {course.courseTitle}
                  </Text>
                  
                  <View style={styles.courseStatsRow}>
                    <View style={styles.courseStat}>
                      <Users size={16} color="#6B7280" />
                      <Text style={styles.courseStatText}>
                        {course.totalEnrollments} {t('trainingPage.enrolled')}
                      </Text>
                    </View>
                    
                    <View style={styles.courseStat}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.courseStatText}>
                        {course.totalCompletions} {t('trainingPage.completed')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.courseMetrics}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>{t('trainingPage.completionRate')}</Text>
                      <Text style={styles.metricValue}>
                        {Math.round(course.completionRate)}%
                      </Text>
                    </View>
                    
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>{t('trainingPage.avgScore')}</Text>
                      <Text style={styles.metricValue}>
                        {Math.round(course.averageScore)}%
                      </Text>
                    </View>
                    
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>{t('trainingPage.quizAttempts')}</Text>
                      <Text style={styles.metricValue}>
                        {course.totalQuizAttempts}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.analyticsProgressBar}>
                    <View style={[
                      styles.analyticsProgressFill, 
                      { width: `${course.completionRate}%` }
                    ]} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        );

      default:
        return null
    }
  }

  return (
  <SafeAreaView style={styles.container}>
    <Text style={styles.headerTitle}>{t('trainingPage.title')}</Text>
    {/* Only show header and tabs for Instructors */}
    {userRole === 'Instructor' ? (
      <>
        <View style={styles.header}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'view' && styles.activeTab]}
              onPress={() => setActiveTab('view')}
            >
              <BookOpen size={18} color={activeTab === 'view' ? '#FF6B35' : '#9CA3AF'} />
              <Text style={[styles.tabText, activeTab === 'view' && styles.activeTabText]}>
                {t('trainingPage.coursesTab')}
              </Text>
              {courses.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{courses.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'create' && styles.activeTab]}
              onPress={() => setActiveTab('create')}
            >
              <Plus size={18} color={activeTab === 'create' ? '#FF6B35' : '#9CA3AF'} />
              <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
                {t('trainingPage.createTab')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
              onPress={() => setActiveTab('analytics')}
            >
              <TrendingUp size={18} color={activeTab === 'analytics' ? '#FF6B35' : '#9CA3AF'} />
              <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
                {t('trainingPage.analyticsTab')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderTabContent()}
        </View>
      </>
    ) : (
      // Employee mode - no header, just show courses directly
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    )}
  </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  tabBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    fontSize: 24,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  resultsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
    paddingBottom: 80,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBar: {
    height: 4,
    width: '100%',
    backgroundColor: '#FF6B35',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF5F2',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  attachmentCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteText: {
    color: '#EF4444',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
  enrollButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    gap: 6,
  },
  enrolledButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  enrollButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  enrolledButtonText: {
    color: '#FFFFFF',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  createTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBadgeCard: {
  backgroundColor: '#D1FAE5',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
  marginStart: 120,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  progressSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  progressBarCard: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFillCard: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 16,
  },
    center: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  },
  analyticsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  analyticsSection: {
    marginBottom: 24,
  },
  analyticsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  performanceLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  analyticsCourseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  analyticsCourseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  courseStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  courseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  courseStatText: {
    fontSize: 13,
    color: '#6B7280',
  },
  courseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  analyticsProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  analyticsProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
    loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
    translatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    gap: 8,
  },
  translatingText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  translatedBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
})