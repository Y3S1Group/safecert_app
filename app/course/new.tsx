// app/course/new.tsx - Updated with Cloudinary
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { db, auth } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { uploadPDFToCloudinary, validateCloudinaryConfig } from '../../config/cloudinaryConfig';
import { SubtopicForm } from "../../types/course";
import { router } from 'expo-router';
import { ArrowLeft, FileText, Trash2 } from 'lucide-react-native';

export default function CreateCourse() {
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
        const langName = lang === 'english' ? 'English' : lang === 'sinhala' ? 'Sinhala' : 'Tamil';
        Alert.alert('Success', `${langName} PDF selected: ${file.name}`);
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to select PDF');
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
      Alert.alert('Error', 'You must have at least one subtopic');
      return;
    }
    setSubtopics(subtopics.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in course title and description.');
      return;
    }

    const hasValidSubtopic = subtopics.some(sub => sub.title.trim());
    if (!hasValidSubtopic) {
      Alert.alert('Error', 'Please add at least one subtopic with a title.');
      return;
    }

    // Validate Cloudinary configuration
    if (!validateCloudinaryConfig()) {
      Alert.alert('Error', 'Cloudinary is not properly configured. Please check your environment variables.');
      return;
    }

    setLoading(true);
    try {
      setUploadProgress('Creating course...');
      
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

        setUploadProgress(`Processing subtopic ${i + 1}/${subtopics.length}...`);

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
              setUploadProgress(`Uploading ${lang} PDF for "${subtopic.title}"...`);
              
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
              Alert.alert('Warning', `Failed to upload ${lang} PDF for "${subtopic.title}"`);
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
      setUploadProgress('Saving course data...');
      await updateDoc(doc(db, 'courses', courseRef.id), {
        subtopics: uploadedSubtopics,
      });

      console.log('Course updated with subtopics and PDFs');
      console.log('Uploaded subtopics:', uploadedSubtopics);

      Alert.alert(
        'Success', 
        'Course created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );

      // Reset form
      setTitle('');
      setDescription('');
      setSubtopics([{ title: '', description: '', pdfs: { english: null, sinhala: null, tamil: null } }]);

    } catch (error) {
      console.error('Error creating course:', error);
      const errorMessage = error instanceof Error ? error.message : 'Please try again.';
      Alert.alert('Error', `Failed to create course: ${errorMessage}`);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Course</Text>
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
          <Text style={styles.sectionTitle}>Course Information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Course Title"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            editable={!loading}
          />
          
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Course Description"
            placeholderTextColor="#9CA3AF"
            value={description}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onChangeText={setDescription}
            editable={!loading}
          />
        </View>

        <Text style={styles.sectionHeader}>Subtopics ({subtopics.length})</Text>

        {subtopics.map((sub, index) => (
          <View key={index} style={styles.subtopicCard}>
            <View style={styles.subtopicHeader}>
              <Text style={styles.subtopicNumber}>Subtopic {index + 1}</Text>
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
              placeholder={`Subtopic ${index + 1} Title`}
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
              placeholder="Subtopic Description"
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

            <Text style={styles.uploadLabel}>Upload PDF Materials</Text>
            <View style={styles.uploadContainer}>
              {(['english', 'sinhala', 'tamil'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
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
                    {lang === 'english' ? 'EN' : lang === 'sinhala' ? 'SI' : 'TA'}
                  </Text>
                  {sub.pdfs[lang] && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity 
          onPress={addSubtopic} 
          style={styles.addButton}
          disabled={loading}
        >
          <Text style={styles.addButtonText}>+ Add Another Subtopic</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSubmit} 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? 'Creating Course...' : 'Create Course'}
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
});