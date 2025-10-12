import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check, X, FileSignature } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import { uploadMultipleImages } from '@/config/cloudinaryConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/providers/languageContext';

export default function EditCertificate() {
  const router = useRouter();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ templateId: string }>();
  const templateId = params.templateId;

  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorTitle, setInstructorTitle] = useState('');
  const [signatureUrl, setSignatureUrl] = useState(''); // NEW: Signature
  const [organizationName, setOrganizationName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#6B21A8');
  const [secondaryColor, setSecondaryColor] = useState('#FDF2F8');
  const [loading, setLoading] = useState(true);

  // Load template on mount
  useEffect(() => {
    if (!templateId) return;

    const fetchTemplate = async () => {
      try {
        const templateDoc = await getDoc(doc(db, 'certificateTemplates', templateId));
        if (templateDoc.exists()) {
          const data = templateDoc.data();
          setCourseName(data.courseName || '');
          setCourseDescription(data.courseDescription || '');
          setInstructorName(data.instructorName || '');
          setInstructorTitle(data.instructorTitle || '');
          setSignatureUrl(data.signatureUrl || ''); // NEW: Load signature
          setOrganizationName(data.organizationName || '');
          setLogoUrl(data.logoUrl || '');
          setPrimaryColor(data.primaryColor || '#6B21A8');
          setSecondaryColor(data.secondaryColor || '#FDF2F8');
        }
      } catch (error) {
        console.error('Error fetching template:', error);
        Alert.alert(t('common.error'), t('editCertificate.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

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
      Alert.alert(t('common.error'), t('editCertificate.pickImageError'));
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      const uploaded: string[] = await uploadMultipleImages([uri]);
      setLogoUrl(uploaded[0]);
      Alert.alert(t('common.success'), t('editCertificate.logoUploaded'));
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert(t('common.error'), t('editCertificate.uploadError'));
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

  const handleUpdate = async () => {
    if (!courseName || !instructorName) {
      Alert.alert(t('common.error'), t('editCertificate.requiredFields'));
      return;
    }

    try {
      await updateDoc(doc(db, 'certificateTemplates', templateId), {
        courseName,
        courseDescription,
        instructorName,
        instructorTitle,
        signatureUrl, // NEW: Save signature
        organizationName,
        logoUrl,
        primaryColor,
        secondaryColor,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert(t('common.success'), t('editCertificate.updateSuccess'));
      router.back();
    } catch (error) {
      console.error('Error updating template:', error);
      Alert.alert(t('common.error'), t('editCertificate.updateError'));
    }
  };

  const colorOptions = [
    { name: t('editCertificate.colors.purple'), primary: '#6B21A8', secondary: '#FDF2F8' },
    { name: t('editCertificate.colors.blue'), primary: '#1E40AF', secondary: '#EFF6FF' },
    { name: t('editCertificate.colors.green'), primary: '#065F46', secondary: '#ECFDF5' },
    { name: t('editCertificate.colors.red'), primary: '#991B1B', secondary: '#FEF2F2' },
    { name: t('editCertificate.colors.orange'), primary: '#C2410C', secondary: '#FFF7ED' },
  ];

  const handleBack = () => router.back();

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('editCertificate.loadingTemplate')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editCertificate.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Course Info */}
        <Text style={styles.sectionTitle}>{t('editCertificate.courseInfo')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('editCertificate.courseName')}
          placeholderTextColor="#9CA3AF"
          value={courseName}
          onChangeText={setCourseName}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('editCertificate.courseDescription')}
          placeholderTextColor="#9CA3AF"
          value={courseDescription}
          onChangeText={setCourseDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Instructor Info */}
        <Text style={styles.sectionTitle}>{t('editCertificate.instructorInfo')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('editCertificate.instructorName')}
          placeholderTextColor="#9CA3AF"
          value={instructorName}
          onChangeText={setInstructorName}
        />
        <TextInput
          style={styles.input}
          placeholder={t('editCertificate.instructorTitle')}
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
          <TouchableOpacity style={styles.uploadButtonSignature} onPress={pickSignature}>
            <FileSignature size={20} color="#6B21A8" />
            <Text style={styles.uploadTextSignature}>Upload Signature</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.helperText}>Upload a transparent PNG of the instructor's signature</Text>

        {/* Organization Info */}
        <Text style={styles.sectionTitle}>{t('editCertificate.organization')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('editCertificate.organizationName')}
          placeholderTextColor="#9CA3AF"
          value={organizationName}
          onChangeText={setOrganizationName}
        />

        {/* Logo */}
        <Text style={styles.label}>{t('editCertificate.organizationLogo')}</Text>
        {logoUrl ? (
          <View style={styles.logoContainer}>
            <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
            <TouchableOpacity style={styles.removeLogoButton} onPress={() => setLogoUrl('')}>
              <X size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickLogo}>
            <Camera size={20} color="#FF6B35" />
            <Text style={styles.uploadText}>{t('editCertificate.uploadLogo')}</Text>
          </TouchableOpacity>
        )}

        {/* Colors */}
        <Text style={styles.sectionTitle}>{t('editCertificate.certificateColors')}</Text>
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

        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
          <Check size={20} color="#FFF" />
          <Text style={styles.saveButtonText}>{t('editCertificate.updateTemplate')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB' 
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 12, 
    marginTop: 20 
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
    marginBottom: 12,
    fontStyle: 'italic',
  },
  input: { 
    backgroundColor: '#FFF', 
    padding: 14, 
    borderRadius: 12, 
    fontSize: 14, 
    color: '#111827', 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  logoContainer: { 
    alignItems: 'center',
    marginBottom: 16, 
    position: 'relative' 
  },
  logoPreview: { 
    width: 120, 
    height: 120, 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB'
  },
  removeLogoButton: { 
    position: 'absolute', 
    top: -8, 
    right: '35%', 
    backgroundColor: '#EF4444', 
    borderRadius: 12, 
    padding: 4 
  },
  uploadButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 12, 
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FF6B35', 
    borderRadius: 12, 
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#FFF5F2'
  },
  uploadText: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },
  uploadButtonSignature: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    padding: 12, 
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#6B21A8', 
    borderRadius: 12, 
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#F5F3FF'
  },
  uploadTextSignature: { fontSize: 14, fontWeight: '600', color: '#6B21A8' },
  signatureContainer: { 
    alignItems: 'center', 
    marginBottom: 8, 
    position: 'relative',
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
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: '#EF4444', 
    borderRadius: 12, 
    padding: 4 
  },
  colorGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
    marginBottom: 24 
  },
  colorOption: { 
    width: '30%',
    aspectRatio: 1,
    padding: 12, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    position: 'relative'
  },
  selectedColorOption: { borderWidth: 3, borderColor: '#FF6B35' },
  colorPreview: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  colorCirclePrimary: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  colorCircleSecondary: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  colorName: { fontSize: 12, fontWeight: '600', color: '#374151' },
  checkMark: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: '#FF6B35', 
    borderRadius: 10, 
    padding: 2 
  },
  saveButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#FF6B35', 
    padding: 16, 
    borderRadius: 12, 
    gap: 8, 
    marginBottom: 40,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
});