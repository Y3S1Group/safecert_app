import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import { uploadMultipleImages } from '@/config/cloudinaryConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/providers/languageContext'; // New

export default function EditCertificate() {
  const router = useRouter();
  const { t } = useLanguage(); // New
  const params = useLocalSearchParams<{ templateId: string }>();
  const templateId = params.templateId;

  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [instructorTitle, setInstructorTitle] = useState('');
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
        <Text style={styles.sectionTitle}>{t('editCertificate.organizationLogo')}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, fontSize: 14, color: '#111827', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  textArea: { minHeight: 80 },
  logoContainer: { width: 120, height: 120, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  logoPreview: { width: '100%', height: '100%', borderRadius: 12 },
  removeLogoButton: { position: 'absolute', top: 4, right: 4, backgroundColor: '#FF6B35', borderRadius: 12, padding: 2 },
  uploadButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, gap: 8 },
  uploadText: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  colorOption: { padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: 80 },
  selectedColorOption: { borderWidth: 2, borderColor: '#FF6B35' },
  colorPreview: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  colorCirclePrimary: { width: 20, height: 20, borderRadius: 10 },
  colorCircleSecondary: { width: 20, height: 20, borderRadius: 10 },
  colorName: { fontSize: 12, fontWeight: '600', color: '#111827' },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B35', padding: 16, borderRadius: 12, gap: 8, marginBottom: 40 },
  saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
});
