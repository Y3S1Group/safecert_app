import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check, X, FileSignature } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import { uploadMultipleImages } from '@/config/cloudinaryConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Stepper from '@/components/stepper';
import { useLanguage } from '@/providers/languageContext';

export default function CreateCertificate() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{courseId: string}>();
  const courseId = params.courseId;

  // Course info pre-filled
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');

  // Instructor info
  const [instructorName, setInstructorName] = useState('');
  const [instructorTitle, setInstructorTitle] = useState('');
  const [signatureUrl, setSignatureUrl] = useState(''); // NEW: Signature

  // Organization info
  const [organizationName, setOrganizationName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Certificate colors
  const [primaryColor, setPrimaryColor] = useState('#6B21A8');
  const [secondaryColor, setSecondaryColor] = useState('#FDF2F8');

  // Load course info on page load
  useEffect(() => {
    if (!courseId) return;
    const fetchCourse = async () => {
      try {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          const data = courseDoc.data();
          setCourseName(data.title || '');
          setCourseDescription(data.description || '');
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      }
    };
    fetchCourse();
  }, [courseId]);

  // Pick logo from gallery
  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        await uploadLogo(uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t('common.error'), t('createCertificate.pickImageError'));
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      const uploaded: string[] = await uploadMultipleImages([uri]);
      setLogoUrl(uploaded[0]);
      Alert.alert(t('common.success'), t('createCertificate.logoUploaded'));
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert(t('common.error'), t('createCertificate.uploadError'));
    }
  };

  // NEW: Pick signature from gallery
  const pickSignature = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 1], // Wider aspect ratio for signatures
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        await uploadSignature(uri);
      }
    } catch (error) {
      console.error("Error picking signature:", error);
      Alert.alert(t('common.error'), 'Failed to pick signature image');
    }
  };

  const uploadSignature = async (uri: string) => {
    try {
      const uploaded: string[] = await uploadMultipleImages([uri]);
      setSignatureUrl(uploaded[0]);
      Alert.alert(t('common.success'), 'Signature uploaded successfully');
    } catch (error) {
      console.error("Signature upload failed:", error);
      Alert.alert(t('common.error'), 'Failed to upload signature');
    }
  };

  const handleSaveTemplate = async () => {
    if (!courseName || !instructorName) {
      Alert.alert(t('common.error'), t('createCertificate.requiredFields'));
      return;
    }

    try {
      // 1️⃣ Save template with signature
      const templateRef = await addDoc(collection(db, "certificateTemplates"), {
        courseId,
        courseName,
        courseDescription,
        instructorName,
        instructorTitle,
        signatureUrl, // NEW: Save signature URL
        organizationName,
        logoUrl,
        primaryColor,
        secondaryColor,
        receiverPlaceholder: "{{studentName}}",
        createdBy: auth.currentUser?.uid || "unknown",
        createdAt: new Date().toISOString(),
      });

      const templateId = templateRef.id;

      // 2️⃣ Update course document with templateId
      await updateDoc(doc(db, 'courses', courseId), {
        templateId,
      });

      Alert.alert(t('common.success'), t('createCertificate.saveSuccess'));
      router.replace('/(tabs)/training');
    } catch (error) {
      console.error("Error saving template:", error);
      Alert.alert(t('common.error'), t('createCertificate.saveError'));
    }
  };

  const handleBack = () => router.back();

  const colorOptions = [
    { name: t('createCertificate.colors.purple'), primary: '#6B21A8', secondary: '#FDF2F8' },
    { name: t('createCertificate.colors.blue'), primary: '#1E40AF', secondary: '#EFF6FF' },
    { name: t('createCertificate.colors.green'), primary: '#065F46', secondary: '#ECFDF5' },
    { name: t('createCertificate.colors.red'), primary: '#991B1B', secondary: '#FEF2F2' },
    { name: t('createCertificate.colors.orange'), primary: '#C2410C', secondary: '#FFF7ED' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stepper currentStep={2} steps={[t('createCertificate.stepCreateCourse'), t('createCertificate.stepCreateCertificate')]} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createCertificate.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Course info */}
        <Text style={styles.sectionTitle}>{t('createCertificate.courseInfo')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createCertificate.courseName')}
          placeholderTextColor="#9CA3AF"
          value={courseName}
          onChangeText={setCourseName}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('createCertificate.courseDescription')}
          placeholderTextColor="#9CA3AF"
          value={courseDescription}
          onChangeText={setCourseDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Instructor info */}
        <Text style={styles.sectionTitle}>{t('createCertificate.instructorInfo')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createCertificate.instructorName')}
          placeholderTextColor="#9CA3AF"
          value={instructorName}
          onChangeText={setInstructorName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('createCertificate.instructorTitlePlaceholder')}
          placeholderTextColor="#9CA3AF"
          value={instructorTitle}
          onChangeText={setInstructorTitle}
        />

        {/* NEW: Instructor Signature */}
        <Text style={styles.label}>Instructor Signature</Text>
        {signatureUrl ? (
          <View style={styles.signatureContainer}>
            <Image source={{ uri: signatureUrl }} style={styles.signaturePreview} resizeMode="contain" />
            <TouchableOpacity style={styles.removeButton} onPress={() => setSignatureUrl('')}>
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickSignature}>
            <FileSignature size={20} color="#6B21A8" />
            <Text style={styles.uploadTextSignature}>Upload Signature</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.helperText}>Upload a transparent PNG of the instructor's signature</Text>

        {/* Organization */}
        <Text style={styles.sectionTitle}>{t('createCertificate.organizationDetails')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('createCertificate.organizationName')}
          placeholderTextColor="#9CA3AF"
          value={organizationName}
          onChangeText={setOrganizationName}
        />

        {/* Logo */}
        <Text style={styles.label}>{t('createCertificate.organizationLogo')}</Text>
        {logoUrl ? (
          <View style={styles.logoContainer}>
            <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
            <TouchableOpacity style={styles.removeLogoButton} onPress={() => setLogoUrl('')}>
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickLogo}>
            <Camera size={20} color="#FF6B35" />
            <Text style={styles.uploadText}>{t('createCertificate.uploadLogo')}</Text>
          </TouchableOpacity>
        )}

        {/* Certificate Colors */}
        <Text style={styles.sectionTitle}>{t('createCertificate.certificateColors')}</Text>
        <View style={styles.colorGrid}>
          {colorOptions.map((color) => (
            <TouchableOpacity
              key={color.name}
              style={[
                styles.colorOption,
                primaryColor === color.primary && styles.selectedColorOption,
              ]}
              onPress={() => {
                setPrimaryColor(color.primary);
                setSecondaryColor(color.secondary);
              }}
            >
              <View style={styles.colorPreview}>
                <View style={[styles.colorCirclePrimary, { backgroundColor: color.primary }]} />
                <View style={[styles.colorCircleSecondary, { backgroundColor: color.secondary }]} />
              </View>
              <Text style={styles.colorName}>{color.name}</Text>
              {primaryColor === color.primary && (
                <View style={styles.checkMark}>
                  <Check size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveTemplate}>
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{t('createCertificate.saveTemplate')}</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F9FAFB" 
  },
  scrollView: {
    flex: 1,
  },
  content: { 
    padding: 24,
    paddingBottom: 100 
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
    marginBottom: 0,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: { 
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  sectionTitle: { 
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    marginTop: 24,
  },
  label: { 
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    marginBottom: 8,
    fontStyle: 'italic',
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
  uploadButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    borderWidth: 2, 
    borderStyle: "dashed", 
    borderColor: "#FF6B35", 
    borderRadius: 10,
    padding: 12,
    marginBottom: 8, 
    backgroundColor: "#FFF5F2",
    gap: 8,
  },
  uploadText: { 
    color: "#FF6B35", 
    fontWeight: "600", 
    fontSize: 14 
  },
  uploadTextSignature: { 
    color: "#6B21A8", 
    fontWeight: "600", 
    fontSize: 14 
  },
  logoContainer: { 
    alignItems: "center", 
    marginBottom: 16, 
    position: "relative" 
  },
  logoPreview: { 
    width: 120, 
    height: 120, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: "#E5E7EB" 
  },
  removeLogoButton: { 
    position: "absolute", 
    top: -8, 
    right: "35%", 
    backgroundColor: "#EF4444", 
    borderRadius: 12, 
    padding: 4 
  },
  signatureContainer: { 
    alignItems: "center", 
    marginBottom: 8, 
    position: "relative",
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  signaturePreview: { 
    width: '100%', 
    height: 80,
  },
  removeButton: { 
    position: "absolute", 
    top: 4, 
    right: 4, 
    backgroundColor: "#EF4444", 
    borderRadius: 12, 
    padding: 4 
  },
  colorGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 12, 
    marginBottom: 16 
  },
  colorOption: { 
    width: "30%", 
    aspectRatio: 1, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: "#E5E7EB", 
    padding: 8, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#FFFFFF", 
    position: "relative" 
  },
  selectedColorOption: { 
    borderColor: "#FF6B35", 
    borderWidth: 3 
  },
  colorPreview: { 
    flexDirection: "row", 
    gap: 4, 
    marginBottom: 4 
  },
  colorCirclePrimary: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: "#E5E7EB" 
  },
  colorCircleSecondary: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: "#E5E7EB" 
  },
  colorName: { 
    fontSize: 12, 
    fontWeight: "600", 
    color: "#374151", 
    marginTop: 4 
  },
  checkMark: { 
    position: "absolute", 
    top: 4, 
    right: 4, 
    backgroundColor: "#FF6B35", 
    borderRadius: 10, 
    padding: 2 
  },
  saveButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#FF6B35", 
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  saveButtonText: { 
    color: "#FFFFFF", 
    fontWeight: "700", 
    fontSize: 16,
  },
});