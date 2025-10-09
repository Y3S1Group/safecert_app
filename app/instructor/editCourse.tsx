// app/certificate/assignTemplate.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebaseConfig';
import { router } from 'expo-router';
import { ArrowLeft, Award, BookOpen, CheckCircle, FileText } from 'lucide-react-native';

interface Course {
  id: string;
  title: string;
  description: string;
  subtopicsCount: number;
  certificateTemplateId?: string;
}

interface CertificateTemplate {
  id: string;
  templateName: string;
  createdBy: string;
  createdAt: any;
}

export default function AssignCertificateTemplate() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'Please log in to continue');
        return;
      }

      // Fetch all courses
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesList: Course[] = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description,
        subtopicsCount: doc.data().subtopicsCount || 0,
        certificateTemplateId: doc.data().certificateTemplateId,
      }));
      setCourses(coursesList);

      // Fetch all certificate templates
      const templatesSnapshot = await getDocs(collection(db, 'certificateTemplates'));
      const templatesList: CertificateTemplate[] = templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        templateName: doc.data().courseName,
        createdBy: doc.data().createdBy,
        createdAt: doc.data().createdAt,
      }));
      setTemplates(templatesList);

    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load courses and templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCourse || !selectedTemplate) {
      Alert.alert('Error', 'Please select both a course and a certificate template');
      return;
    }

    setSaving(true);
    try {
      const courseRef = doc(db, 'courses', selectedCourse);
      await updateDoc(courseRef, {
        certificateTemplateId: selectedTemplate,
      });

      Alert.alert(
        'Success',
        'Certificate template assigned successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh data to show updated assignments
              fetchData();
              setSelectedCourse(null);
              setSelectedTemplate(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error assigning template:', error);
      Alert.alert('Error', 'Failed to assign certificate template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/instructor/instructorDash')} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Certificate</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Select Course Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Select Course</Text>
          </View>

          {courses.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>No courses available</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => router.push('/course/new')}
              >
                <Text style={styles.createButtonText}>Create Course</Text>
              </TouchableOpacity>
            </View>
          ) : (
            courses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={[
                  styles.card,
                  selectedCourse === course.id && styles.cardSelected
                ]}
                onPress={() => setSelectedCourse(course.id)}
                disabled={saving}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardBadge}>
                    <BookOpen size={14} color="#FF6B35" />
                    <Text style={styles.cardBadgeText}>Course</Text>
                  </View>
                  {selectedCourse === course.id && (
                    <View style={styles.selectedBadge}>
                      <CheckCircle size={16} color="#10B981" />
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle}>{course.title}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {course.description}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.metaInfo}>
                    <FileText size={12} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {course.subtopicsCount} topics
                    </Text>
                  </View>
                  {course.certificateTemplateId && (
                    <View style={styles.assignedBadge}>
                      <Award size={12} color="#10B981" />
                      <Text style={styles.assignedText}>Template Assigned</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Select Template Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>Select Certificate Template</Text>
          </View>

          {templates.length === 0 ? (
            <View style={styles.emptyState}>
              <Award size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>No certificate templates available</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => router.push('/certificate/certificates')}
              >
                <Text style={styles.createButtonText}>Create Template</Text>
              </TouchableOpacity>
            </View>
          ) : (
            templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.card,
                  selectedTemplate === template.id && styles.cardSelected
                ]}
                onPress={() => setSelectedTemplate(template.id)}
                disabled={saving}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardBadge, styles.templateBadge]}>
                    <Award size={14} color="#8B5CF6" />
                    <Text style={[styles.cardBadgeText, styles.templateBadgeText]}>
                      Template
                    </Text>
                  </View>
                  {selectedTemplate === template.id && (
                    <View style={styles.selectedBadge}>
                      <CheckCircle size={16} color="#10B981" />
                    </View>
                  )}
                </View>

                <Text style={styles.cardTitle}>{template.templateName}</Text>
                
                <View style={styles.cardFooter}>
                  <Text style={styles.metaText}>
                    {template.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) || 'Recent'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Save Button */}
        {courses.length > 0 && templates.length > 0 && (
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!selectedCourse || !selectedTemplate || saving) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!selectedCourse || !selectedTemplate || saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Assign Template to Course'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  templateBadge: {
    backgroundColor: '#F3E8FF',
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  templateBadgeText: {
    color: '#8B5CF6',
  },
  selectedBadge: {
    backgroundColor: '#D1FAE5',
    padding: 4,
    borderRadius: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  assignedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});