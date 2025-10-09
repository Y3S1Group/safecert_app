import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Award, CheckCircle, Book } from 'lucide-react-native';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import { useRouter } from 'expo-router';


interface Course {
  id: string;
  title: string;
  subtopicsCount: number;
  certificateTemplateId?: string;
}

interface EnrolledCourseInfo {
  courseId: string;
  courseTitle: string;
  completedSubtopics: number;
  totalSubtopics: number;
  isCompleted: boolean;
  certificateTemplateId?: string;
}

export default function EarnedCertificates() {
  const [earnedCourses, setEarnedCourses] = useState<EnrolledCourseInfo[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const router = useRouter();

  const fetchEarnedCourses = async () => {
    setLoading(true);
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        console.log('No user email found');
        setLoading(false);
        return;
      }

      // Get user's enrolled courses
      const userDocRef = doc(db, 'users', userEmail);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('User document not found');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const enrolledCourseIds = userData.courses || [];

      if (enrolledCourseIds.length === 0) {
        console.log('No enrolled courses');
        setLoading(false);
        return;
      }

      // Fetch all enrolled courses data
      const coursesData: Course[] = [];
      for (const courseId of enrolledCourseIds) {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          coursesData.push({
            id: courseDoc.id,
            title: courseDoc.data().title,
            subtopicsCount: courseDoc.data().subtopicsCount || 0,
            certificateTemplateId: courseDoc.data().certificateTemplateId
          });
        }
      }

      // Fetch progress for each enrolled course
      const enrolledCoursesInfo: EnrolledCourseInfo[] = [];
      const earnedCoursesInfo: EnrolledCourseInfo[] = [];

      for (const course of coursesData) {
        const progressDocRef = doc(db, 'users', userEmail, 'courseProgress', course.id);
        const progressDoc = await getDoc(progressDocRef);

        let completedCount = 0;
        if (progressDoc.exists()) {
          const progressData = progressDoc.data();
          completedCount = (progressData.completedSubtopics || []).length;
        }

        const courseInfo: EnrolledCourseInfo = {
          courseId: course.id,
          courseTitle: course.title,
          completedSubtopics: completedCount,
          totalSubtopics: course.subtopicsCount,
          isCompleted: completedCount > 0 && completedCount === course.subtopicsCount,
          certificateTemplateId: course.certificateTemplateId
        };

        enrolledCoursesInfo.push(courseInfo);

        if (courseInfo.isCompleted) {
          earnedCoursesInfo.push(courseInfo);
        }
      }

      setEnrolledCourses(enrolledCoursesInfo);
      setEarnedCourses(earnedCoursesInfo);

    } catch (error) {
      console.error('Error fetching earned courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnedCourses();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEarnedCourses();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading certificates...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} />}
    >
      {/* Earned Certificates Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earned Certificates</Text>
        {earnedCourses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.iconCircle}>
              <Award size={32} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Certificates Earned</Text>
            <Text style={styles.emptyText}>Complete your courses to earn certificates!</Text>
          </View>
        ) : (
          earnedCourses.map(course => (
            <View key={course.courseId} style={styles.courseCard}>
              <View style={styles.cardHeader}>
                <View style={styles.completedBadge}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
              </View>
              <Text style={styles.courseTitle}>{course.courseTitle}</Text>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {course.completedSubtopics}/{course.totalSubtopics} topics completed
                </Text>
              </View>
                {course.certificateTemplateId ? (
                <>
                   {/* Certificate Button */}
                    <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.certificateButton}
                        onPress={() => {
                            router.push(`/instructor/generate?courseId=${course.courseId}&certificateTemplateId=${course.certificateTemplateId}`);
                        }}
                    >
                        <Award size={16} color="#fff" />
                        <Text style={styles.buttonText}>View Certificate</Text>
                    </TouchableOpacity>
                    </View>
                </>
                ) : (
                <View style={styles.noTemplateContainer}>
                    <Text style={styles.noTemplateText}>⚠️ No certificate template assigned</Text>
                </View>
                )}

            </View>
          ))
        )}
      </View>

        
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  incompleteCard: {
    borderLeftColor: '#FF6B35',
  },
  cardHeader: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
  },
  inProgressBadge: {
    backgroundColor: '#FFF5F2',
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  inProgressBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  courseId: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  templateInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  templateId: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  noTemplateContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  noTemplateText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },

  buttonContainer: {
  marginTop: 10,
  alignItems: 'flex-start',
},
certificateButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FF6B35',
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 8,
  gap: 6,
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 2,
},
buttonText: {
  color: '#fff',
  fontWeight: '600',
  fontSize: 14,
},

});