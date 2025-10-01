import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native'
import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AlertTriangle, MapPin, Camera, Check, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '@/config/firebaseConfig'

interface SelectedImage {
  uri: string;
  id: string;
}

export default function Reports() {
  const [submitted, setSubmitted] = useState(false)
  const [incidentType, setIncidentType] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])
  const [uploading, setUploading] = useState(false)

  const incidentTypes = ['Injury', 'Near Miss', 'Hazard', 'Equipment Failure']

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permission is required to upload images')
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const newImage: SelectedImage = {
          uri: result.assets[0].uri,
          id: Date.now().toString()
        }
        setSelectedImages(prev => [...prev, newImage])
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const takePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos')
        return
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const newImage: SelectedImage = {
          uri: result.assets[0].uri,
          id: Date.now().toString()
        }
        setSelectedImages(prev => [...prev, newImage])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo')
    }
  }

  const removeImage = (imageId: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== imageId))
  }

  const showImagePickerOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    )
  }

  const uploadImageToStorage = async (imageUri: string, fileName: string): Promise<string> => {
    try {
      // Fetch the image
      const response = await fetch(imageUri)
      const blob = await response.blob()

      // Create storage reference
      const imageRef = ref(storage, `incident-images/${fileName}`)
      
      // Upload image
      await uploadBytes(imageRef, blob)
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef)
      return downloadURL
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  const handleSubmit = async () => {
    if (!incidentType || !location.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to submit a report')
      return
    }

    setUploading(true)

    try {
      // Upload images to Firebase Storage
      const imageUrls: string[] = []
      for (const image of selectedImages) {
        const fileName = `${Date.now()}_${image.id}.jpg`
        const downloadURL = await uploadImageToStorage(image.uri, fileName)
        imageUrls.push(downloadURL)
      }

      // Save incident to Firestore
      const incidentData = {
        incidentType,
        location: location.trim(),
        description: description.trim(),
        imageUrls,
        reportedBy: auth.currentUser.email,
        reportedByUid: auth.currentUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, 'incidents'), incidentData)

      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting report:', error)
      Alert.alert('Error', 'Failed to submit report. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitAnother = () => {
    setSubmitted(false)
    setIncidentType('')
    setLocation('')
    setDescription('')
    setSelectedImages([])
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successMessage}>
            Thank you for reporting this incident. A safety officer will follow up shortly.
          </Text>
          <TouchableOpacity style={styles.submitAnotherButton} onPress={handleSubmitAnother}>
            <Text style={styles.submitAnotherButtonText}>Submit Another Report</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Alert Banner */}
        <View style={styles.alertBanner}>
          <AlertTriangle size={24} color="#B03A2E" style={styles.alertIcon} />
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Report Safety Incidents Immediately</Text>
            <Text style={styles.alertMessage}>Your report helps prevent future accidents.</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Incident Type */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Incident Type*</Text>
            <View style={styles.incidentTypeGrid}>
              {incidentTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.incidentTypeButton,
                    incidentType === type ? styles.incidentTypeButtonActive : styles.incidentTypeButtonInactive
                  ]}
                  onPress={() => setIncidentType(type)}
                >
                  <Text style={[
                    styles.incidentTypeButtonText,
                    incidentType === type ? styles.incidentTypeButtonTextActive : styles.incidentTypeButtonTextInactive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Location*</Text>
            <View style={styles.inputContainer}>
              <MapPin size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Building A, Floor 2, Room 201"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Description*</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe what happened..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Photo Upload */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Add Photos</Text>
            <TouchableOpacity style={styles.photoUploadButton} onPress={showImagePickerOptions}>
              <Camera size={24} color="#6B7280" />
              <Text style={styles.photoUploadText}>Take Photo or Upload</Text>
            </TouchableOpacity>

            {/* Display selected images */}
            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                {selectedImages.map((image) => (
                  <View key={image.id} style={styles.imagePreview}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(image.id)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={uploading}
          >
            <AlertTriangle size={24} color="#FFFFFF" style={styles.submitButtonIcon} />
            <Text style={styles.submitButtonText}>
              {uploading ? 'Submitting...' : 'Submit Incident Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// Add these new styles to your existing styles:
const styles = StyleSheet.create({
  // ... your existing styles ...
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 100,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    backgroundColor: '#2E86C1',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  submitAnotherButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  submitAnotherButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  alertBanner: {
    backgroundColor: 'rgba(176, 58, 46, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#B03A2E',
    padding: 16,
    flexDirection: 'row',
    marginBottom: 24,
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#6B7280',
  },
  form: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  incidentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  incidentTypeButton: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 56,
  },
  incidentTypeButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  incidentTypeButtonInactive: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  incidentTypeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  incidentTypeButtonTextActive: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  incidentTypeButtonTextInactive: {
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
  },
  photoUploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 80,
  },
  photoUploadText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  imagePreview: {
    position: 'relative',
    marginRight: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#B03A2E',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
})