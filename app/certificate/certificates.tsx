import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Check, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import { uploadMultipleImages } from '@/config/cloudinaryConfig';
import { useRouter , useLocalSearchParams} from 'expo-router';
import Stepper from '@/components/stepper';

export default function CreateCertificate() {
  const router = useRouter();
  const params = useLocalSearchParams<{courseId: string}>(); // gets courseId from previous step
  const courseId = params.courseId;

  // Course info pre-filled
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');

  // Instructor info
  const [instructorName, setInstructorName] = useState('');
  const [instructorTitle, setInstructorTitle] = useState('');

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

  // Pick image from gallery
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
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      const uploaded: string[] = await uploadMultipleImages([uri]);
      setLogoUrl(uploaded[0]);
      Alert.alert("Success", "Logo uploaded!");
    } catch (error) {
      console.error("Upload failed:", error);
      Alert.alert("Error", "Failed to upload logo");
    }
  };

  const handleSaveTemplate = async () => {
    if (!courseName || !instructorName) {
      Alert.alert("Error", "Please fill in required fields: Course name and Instructor name");
      return;
    }

    try {
      // 1️⃣ Save template
      const templateRef = await addDoc(collection(db, "certificateTemplates"), {
        courseId,
        courseName,
        courseDescription,
        instructorName,
        instructorTitle,
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

      Alert.alert("Success", "Certificate template saved and linked to course!");
      router.replace('/instructor/instructorDash');
    } catch (error) {
      console.error("Error saving template:", error);
      Alert.alert("Error", "Failed to save template");
    }
  };

  const handleBack = () => router.back();

  const colorOptions = [
    { name: 'Purple', primary: '#6B21A8', secondary: '#FDF2F8' },
    { name: 'Blue', primary: '#1E40AF', secondary: '#EFF6FF' },
    { name: 'Green', primary: '#065F46', secondary: '#ECFDF5' },
    { name: 'Red', primary: '#991B1B', secondary: '#FEF2F2' },
    { name: 'Orange', primary: '#C2410C', secondary: '#FFF7ED' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stepper currentStep={2} steps={['Create Course', 'Create Certificate']} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#1B365D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Template</Text>
        </View>

        {/* Course info */}
        <Text style={styles.sectionTitle}>Course Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Course Name *"
          placeholderTextColor="#9CA3AF"
          value={courseName}
          onChangeText={setCourseName}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Course Description"
          placeholderTextColor="#9CA3AF"
          value={courseDescription}
          onChangeText={setCourseDescription}
          multiline
        />

        {/* Instructor info */}
        <Text style={styles.sectionTitle}>Instructor Information</Text>
        <TextInput
          style={styles.input}
          placeholder="Instructor Name *"
          placeholderTextColor="#9CA3AF"
          value={instructorName}
          onChangeText={setInstructorName}
        />
        <TextInput
          style={styles.input}
          placeholder="Instructor Title"
          placeholderTextColor="#9CA3AF"
          value={instructorTitle}
          onChangeText={setInstructorTitle}
        />

        {/* Organization */}
        <Text style={styles.sectionTitle}>Organization (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Organization Name"
          placeholderTextColor="#9CA3AF"
          value={organizationName}
          onChangeText={setOrganizationName}
        />

        {/* Logo */}
        <Text style={styles.label}>Logo</Text>
        {logoUrl ? (
          <View style={styles.logoContainer}>
            <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
            <TouchableOpacity style={styles.removeLogoButton} onPress={() => setLogoUrl('')}>
              <X size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={pickLogo}>
            <Camera size={20} color="#1B365D" />
            <Text style={styles.uploadText}>Upload Logo</Text>
          </TouchableOpacity>
        )}

        {/* Certificate Colors */}
        <Text style={styles.sectionTitle}>Certificate Colors</Text>
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
                  <Check size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveTemplate}>
          <Check size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save Template</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles: reuse your previous styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F9FAFB" 
  },
  content: { 
    padding: 16, 
    paddingBottom: 55 
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 24 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    color: '#1B365D', 
    marginVertical: 16, 
    flex: 1 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1B365D", 
    marginTop: 24, 
    marginBottom: 12 
  },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: "#fff", fontSize: 14, color: "#111827" },
  textArea: { height: 80, textAlignVertical: 'top' },
  uploadButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 2, borderStyle: "dashed", borderColor: "#1B365D", borderRadius: 8, padding: 16, marginBottom: 16, backgroundColor: "#F0F4FF" },
  uploadText: { marginLeft: 8, color: "#1B365D", fontWeight: "600", fontSize: 14 },
  logoContainer: { alignItems: "center", marginBottom: 16, position: "relative" },
  logoPreview: { width: 120, height: 120, borderRadius: 12, borderWidth: 2, borderColor: "#E5E7EB" },
  removeLogoButton: { position: "absolute", top: -8, right: "35%", backgroundColor: "#EF4444", borderRadius: 12, padding: 4 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  colorOption: { width: "30%", aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderColor: "#E5E7EB", padding: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", position: "relative" },
  selectedColorOption: { borderColor: "#1B365D", borderWidth: 3 },
  colorPreview: { flexDirection: "row", gap: 4, marginBottom: 4 },
  colorCirclePrimary: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  colorCircleSecondary: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  colorName: { fontSize: 12, fontWeight: "600", color: "#374151", marginTop: 4 },
  checkMark: { position: "absolute", top: 4, right: 4, backgroundColor: "#1B365D", borderRadius: 10, padding: 2 },
  saveButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#1B365D", padding: 16, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16, marginLeft: 8 },
});
