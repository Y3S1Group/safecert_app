import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebaseConfig';
import { Course, Subtopic } from '@/types/course';
import { BookOpen, FileText, ArrowLeft, Play, X, Download, CheckCircle } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { getViewablePDFUrl } from '@/config/cloudinaryConfig';
import { generateQuizFromPDF } from '@/config/geminiConfig';

export default function CourseDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPDF, setSelectedPDF] = useState<{ url: string; title: string; lang: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [selectedSubtopic, setSelectedSubtopic] = useState<{ index: number; title: string; pdfs: any } | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const [userProgress, setUserProgress] = useState<number[]>([]);
  const [progressPercentage, setProgressPercentage] = useState(0);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseRef = doc(db, 'courses', id as string);
        const courseSnap = await getDoc(courseRef);
        
        if (courseSnap.exists()) {
          const courseData = { id: courseSnap.id, ...courseSnap.data() } as any;
          setCourse(courseData);
          
          const subtopicsData = courseData.subtopics || [];
          setSubtopics(subtopicsData);
        } else {
          console.log('Course not found');
        }
      } catch (error) {
        console.error('Error loading course:', error);
        Alert.alert('Error', 'Failed to load course details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  useEffect(() => {
    const fetchUserProgress = async () => {
      const user = auth.currentUser;
      if (!user || !user.email || !id) return;

      try {
        const progressRef = doc(db, 'users', user.email, 'courseProgress', id as string);
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const data = progressSnap.data();
          const completed = data.completedSubtopics || [];
          setUserProgress(completed);
          
          if (subtopics.length > 0) {
            const percentage = (completed.length / subtopics.length) * 100;
            setProgressPercentage(percentage);
          }
        }
      } catch (error) {
        console.error('Error fetching user progress:', error);
      }
    };

    if (subtopics.length > 0) {
      fetchUserProgress();
    }
  }, [id, subtopics.length]);

  const openPDF = (url: string, subtopicTitle: string, lang: string) => {
    Alert.alert(
      'Open PDF',
      'How would you like to view this PDF?',
      [
        {
          text: 'In-App Viewer',
          onPress: () => {
            const viewableUrl = getViewablePDFUrl(url);
            setSelectedPDF({ url: viewableUrl, title: subtopicTitle, lang });
          }
        },
        {
          text: 'External Browser',
          onPress: () => Linking.openURL(url)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const downloadPDF = async () => {
    if (!selectedPDF) return;
    
    try {
      setPdfLoading(true);
      
      const fileName = `${selectedPDF.title.replace(/[^a-z0-9]/gi, '_')}_${selectedPDF.lang}.pdf`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      const downloadResult = await FileSystem.downloadAsync(
        selectedPDF.url,
        fileUri
      );
      
      if (downloadResult.status === 200) {
        Alert.alert(
          'Download Complete',
          'PDF downloaded successfully. Would you like to share it?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share',
              onPress: async () => {
                const sharingAvailable = await Sharing.isAvailableAsync();
                if (sharingAvailable) {
                  await Sharing.shareAsync(downloadResult.uri);
                } else {
                  Alert.alert('Info', 'Sharing is not available on this device');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF. Opening in browser instead...');
      if (selectedPDF) {
        await Linking.openURL(selectedPDF.url);
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const getLangDisplay = (lang: string) => {
    switch (lang) {
      case 'english': return 'English';
      case 'sinhala': return 'සිංහල';
      case 'tamil': return 'தமிழ்';
      default: return lang.toUpperCase();
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading course...</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.center}>
        <BookOpen size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>Course not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{course.title}</Text>
          </View>
        </View>

        {/* Course Info Card with Progress */}
        <View style={styles.courseCard}>
          <View style={styles.courseHeader}>
            <View style={styles.courseBadge}>
              <BookOpen size={16} color="#FF6B35" />
              <Text style={styles.courseBadgeText}>Course</Text>
            </View>
          </View>
          <Text style={styles.description}>{course.description}</Text>
          
          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>
            
            <Text style={styles.progressSubtext}>
              {userProgress.length} of {subtopics.length} subtopics completed
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Course Content</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{subtopics.length}</Text>
          </View>
        </View>

        {/* Subtopics */}
        {subtopics.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No subtopics available yet.</Text>
          </View>
        ) : (
          subtopics.map((sub, index) => {
            const isCompleted = userProgress.includes(index);
            
            return (
              <View key={index} style={styles.subtopicCard}>
                <View style={styles.subtopicHeader}>
                  <Text style={styles.subtopicNumber}>Topic {index + 1}</Text>
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.completedText}>Completed</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.subTitle}>{sub.title}</Text>
                {sub.description && (
                  <Text style={styles.subDesc}>{sub.description}</Text>
                )}

                {/* PDFs */}
                {sub.pdfs && Object.keys(sub.pdfs).some(key => sub.pdfs[key as keyof typeof sub.pdfs]) && (
                  <>
                    <Text style={styles.materialsLabel}>Study Materials</Text>
                    <View style={styles.pdfRow}>
                      {/* Fixed order: English, Sinhala, Tamil */}
                      {(['english', 'sinhala', 'tamil'] as const).map((lang) => {
                        const url = sub.pdfs[lang];
                        return url ? (
                          <TouchableOpacity
                            key={lang}
                            style={styles.pdfButton}
                            onPress={() => openPDF(url, sub.title, lang)}
                          >
                            <FileText size={14} color="#FFF" />
                            <Text style={styles.pdfText}>{getLangDisplay(lang)}</Text>
                          </TouchableOpacity>
                        ) : null;
                      })}
                    </View>
                  </>
                )}

                {/* Generate Quiz Button */}
                <TouchableOpacity 
                  style={styles.quizButton}
                  onPress={() => {
                    setSelectedSubtopic({ index, title: sub.title, pdfs: sub.pdfs });
                    setQuizModalVisible(true);
                  }}
                >
                  <Play size={14} color="#FFF" />
                  <Text style={styles.quizText}>Generate Quiz</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* PDF Viewer Modal */}
      <Modal
        visible={selectedPDF !== null}
        animationType="slide"
        onRequestClose={() => setSelectedPDF(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setSelectedPDF(null)}
              style={styles.closeButton}
            >
              <X size={24} color="#111827" />
            </TouchableOpacity>
            
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedPDF?.title}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedPDF && getLangDisplay(selectedPDF.lang)}
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={downloadPDF}
              style={styles.downloadButton}
              disabled={pdfLoading}
            >
              {pdfLoading ? (
                <ActivityIndicator size="small" color="#FF6B35" />
              ) : (
                <Download size={24} color="#FF6B35" />
              )}
            </TouchableOpacity>
          </View>

          <WebView
            source={{ uri: selectedPDF?.url || '' }}
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color="#FF6B35" />
              </View>
            )}
          />
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={quizModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQuizModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.languageModal}>
            <Text style={styles.languageModalTitle}>Select Quiz Language</Text>
            <Text style={styles.languageModalSubtitle}>
              Choose the language for your quiz questions
            </Text>

            {(['english', 'sinhala', 'tamil'] as const).map((lang) => {
              const hasPDF = selectedSubtopic?.pdfs[lang];
              return (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.languageOption,
                    !hasPDF && styles.languageOptionDisabled
                  ]}
                  disabled={!hasPDF || generatingQuiz}
                  onPress={async () => {
                    if (!selectedSubtopic || !hasPDF) return;
                    
                    setGeneratingQuiz(true);
                    try {
                      const pdfUrl = selectedSubtopic.pdfs[lang];
                      
                      const questions = await generateQuizFromPDF({
                        pdfUrl,
                        language: lang,
                        subtopicTitle: selectedSubtopic.title
                      });

                      const quizData = encodeURIComponent(JSON.stringify(questions));
                      setQuizModalVisible(false);
                      router.push(`/quiz/${id}/${selectedSubtopic.index}?quizData=${quizData}` as any);
                    } catch (error) {
                      console.error('Quiz generation error:', error);
                      Alert.alert(
                        'Error', 
                        'Failed to generate quiz. Please check your internet connection and try again.',
                        [{ text: 'OK' }]
                      );
                    } finally {
                      setGeneratingQuiz(false);
                    }
                  }}
                >
                  <Text style={[
                    styles.languageOptionText,
                    !hasPDF && styles.languageOptionTextDisabled
                  ]}>
                    {lang === 'english' ? 'English' : lang === 'sinhala' ? 'සිංහල' : 'தமிழ்'}
                  </Text>
                  {!hasPDF && (
                    <Text style={styles.noPDFText}>No PDF available</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setQuizModalVisible(false)}
              disabled={generatingQuiz}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {generatingQuiz && (
              <View style={styles.generatingOverlay}>
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text style={styles.generatingText}>Generating quiz...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: { 
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  loadingText: { 
    marginTop: 12, 
    color: '#6B7280', 
    fontSize: 16 
  },
  emptyTitle: { 
    marginTop: 16, 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#6B7280' 
  },
  backButton: { 
    marginTop: 24, 
    backgroundColor: '#FF6B35', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12 
  },
  backButtonText: { 
    color: '#FFF', 
    fontWeight: '600' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    gap: 12,
  },
  backIconButton: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#111827',
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  courseHeader: {
    marginBottom: 12,
  },
  courseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  courseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  description: { 
    color: '#4B5563', 
    fontSize: 15, 
    lineHeight: 22,
    marginBottom: 16,
  },
  progressSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827' 
  },
  sectionBadge: { 
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  sectionBadgeText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#6B7280' 
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyText: { 
    marginTop: 12, 
    color: '#9CA3AF', 
    fontSize: 16 
  },
  subtopicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subtopicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtopicNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    textTransform: 'uppercase',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  subTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#111827', 
    marginBottom: 8 
  },
  subDesc: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 12 
  },
  materialsLabel: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#6B7280', 
    marginBottom: 8, 
    marginTop: 8 
  },
  pdfRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 12 
  },
  pdfButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#3B82F6', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    gap: 6 
  },
  pdfText: { 
    color: '#FFF', 
    fontWeight: '600', 
    fontSize: 13 
  },
  quizButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FF6B35', 
    paddingVertical: 12, 
    borderRadius: 10, 
    justifyContent: 'center', 
    gap: 8, 
    marginTop: 8 
  },
  quizText: { 
    color: '#FFF', 
    fontWeight: '600', 
    fontSize: 15 
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    paddingTop: 50,
  },
  closeButton: { 
    padding: 8 
  },
  modalTitleContainer: { 
    flex: 1, 
    marginHorizontal: 12 
  },
  modalTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#111827' 
  },
  modalSubtitle: { 
    fontSize: 13, 
    color: '#6B7280', 
    marginTop: 2 
  },
  downloadButton: { 
    padding: 8 
  },
  webview: { 
    flex: 1 
  },
  webviewLoading: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  languageModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  languageModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  languageModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  languageOption: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  languageOptionDisabled: {
    opacity: 0.5,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  languageOptionTextDisabled: {
    color: '#9CA3AF',
  },
  noPDFText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 4,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  generatingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
});