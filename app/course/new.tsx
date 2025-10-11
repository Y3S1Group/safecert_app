// app/course/new.tsx - Updated with Cloudinary
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { db, auth } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDocs } from 'firebase/firestore';
import { uploadPDFToCloudinary, validateCloudinaryConfig } from '../../config/cloudinaryConfig';
import { SubtopicForm } from "../../types/course";
import { router } from 'expo-router';
import { ArrowLeft, FileText, Trash2, X } from 'lucide-react-native';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { sendNotification } from '@/utils/notifications';
import Stepper from '@/components/stepper';
import { useLanguage } from '@/providers/languageContext'; // Added

export default function CreateCourse() {
  const { showSnackbar } = useSnackbar();
  const { t } = useLanguage(); // Added
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtopics, setSubtopics] = useState<SubtopicForm[]>([
    { title: '', description: '', pdfs: { english: null, sinhala: null, tamil: null } }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const pickPDF = async (index: number, lang: 'english' | 'sinhala' | 'tamil') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: 'application/pdf',
        copyToCacheDirectory: true
      });
      
      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSubtopics(prev => {
          const updated = [...prev];
          updated[index].pdfs[lang] = file;
          return updated;
        });
        const langName = lang === 'english' ? t('createCourse.languages.english') : 
                         lang === 'sinhala' ? t('createCourse.languages.sinhala') : 
                         t('createCourse.languages.tamil');
        showSnackbar({
          message: `${langName} ${t('createCourse.pdfSelected')}: ${file.name}`,
          type: 'success',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
      showSnackbar({
        message: t('createCourse.errors.selectPDF'),
        type: 'error',
        duration: 3000
      });
    }
  };

  const addSubtopic = () => {
    setSubtopics([...subtopics, { 
      title: '', 
      description: '', 
      pdfs: { english: null, sinhala: null, tamil: null } 
    }]);
  };

  const removeSubtopic = (index: number) => {
    if (subtopics.length === 1) {
      showSnackbar({
        message: t('createCourse.errors.oneSubtopic'),
        type: 'warning',
        duration: 3000
      });
      return;
    }
    setSubtopics(subtopics.filter((_, i) => i !== index));
    showSnackbar({
      message: t('createCourse.subtopicRemoved'),
      type: 'error',
      duration: 2000
    });
  };

  const removePDF = (index: number, lang: 'english' | 'sinhala' | 'tamil') => {
    setSubtopics(prev => {
      const updated = [...prev];
      updated[index].pdfs[lang] = null;
      return updated;
    });
    const langName = lang === 'english' ? t('createCourse.languages.english') : 
                     lang === 'sinhala' ? t('createCourse.languages.sinhala') : 
                     t('createCourse.languages.tamil');
    showSnackbar({
      message: `${langName} ${t('createCourse.pdfRemoved')}`,
      type: 'error',
      duration: 2000
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim() || !description.trim()) {
      showSnackbar({
        message: t('createCourse.errors.fillTitleDescription'),
        type: 'warning',
        duration: 3000
      });
      return;
    }

    const hasValidSubtopic = subtopics.some(sub => sub.title.trim());
    if (!hasValidSubtopic) {
      showSnackbar({
        message: t('createCourse.errors.addSubtopic'),
        type: 'warning',
        duration: 3000
      });
      return;
    }

    // Validate Cloudinary configuration
    if (!validateCloudinaryConfig()) {
      showSnackbar({
        message: t('createCourse.errors.cloudinaryConfig'),
        type: 'error',
        duration: 4000
      });
      return;
    }

    setLoading(true);
    try {
      setUploadProgress(t('createCourse.progress.creating'));
      
      // Create course document first
      const courseRef = await addDoc(collection(db, 'courses'), {
        title: title.trim(),
        description: description.trim(),
        createdBy: auth.currentUser?.uid || 'unknown',
        createdAt: serverTimestamp(),
        subtopicsCount: subtopics.filter(sub => sub.title.trim()).length,
      });

      console.log('Course created with ID:', courseRef.id);

      // Upload PDFs and create subtopics with download URLs
      const uploadedSubtopics = [];
      
      for (let i = 0; i < subtopics.length; i++) {
        const subtopic = subtopics[i];
        
        if (!subtopic.title.trim()) continue;

        setUploadProgress(`${t('createCourse.progress.processing')} ${i + 1}/${subtopics.length}...`);

        const pdfURLs: any = {
          english: null,
          sinhala: null,
          tamil: null
        };

        // Create folder path for this subtopic
        const cleanSubtopicName = subtopic.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const folderPath = `safecert/courses/${courseRef.id}/${cleanSubtopicName}`;

        // Upload each language PDF
        for (const lang of ['english', 'sinhala', 'tamil'] as const) {
          const file = subtopic.pdfs[lang];
          
          if (file && typeof file !== 'string') {
            try {
              const langName = lang === 'english' ? t('createCourse.languages.english') : 
                               lang === 'sinhala' ? t('createCourse.languages.sinhala') : 
                               t('createCourse.languages.tamil');
              setUploadProgress(`${t('createCourse.progress.uploading')} ${langName} PDF ${t('createCourse.progress.for')} "${subtopic.title}"...`);
              
              const fileName = `${lang}_${Date.now()}.pdf`;
              const downloadURL = await uploadPDFToCloudinary(
                file.uri,
                fileName,
                { folder: folderPath }
              );
              
              pdfURLs[lang] = downloadURL;
              console.log(`${lang} PDF uploaded successfully:`, downloadURL);
            } catch (uploadError) {
              console.error(`Error uploading ${lang} PDF:`, uploadError);
              const langName = lang === 'english' ? t('createCourse.languages.english') : 
                               lang === 'sinhala' ? t('createCourse.languages.sinhala') : 
                               t('createCourse.languages.tamil');
              showSnackbar({
                message: `${t('createCourse.errors.uploadFailed')} ${langName} PDF ${t('createCourse.progress.for')} "${subtopic.title}"`,
                type: 'warning',
                duration: 3000
              });
            }
          }
        }

        uploadedSubtopics.push({
          title: subtopic.title.trim(),
          description: subtopic.description.trim(),
          pdfs: pdfURLs,
        });
      }

      // Update course document with subtopics
      // Send notifications to all users
      setUploadProgress(t('createCourse.progress.notifying'));
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const notificationPromises: Promise<void>[] = [];
        usersSnapshot.forEach((userDoc) => {
          // Send to everyone (including creator for now, or exclude with condition)
          const userId = userDoc.data().uid || userDoc.id;
          
          // Optional: Don't notify the creator
          // if (userId === auth.currentUser?.uid) return;
          
          notificationPromises.push(
            sendNotification(
              userId,
              t('createCourse.notification.title'),
              `"${title.trim()}" ${t('createCourse.notification.message')}`,
              'info'
            )
          );
        });
        await Promise.all(notificationPromises);
        console.log(`Sent notifications to ${notificationPromises.length} users`);
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
        // Don't fail course creation if notifications fail
      }

      console.log('Course updated with subtopics and PDFs');
      console.log('Uploaded subtopics:', uploadedSubtopics);

// After successfully creating the course
      Alert.alert(
        'Success',
        'Course created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Automatically navigate to template creation UI
              router.push({
                pathname: '/certificate/certificates',
                params: { courseId: courseRef.id },
              });
            },
          },
        ],
        { cancelable: false }
      );


      // Reset form
      setTitle('');
      setDescription('');
      setSubtopics([{ title: '', description: '', pdfs: { english: null, sinhala: null, tamil: null } }]);

    } catch (error) {
      console.error('Error creating course:', error);
      const errorMessage = error instanceof Error ? error.message : t('createCourse.errors.tryAgain');
      showSnackbar({
        message: `${t('createCourse.errors.createFailed')}: ${errorMessage}`,
        type: 'error',
        duration: 4000
      });
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stepper currentStep={2} steps={[t('createCourse.stepper.createCourse'), t('createCourse.stepper.createCertificate')]} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createCourse.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && uploadProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{uploadProgress}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('createCourse.courseInformation')}</Text>
          
          <TextInput
            style={styles.input}
            placeholder={t('createCourse.placeholders.courseTitle')}
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('createCourse.placeholders.courseDescription')}
            placeholderTextColor="#9CA3AF"
            value={description}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onChangeText={setDescription}
            editable={!loading}
          />
        </View>

        <Text style={styles.sectionHeader}>{t('createCourse.subtopics')} ({subtopics.length})</Text>

        {subtopics.map((sub, index) => (
          <View key={index} style={styles.subtopicCard}>
            <View style={styles.subtopicHeader}>
              <Text style={styles.subtopicNumber}>{t('createCourse.subtopic')} {index + 1}</Text>
              {subtopics.length > 1 && (
                <TouchableOpacity 
                  onPress={() => removeSubtopic(index)}
                  style={styles.removeButton}
                  disabled={loading}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder={`${t('createCourse.subtopic')} ${index + 1} ${t('createCourse.titleLabel')}`}
              placeholderTextColor="#9CA3AF"
              value={sub.title}
              onChangeText={(text) => {
                const updated = [...subtopics];
                updated[index].title = text;
                setSubtopics(updated);
              }}
              editable={!loading}
            />
            
            <TextInput
              style={[styles.input, styles.smallTextArea]}
              placeholder={t('createCourse.placeholders.subtopicDescription')}
              placeholderTextColor="#9CA3AF"
              value={sub.description}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onChangeText={(text) => {
                const updated = [...subtopics];
                updated[index].description = text;
                setSubtopics(updated);
              }}
              editable={!loading}
            />

            <Text style={styles.uploadLabel}>{t('createCourse.uploadPDF')}</Text>
            <View style={styles.uploadContainer}>
              {(['english', 'sinhala', 'tamil'] as const).map((lang) => (
                <View key={lang} style={styles.uploadWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.uploadButton,
                      sub.pdfs[lang] && styles.uploadButtonSelected
                    ]}
                    onPress={() => pickPDF(index, lang)}
                    disabled={loading}
                  >
                    <FileText 
                      size={16} 
                      color={sub.pdfs[lang] ? '#10B981' : '#FFFFFF'} 
                    />
                    <Text style={[
                      styles.uploadText,
                      sub.pdfs[lang] && styles.uploadTextSelected
                    ]}>
                      {lang === 'english' ? t('createCourse.languages.english') : 
                       lang === 'sinhala' ? t('createCourse.languages.sinhala') : 
                       t('createCourse.languages.tamil')}
                    </Text>
                    {sub.pdfs[lang] && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                  
                  {/* Remove PDF button */}
                  {sub.pdfs[lang] && (
                    <TouchableOpacity
                      style={styles.removePdfButton}
                      onPress={() => removePDF(index, lang)}
                      disabled={loading}
                    >
                      <X size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity 
          onPress={addSubtopic} 
          style={styles.addButton}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>{t('createCourse.addSubtopic')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSubmit} 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? t('createCourse.creating') : t('createCourse.createButton')}
          </Text>
        </TouchableOpacity>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  progressContainer: {
    backgroundColor: '#FFF5F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  progressText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    color: '#111827',
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  smallTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  subtopicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subtopicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtopicNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  removeButton: {
    padding: 4,
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    marginTop: 4,
  },
  uploadContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadButtonSelected: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  uploadText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  uploadTextSelected: {
    color: '#10B981',
  },
  checkMark: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  addButton: {
    backgroundColor: '#E5E7EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  addButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  submitButton: {
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
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadWrapper: {
    position: 'relative',
    width: 80,
  },
  removePdfButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});