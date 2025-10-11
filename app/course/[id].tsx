import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db, auth } from '@/config/firebaseConfig';
import { Course, Subtopic } from '@/types/course';

import { BookOpen, FileText, ArrowLeft, Play, X, Download, CheckCircle, Info, Trophy, Volume2, VolumeX, Languages } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { getViewablePDFUrl } from '@/config/cloudinaryConfig';
import { generateQuizFromPDF } from '@/config/geminiConfig';
import * as Speech from 'expo-speech';
import { useLanguage } from '@/providers/languageContext';
import { translateText, translateBatch, clearTranslationCache } from '@/utils/googleTranslate'; // Added

export default function CourseDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { language, t } = useLanguage();
  console.log('🎤 Current TTS Language:', language);

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

  // Dynamic Translation State
  const [translatedCourse, setTranslatedCourse] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const [translatedSubtopics, setTranslatedSubtopics] = useState<{
    [key: number]: { title: string; description?: string }
  }>({});

  const [isTranslating, setIsTranslating] = useState(false);

  // TTS State
  const [speakingItem, setSpeakingItem] = useState<string | null>(null);

  // TTS Functions
  const speakText = (id: string, text: string) => {
    console.log('🔊 Speaking with language:', language);
    if (speakingItem === id) {
      Speech.stop();
      setSpeakingItem(null);
      return;
    }

    Speech.stop();
    setSpeakingItem(id);

    const languageCode = 
      language === 'si' ? 'si-LK' :
      language === 'ta' ? 'ta-IN' : 'en-US';

    Speech.speak(text, {
      language: languageCode,
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setSpeakingItem(null),
      onStopped: () => setSpeakingItem(null),
      onError: () => {
        setSpeakingItem(null);
        Alert.alert(t('common.error'), t('courseDetail.ttsError'));
      }
    });
  };

  const speakCourseInfo = () => {
    if (!course) return;
    const title = translatedCourse?.title || course.title;
    const desc = translatedCourse?.description || course.description;
    const text = `${title}. ${desc}`;
    speakText('course-info', text);
  };

  const speakSubtopic = (index: number, title: string, description?: string) => {
    const translatedTitle = translatedSubtopics[index]?.title || title;
    const translatedDesc = translatedSubtopics[index]?.description || description;
    const text = translatedDesc ? `${translatedTitle}. ${translatedDesc}` : translatedTitle;
    speakText(`subtopic-${index}`, text);
  };

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const [quizScores, setQuizScores] = useState<Map<number, number>>(new Map());
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);

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
        Alert.alert(t('common.error'), t('courseDetail.loadError'));
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  // Translation Effect - Triggers when language changes
  useEffect(() => {
    const translateCourseContent = async () => {
      if (!course || language === 'en') {
        // Reset to original if English
        setTranslatedCourse(null);
        setTranslatedSubtopics({});
        clearTranslationCache();
        return;
      }

      console.log(`🌐 Translating course to ${language}...`);
      setIsTranslating(true);

      try {
        // Translate course title and description
        const [translatedTitle, translatedDesc] = await translateBatch(
          [course.title, course.description],
          language
        );

        setTranslatedCourse({
          title: translatedTitle,
          description: translatedDesc
        });

        // Translate all subtopics
        const translatedSubs: { [key: number]: { title: string; description?: string } } = {};

        for (let i = 0; i < subtopics.length; i++) {
          const sub = subtopics[i];
          const textsToTranslate = [sub.title];
          
          if (sub.description) {
            textsToTranslate.push(sub.description);
          }

          const translated = await translateBatch(textsToTranslate, language);
          
          translatedSubs[i] = {
            title: translated[0],
            description: translated[1] || undefined
          };
        }

        setTranslatedSubtopics(translatedSubs);
        console.log('✅ Translation complete!');
      } catch (error) {
        console.error('❌ Translation error:', error);
        Alert.alert(
          t('common.error'),
          'Failed to translate course content. Showing original text.'
        );
      } finally {
        setIsTranslating(false);
      }
    };

    translateCourseContent();
  }, [course, subtopics, language]);

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

  useEffect(() => {
    const fetchQuizScores = async () => {
      const user = auth.currentUser;
      if (!user || !id) return;

      try {
        const quizQuery = query(
          collection(db, 'quizAttempts'),
          where('userId', '==', user.uid),
          where('courseId', '==', id)
        );

        const quizSnapshot = await getDocs(quizQuery);
        const scoresMap = new Map<number, number>();

        quizSnapshot.forEach((doc) => {
          const data = doc.data();
          const subtopicIndex = data.subtopicIndex;
          const score = data.score || 0;

          if (!scoresMap.has(subtopicIndex) || scoresMap.get(subtopicIndex)! < score) {
            scoresMap.set(subtopicIndex, score);
          }
        });

        setQuizScores(scoresMap);
      } catch (error) {
        console.error('Error fetching quiz scores:', error);
      }
    };

    if (subtopics.length > 0) {
      fetchQuizScores();
    }
  }, [id, subtopics.length]);

  const openPDF = (url: string, subtopicTitle: string, lang: string) => {
    const viewableUrl = getViewablePDFUrl(url);
    setSelectedPDF({ url: viewableUrl, title: subtopicTitle, lang });
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
          t('courseDetail.downloadComplete'),
          t('courseDetail.downloadCompleteMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('courseDetail.share'),
              onPress: async () => {
                const sharingAvailable = await Sharing.isAvailableAsync();
                if (sharingAvailable) {
                  await Sharing.shareAsync(downloadResult.uri);
                } else {
                  Alert.alert(t('common.info'), t('courseDetail.sharingNotAvailable'));
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert(t('common.error'), t('courseDetail.downloadError'));
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
        <Text style={styles.loadingText}>{t('courseDetail.loadingCourse')}</Text>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.center}>
        <BookOpen size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>{t('courseDetail.notFound')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSpeakingCourse = speakingItem === 'course-info';

  // Use translated content if available
  const displayTitle = translatedCourse?.title || course.title;
  const displayDescription = translatedCourse?.description || course.description;

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
            <Text style={styles.headerTitle}>{displayTitle}</Text>
          </View>
        </View>

        {/* Translation Indicator */}
        {isTranslating && (
          <View style={styles.translatingBanner}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text style={styles.translatingText}>
              {language === 'si' ? 'සිංහලට පරිවර්තනය කරමින්...' : 
               language === 'ta' ? 'தமிழில் மொழிபெயர்க்கிறது...' : 
               'Translating...'}
            </Text>
          </View>
        )}

        {/* Course Info Card with Progress */}
        <View style={styles.courseCard}>
          <View style={styles.courseHeader}>
            <View style={styles.courseBadge}>
              <BookOpen size={16} color="#FF6B35" />
              <Text style={styles.courseBadgeText}>{t('courseDetail.course')}</Text>
              <TouchableOpacity 
                onPress={() => setGuidelinesVisible(true)} 
                style={styles.guidelinesButtonSmall}
              >
                <Info size={20} color="#FF6B35" />
              </TouchableOpacity>
            </View>
            {language !== 'en' && (
              <View style={styles.translatedBadge}>
                <Languages size={14} color="#3B82F6" />
                <Text style={styles.translatedBadgeText}>Translated</Text>
              </View>
            )}
          </View>
          <Text style={styles.description}>{displayDescription}</Text>
          
          {/* TTS Button for Course Info */}
          <TouchableOpacity 
            style={styles.ttsButton}
            onPress={speakCourseInfo}
          >
            {isSpeakingCourse ? (
              <VolumeX size={16} color="#FF6B35" />
            ) : (
              <Volume2 size={16} color="#6B7280" />
            )}
            <Text style={[styles.ttsButtonText, isSpeakingCourse && styles.ttsButtonTextActive]}>
              {isSpeakingCourse ? t('courseDetail.stopReading') : t('courseDetail.readCourseInfo')}
            </Text>
          </TouchableOpacity>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>{t('courseDetail.yourProgress')}</Text>
              <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
            </View>
            
            <Text style={styles.progressSubtext}>
              {userProgress.length} {t('courseDetail.of')} {subtopics.length} {t('courseDetail.subtopicsCompleted')}
            </Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('courseDetail.courseContent')}</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{subtopics.length}</Text>
          </View>
        </View>

        {/* Subtopics */}
        {subtopics.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t('courseDetail.noSubtopics')}</Text>
          </View>
        ) : (
          subtopics.map((sub, index) => {
            const isCompleted = userProgress.includes(index);
            const isSpeakingSubtopic = speakingItem === `subtopic-${index}`;
            const quizScore = quizScores.get(index);

            // Use translated content if available
            const displaySubTitle = translatedSubtopics[index]?.title || sub.title;
            const displaySubDesc = translatedSubtopics[index]?.description || sub.description;

            return (
              <View key={index} style={styles.subtopicCard}>
                <View style={styles.subtopicHeader}>
                  <Text style={styles.subtopicNumber}>{t('courseDetail.topic')} {index + 1}</Text>
                  {quizScore !== undefined && (
                    <View style={styles.scoreBadge}>
                      <Trophy size={12} color="#F59E0B" />
                      <Text style={styles.scoreText}>{quizScore}/100</Text>
                    </View>
                  )}
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <CheckCircle size={16} color="#10B981" />
                      <Text style={styles.completedText}>{t('courseDetail.completed')}</Text>
                    </View>
                  )}
                </View>
                
                <Text style={styles.subTitle}>{displaySubTitle}</Text>
                {displaySubDesc && (
                  <Text style={styles.subDesc}>{displaySubDesc}</Text>
                )}

                {/* TTS Button for Subtopic */}
                <TouchableOpacity 
                  style={styles.ttsButtonSmall}
                  onPress={() => speakSubtopic(index, sub.title, sub.description)}
                >
                  {isSpeakingSubtopic ? (
                    <VolumeX size={14} color="#FF6B35" />
                  ) : (
                    <Volume2 size={14} color="#6B7280" />
                  )}
                  <Text style={[styles.ttsButtonTextSmall, isSpeakingSubtopic && styles.ttsButtonTextActive]}>
                    {isSpeakingSubtopic ? t('courseDetail.stop') : t('courseDetail.listen')}
                  </Text>
                </TouchableOpacity>

                {/* PDFs */}
                {sub.pdfs && Object.keys(sub.pdfs).some(key => sub.pdfs[key as keyof typeof sub.pdfs]) && (
                  <>
                    <Text style={styles.materialsLabel}>{t('courseDetail.studyMaterials')}</Text>
                    <View style={styles.pdfRow}>
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
                  <Text style={styles.quizText}>{t('courseDetail.generateQuiz')}</Text>
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
            <Text style={styles.languageModalTitle}>{t('courseDetail.selectQuizLanguage')}</Text>
            <Text style={styles.languageModalSubtitle}>
              {t('courseDetail.selectQuizLanguageDesc')}
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
                        t('common.error'), 
                        t('courseDetail.quizGenerationError'),
                        [{ text: t('common.ok') }]
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
                    <Text style={styles.noPDFText}>{t('courseDetail.noPDFAvailable')}</Text>
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setQuizModalVisible(false)}
              disabled={generatingQuiz}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            {generatingQuiz && (
              <View style={styles.generatingOverlay}>
                <ActivityIndicator size="large" color="#FF6B35" />
                <Text style={styles.generatingText}>{t('courseDetail.generatingQuiz')}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Course Guidelines Modal */}
      <Modal
        visible={guidelinesVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGuidelinesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.guidelinesModal}>
            <View style={styles.guidelinesHeader}>
              <Text style={styles.guidelinesTitle}>{t('courseDetail.guidelines')}</Text>
              <TouchableOpacity 
                onPress={() => setGuidelinesVisible(false)}
                style={styles.guidelinesCloseButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.guidelinesContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.guidelinesSubtitle}>
                {t('courseDetail.howToComplete')}
              </Text>

              <View style={styles.guidelineItem}>
                <View style={styles.guidelineNumber}>
                  <Text style={styles.guidelineNumberText}>1</Text>
                </View>
                <View style={styles.guidelineText}>
                  <Text style={styles.guidelineTitle}>{t('courseDetail.guideline1Title')}</Text>
                  <Text style={styles.guidelineDesc}>
                    {t('courseDetail.guideline1Desc')}
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineItem}>
                <View style={styles.guidelineNumber}>
                  <Text style={styles.guidelineNumberText}>2</Text>
                </View>
                <View style={styles.guidelineText}>
                  <Text style={styles.guidelineTitle}>{t('courseDetail.guideline2Title')}</Text>
                  <Text style={styles.guidelineDesc}>
                    {t('courseDetail.guideline2Desc')}
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineItem}>
                <View style={styles.guidelineNumber}>
                  <Text style={styles.guidelineNumberText}>3</Text>
                </View>
                <View style={styles.guidelineText}>
                  <Text style={styles.guidelineTitle}>{t('courseDetail.guideline3Title')}</Text>
                  <Text style={styles.guidelineDesc}>
                    {t('courseDetail.guideline3Desc')}
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineItem}>
                <View style={styles.guidelineNumber}>
                  <Text style={styles.guidelineNumberText}>4</Text>
                </View>
                <View style={styles.guidelineText}>
                  <Text style={styles.guidelineTitle}>{t('courseDetail.guideline4Title')}</Text>
                  <Text style={styles.guidelineDesc}>
                    {t('courseDetail.guideline4DescPart1')} {subtopics.length} {t('courseDetail.guideline4DescPart2')}
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineTip}>
                <Text style={styles.guidelineTipText}>
                  {t('courseDetail.guidelineTip')}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.guidelinesButton}
              onPress={() => setGuidelinesVisible(false)}
            >
              <Text style={styles.guidelinesButtonText}>{t('courseDetail.gotIt')}</Text>
            </TouchableOpacity>
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
    marginBottom: 12,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
    marginBottom: 16,
  },
  ttsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  ttsButtonTextActive: {
    color: '#FF6B35',
  },
  ttsButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  ttsButtonTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
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
    paddingTop: 16,
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
  guidelinesButtonSmall: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: '#FFF5F2',
    marginStart: 170,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginStart: 60,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  guidelinesModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
    width: '100%',
    position: 'absolute',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  guidelinesTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  guidelinesCloseButton: {
    padding: 4,
  },
  guidelinesContent: {
    marginBottom: 20,
  },
  guidelinesSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 20,
  },
  guidelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  guidelineNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidelineNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guidelineText: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  guidelineDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  guidelineTip: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  guidelineTipText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  guidelinesButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  guidelinesButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
    // Add these new styles:
  translatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
  },
  translatingText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  translatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  translatedBadgeText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
});