import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, AlertTriangle, MapPin, Camera, Video, Check, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import { uploadMultipleImages } from '@/config/cloudinaryConfig'
import { useRouter } from 'expo-router'

interface SelectedMedia {
  uri: string;
  type: 'image' | 'video';
  id: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export default function CreateIncident() {
  const router = useRouter()

  console.log('=== CREATE INCIDENT COMPONENT MOUNTED ===')
  console.log('Component is rendering')

  const [incidentType, setIncidentType] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([])
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [uploading, setUploading] = useState(false)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')

  const incidentTypes = ['Injury', 'Near Miss', 'Hazard', 'Equipment Failure', 'Property Damage', 'Environmental']
  const priorities = ['low', 'medium', 'high', 'critical']

  useEffect(() => {
    console.log('=== useEffect: getCurrentLocation called ===')
    getCurrentLocation()
  }, [])

  const getCurrentLocation = async () => {
    console.log('Getting current location...')
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      console.log('Location permission status:', status)
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for incident reporting')
        console.log('Location permission denied - showing alert')
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      })

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0] ? `${address[0].street}, ${address[0].city}` : undefined
      }

      setCurrentLocation(locationData)
      if (address[0] && !location) {
        setLocation(`${address[0].street}, ${address[0].city}`)
      }
    } catch (error) {
      console.error('Error getting location:', error)
    }
  }

  console.log('=== About to return JSX ===')

  const pickMedia = async (mediaType: 'image' | 'video') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Media library permission is required')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 30, // 30 seconds max
      })

      if (!result.canceled && result.assets[0]) {
        const newMedia: SelectedMedia = {
          uri: result.assets[0].uri,
          type: mediaType,
          id: Date.now().toString()
        }
        setSelectedMedia(prev => [...prev, newMedia])
      }
    } catch (error) {
      console.error('Error picking media:', error)
      Alert.alert('Error', 'Failed to pick media')
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
        const newMedia: SelectedMedia = {
          uri: result.assets[0].uri,
          type: 'image',
          id: Date.now().toString()
        }
        setSelectedMedia(prev => [...prev, newMedia])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Error', 'Failed to take photo')
    }
  }

  const recordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required')
        return
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 30,
      })

      if (!result.canceled && result.assets[0]) {
        const newMedia: SelectedMedia = {
          uri: result.assets[0].uri,
          type: 'video',
          id: Date.now().toString()
        }
        setSelectedMedia(prev => [...prev, newMedia])
      }
    } catch (error) {
      console.error('Error recording video:', error)
      Alert.alert('Error', 'Failed to record video')
    }
  }

  const removeMedia = (mediaId: string) => {
    setSelectedMedia(prev => prev.filter(media => media.id !== mediaId))
  }

  const showMediaOptions = () => {
    Alert.alert(
      'Add Media',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Record Video', onPress: recordVideo },
        { text: 'Photo Library', onPress: () => pickMedia('image') },
        { text: 'Video Library', onPress: () => pickMedia('video') },
        { text: 'Cancel', style: 'cancel' }
      ]
    )
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
      // Separate images and videos
      const images = selectedMedia.filter(media => media.type === 'image')
      const videos = selectedMedia.filter(media => media.type === 'video')

      // Upload images to Cloudinary
      const imageUrls: string[] = []
      if (images.length > 0) {
        const imageUris = images.map(img => img.uri)
        const uploadedImages = await uploadMultipleImages(imageUris, {
          folder: 'safety-incidents',
          quality: 'auto',
        })
        imageUrls.push(...uploadedImages)
      }

      // For videos, you might want to use a different service or store locally for now
      const videoUrls: string[] = []
      // TODO: Implement video upload to Cloudinary or another service

      // Save incident data to Firestore
      const incidentData = {
        incidentType,
        location: location.trim(),
        description: description.trim(),
        priority,
        imageUrls,
        videoUrls,
        coordinates: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        } : null,
        detectedAddress: currentLocation?.address || null,
        totalImages: imageUrls.length,
        totalVideos: videoUrls.length,
        reportedBy: auth.currentUser.email,
        reportedByUid: auth.currentUser.uid,
        reportedByName: auth.currentUser.displayName || 'Unknown User',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await addDoc(collection(db, 'incidents'), incidentData)
      
      Alert.alert('Success', 'Incident report submitted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      console.error('Error submitting report:', error)
      Alert.alert('Error', 'Failed to submit report. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Incident Report</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Current Location */}
        {currentLocation && (
          <View style={styles.locationBanner}>
            <MapPin size={16} color="#10B981" />
            <Text style={styles.locationBannerText}>
              Current location detected: {currentLocation.address || 'Coordinates captured'}
            </Text>
          </View>
        )}

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
              <TouchableOpacity onPress={getCurrentLocation}>
                <Text style={styles.useLocationText}>Use Current</Text>
              </TouchableOpacity>
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

          {/* Media Upload */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Add Photos & Videos</Text>
            <TouchableOpacity style={styles.mediaUploadButton} onPress={showMediaOptions}>
              <View style={styles.mediaUploadContent}>
                <Camera size={24} color="#6B7280" />
                <Video size={24} color="#6B7280" />
              </View>
              <Text style={styles.mediaUploadText}>Take Photo/Video or Upload from Library</Text>
            </TouchableOpacity>

            {/* Display selected media */}
            {selectedMedia.length > 0 && (
              <View style={styles.mediaPreviewContainer}>
                <Text style={styles.mediaCountText}>
                  {selectedMedia.length} file{selectedMedia.length !== 1 ? 's' : ''} selected
                </Text>
                {selectedMedia.map((media) => (
                  <View key={media.id} style={styles.mediaPreview}>
                    {media.type === 'image' ? (
                      <Image source={{ uri: media.uri }} style={styles.previewImage} />
                    ) : (
                      <View style={styles.videoPreview}>
                        <Video size={32} color="#FFFFFF" />
                        <Text style={styles.videoText}>Video</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeMediaButton}
                      onPress={() => removeMedia(media.id)}
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
              {uploading ? 'Submitting Report...' : 'Submit Incident Report'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return '#EF4444'
    case 'high': return '#F97316'
    case 'medium': return '#F59E0B'
    case 'low': return '#10B981'
    default: return '#6B7280'
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  } as const,
  scrollView: {
    flex: 1,
  } as const,
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  } as const,
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  } as const,
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  } as const,
  locationBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  } as const,
  locationBannerText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 8,
    flex: 1,
  } as const,
  form: {
    flex: 1,
  } as const,
  formGroup: {
    marginBottom: 24,
  } as const,
  formLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  } as const,
  incidentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  } as const,
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
  } as const,
  incidentTypeButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  } as const,
  incidentTypeButtonInactive: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  } as const,
  incidentTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  } as const,
  incidentTypeButtonTextActive: {
    color: '#FF6B35',
    fontWeight: 'bold',
  } as const,
  incidentTypeButtonTextInactive: {
    color: '#6B7280',
  } as const,
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as const,
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    marginHorizontal: 4,
  } as const,
  priorityButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  } as const,
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  } as const,
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  } as const,
  inputIcon: {
    marginRight: 12,
  } as const,
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  } as const,
  useLocationText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  } as const,
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
  } as const,
  mediaUploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  mediaUploadContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  } as const,
  mediaUploadText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  } as const,
  mediaPreviewContainer: {
    marginTop: 16,
  } as const,
  mediaCountText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  } as const,
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  } as const,
  mediaPreview: {
    position: 'relative',
    marginRight: 12,
    marginBottom: 12,
  } as const,
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  } as const,
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  removeMediaButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  submitButton: {
    backgroundColor: '#B03A2E',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  } as const,
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  } as const,
  submitButtonIcon: {
    marginRight: 8,
  } as const,
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  } as const,
  videoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#000',
  } as const,
  videoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  } as const,
})