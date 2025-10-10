// app/course/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Course } from '../../types/course';
import { useLanguage } from '@/providers/languageContext';

export default function CourseListScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLanguage();

  const loadCourses = async () => {
    try {
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const fetchedCourses: Course[] = [];
      
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        
        // Fetch subtopics from subcollection
        const subtopicsSnapshot = await getDocs(
          collection(db, 'courses', courseDoc.id, 'subtopics')
        );
        
        let subtopics: any[] = [];
        if (!subtopicsSnapshot.empty) {
          const subtopicsDoc = subtopicsSnapshot.docs[0];
          subtopics = subtopicsDoc.data().list || [];
        }
        
        fetchedCourses.push({
          id: courseDoc.id,
          title: courseData.title,
          description: courseData.description,
          createdAt: courseData.createdAt,
          createdBy: courseData.createdBy,
          subtopics: subtopics,
        });
      }
      
      setCourses(fetchedCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseCard}
      onPress={() => router.push(`/course/${item.id}`)}
    >
      <View style={styles.courseHeader}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <View style={styles.subtopicBadge}>
          <Text style={styles.subtopicCount}>
            {item.subtopics.length} {item.subtopics.length === 1 ? t('course.topic') : t('course.topics')}
          </Text>
        </View>
      </View>
      <Text style={styles.courseDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.courseFooter}>
        <Text style={styles.viewButton}>{t('course.viewCourse')} →</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>{t('course.loadingCourses')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('course.trainingCourses')}</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/course/new')}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>{t('course.create')}</Text>
        </TouchableOpacity>
      </View>

      {courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>{t('course.noCoursesYet')}</Text>
          <Text style={styles.emptyText}>
            {t('course.createFirstCourse')}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/course/new')}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>{t('course.createCourse')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseCard}
          keyExtractor={(item) => item.id!}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#FF6B35"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    padding: 24,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  subtopicBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  subtopicCount: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  courseDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 14,
  },
});