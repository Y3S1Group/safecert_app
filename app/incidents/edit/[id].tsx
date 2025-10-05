import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin, Camera, X, Save } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebaseConfig'
import * as ImagePicker from 'expo-image-picker'
import { UploadImageToClooudinary } from '@/config/cloudinaryConfig'

interface SelectedMedia {
  uri: string;
  id: string;
  isNew: boolean;
}

export default function EditIncident() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [incidentType, setIncidentType] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [status, setStatus] = useState<'pending' | 'investigating' | 'resolved' | 'closed'>('pending')
  const [selectedImages, setSelectedImages] = useState<SelectedMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const incidentTypes = ['Injury', 'Near Miss', 'Hazard', 'Equipment Failure', 'Property Damage', 'Environmental']
  const priorities = ['low', 'medium', 'high', 'critical']
  const statuses = ['pending', 'investigating', 'resolved', 'closed']

  useEffect(() => {
    fetchIncident()
  }, [id])

  const fetchIncident = async () => {
    try {
      const docRef = doc(db, 'incidents', id as string)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        setIncidentType(data.incidentType)
        setLocation(data.location)
        setDescription(data.description)
        setPriority(data.priority)
        setStatus(data.status)
        
        // Load existing images
        if (data.imageUrls && data.imageUrls.length > 0) {
          const existingImages = data.imageUrls.map((url: string, index: number) => ({
            uri: url,
            id: `existing-${index}`,
            isNew: false
          }))
          setSelectedImages(existingImages)
        }
      } else {
        Alert.alert('Error', 'Incident not found')
        router.back()
      }
    } catch (error) {
      console.error('Error fetching incident:', error)
      Alert.alert('Error', 'Failed to load incident')
    } finally {
      setLoading(false)
    }
  }

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera roll permission is required')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const newImage: SelectedMedia = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
          isNew: true
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
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        const newImage: SelectedMedia = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
          isNew: true
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

  const showImageOptions = () => {
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

  const handleSave = async () => {
    if (!incidentType || !location.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    setSaving(true)

    try {
      // Upload new images to Cloudinary
      const newImages = selectedImages.filter(img => img.isNew)
      const existingImages = selectedImages.filter(img => !img.isNew)
      
      const newImageUrls: string[] = []
      for (const img of newImages) {
        try {
          const url = await UploadImageToClooudinary(img.uri)
          newImageUrls.push(url)
        } catch (error) {
          console.error('Failed to upload image:', error)
        }
      }

      // Combine existing and new image URLs
      const allImageUrls = [
        ...existingImages.map(img => img.uri),
        ...newImageUrls
      ]

      // Update incident in Firestore
      const docRef = doc(db, 'incidents', id as string)
      await updateDoc(docRef, {
        incidentType,
        location: location.trim(),
        description: description.trim(),
        priority,
        status,
        imageUrls: allImageUrls,
        totalImages: allImageUrls.length,
        updatedAt: serverTimestamp(),
      })

      Alert.alert('Success', 'Incident updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      console.error('Error updating incident:', error)
      Alert.alert('Error', 'Failed to update incident')
    } finally {
      setSaving(false)
    }
  }

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical': return '#EF4444'
      case 'high': return '#F97316'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Incident Report</Text>
          <View style={{ width: 24 }} />
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

          {/* Status */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Status*</Text>
            <View style={styles.priorityContainer}>
              {statuses.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusButton,
                    status === s && styles.statusButtonActive
                  ]}
                  onPress={() => setStatus(s as any)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    status === s && styles.statusButtonTextActive
                  ]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Priority*</Text>
            <View style={styles.priorityContainer}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    priority === p && styles.priorityButtonActive,
                    { borderColor: getPriorityColor(p) }
                  ]}
                  onPress={() => setPriority(p as any)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === p && { color: getPriorityColor(p) }
                  ]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
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
              placeholder="Describe what happened in detail..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Photos */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Photos</Text>
            <TouchableOpacity style={styles.photoUploadButton} onPress={showImageOptions}>
              <Camera size={24} color="#6B7280" />
              <Text style={styles.photoUploadText}>Add Photo</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewContainer}>
                <Text style={styles.imageCountText}>
                  {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}
                </Text>
                {selectedImages.map((image) => (
                  <View key={image.id} style={styles.imagePreview}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(image.id)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    {image.isNew && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={saving}
          >
            <Save size={24} color="#FFFFFF" style={styles.saveButtonIcon} />
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
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
    fontSize: 14,
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
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  statusButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusButtonTextActive: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  priorityButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    minHeight: 56,
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
  },
  photoUploadText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    marginTop: 16,
  },
  imageCountText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
})