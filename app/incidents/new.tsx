import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, AlertTriangle, MapPin, Camera, Video, X, Image as ImageIcon, MapPinned, FileText, ChevronLeft, AlignJustifyIcon, CheckCircle } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import { uploadMultipleImages } from '@/config/cloudinaryConfig'
import { useRouter } from 'expo-router'
import { useSnackbar } from '@/contexts/SnackbarContext'
import { useAlert } from '@/contexts/AlertContext'

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
  const { showSnackbar } = useSnackbar()
  const { showAlert } = useAlert()

  const incidentTypes = ['Injury', 'Near Miss', 'Hazard', 'Equipment Failure', 'Property Damage', 'Environmental']
  const priorities = [
    { key: 'low', label: 'Low', icon: '🟢' },
    { key: 'medium', label: 'Medium', icon: '🟡' },
    { key: 'high', label: 'High', icon: '🟠' },
    { key: 'critical', label: 'Critical', icon: '🔴' }
  ]

  // const getCurrentLocation = async () => {
  //   console.log('Getting current location...')
  //   try {
  //     const { status } = await Location.requestForegroundPermissionsAsync()
  //     console.log('Location permission status:', status)
  //     if (status !== 'granted') {
  //       Alert.alert('Permission denied', 'Location permission is required for incident reporting')
  //       console.log('Location permission denied - showing alert')
  //       return
  //     }

  //     const location = await Location.getCurrentPositionAsync({})
  //     const address = await Location.reverseGeocodeAsync({
  //       latitude: location.coords.latitude,
  //       longitude: location.coords.longitude,
  //     })

  //     const locationData: LocationData = {
  //       latitude: location.coords.latitude,
  //       longitude: location.coords.longitude,
  //       address: address[0] ? `${address[0].street}, ${address[0].city}` : undefined
  //     }

  //     setCurrentLocation(locationData)
  //     if (address[0] && !location) {
  //       setLocation(`${address[0].street}, ${address[0].city}`)
  //     }
  //   } catch (error) {
  //     console.error('Error getting location:', error)
  //   }
  // }

  console.log('=== About to return JSX ===')

  const pickMedia = async (mediaType: 'image' | 'video') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        showSnackbar({
          message: 'Media library permission is required',
          type: 'warning'
      })
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 30,
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
      showSnackbar({
          message: 'Failed to pick media',
          type: 'error'
      })
    }
  }

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        showSnackbar({
          message: 'Camera permission is required',
          type: 'warning'
        })
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
      showSnackbar({
          message: 'Failed to take photo',
          type: 'error'
      })
    }
  }

  const recordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        showSnackbar({
          message: 'Camera permission is required',
          type: 'warning'
        })
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
      showSnackbar({
          message: 'Failed to record video',
          type: 'error'
        })
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
    if (uploading) return 
    
    if (!incidentType || !location.trim() || !description.trim()) {
      showSnackbar({
        message: 'Please fill in all required fields',
        type: 'error',
        duration: 3000
      })
      return 
    }

    if (!auth.currentUser) {
      showSnackbar({
        message: 'You must be logged in to submit a report',
        type: 'error'
      })
      return
    }

    setUploading(true)

    try {
      const images = selectedMedia.filter(media => media.type === 'image')
      const videos = selectedMedia.filter(media => media.type === 'video')

      const imageUrls: string[] = []
      if (images.length > 0) {
        const imageUris = images.map(img => img.uri)
        const uploadedImages = await uploadMultipleImages(imageUris, {
          folder: 'safety-incidents',
          quality: 'auto',
        })
        imageUrls.push(...uploadedImages)
      }

      const videoUrls: string[] = []

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

      showAlert({
        message: 'Incident report submitted successfully!',
        icon: CheckCircle,
        iconColor: '#10B981',
        iconBgColor: '#D1FAE5',
        autoClose: true,
        autoCloseDelay: 2000
      })

      setTimeout(() => {
        router.back()
      }, 2000)

      router.back()
    } catch (error) {
      console.error('Error submitting report:', error)
      showSnackbar({
        message: 'Failed to submit report. Please try again.',
        type: 'error',
        duration: 4000
      })
    } finally {
      setUploading(false)
    }
  }

  const getPriorityColor = (p: string): string => {
    switch (p) {
      case 'critical': return '#EF4444'
      case 'high': return '#F97316'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} style={styles.backButtonIcon} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>New Report</Text>
          {/* <Text style={styles.headerSubtitle}>Fill in the details below</Text> */}
        </View>
        <View style={styles.headerIcon}>
          <FileText size={24} color="#FF6B35" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Incident Type */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.formLabel}>
                Incident Type <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <View style={styles.incidentTypeGrid}>
              {incidentTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.incidentTypeButton,
                    incidentType === type && styles.incidentTypeButtonActive
                  ]}
                  onPress={() => setIncidentType(type)}
                >
                  <Text style={[
                    styles.incidentTypeButtonText,
                    incidentType === type && styles.incidentTypeButtonTextActive
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.formLabel}>
                Priority <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <View style={styles.priorityGrid}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.priorityButton,
                    { borderColor: getPriorityColor(p.key) },
                    priority === p.key && {
                      backgroundColor: getPriorityColor(p.key) + '13',
                      borderColor: getPriorityColor(p.key)
                    }
                  ]}
                  onPress={() => setPriority(p.key as any)}
                >
                  <Text style={[
                    styles.priorityButtonText,
                    priority === p.key && { color: getPriorityColor(p.key) }
                  ]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Details */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.formLabel}>
                Location <Text style={styles.required}>*</Text>
              </Text>
            </View>

            <View style={styles.locationInputContainer}>
              <View style={styles.inputContainer}>
                <MapPin size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter location manually"
                  placeholderTextColor="#9CA3AF"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <TouchableOpacity
                style={styles.gpsButton}
                onPress={async () => {
                  try {
                    const { status } = await Location.requestForegroundPermissionsAsync()
                    if (status !== 'granted') {
                      showSnackbar({
                        message: 'Location permission is required to use GPS',
                        type: 'warning'
                      })
                      return
                    }

                    const loc = await Location.getCurrentPositionAsync({})
                    const address = await Location.reverseGeocodeAsync({
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                    })

                    const locationData: LocationData = {
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                      address: address[0] ? `${address[0].street}, ${address[0].city}` : undefined
                    }

                    setCurrentLocation(locationData)

                    // Fill the location input with GPS address
                    if (address[0]) {
                      const city = address[0].city || ''
                      const district = address[0].district || address[0].subregion || ''
                      setLocation(`${city}${city && district ? ', ' : ''}${district}`)
                    } else {
                      setLocation(`${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`)
                    }
                  } catch (error) {
                    console.error('Error getting GPS location:', error)
                    showSnackbar({
                        message: 'Failed to get GPS location',
                        type: 'error'
                    })
                  }
                }}
              >
                <MapPinned size={18} color="#FF6B35" />

              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.formLabel}>
                Description <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe what happened in detail. Include any relevant information about the incident..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
              />
              <View style={styles.charCounter}>
                <Text style={styles.charCounterText}>
                  {description.length} characters
                </Text>
              </View>
            </View>
          </View>

          {/* Media Upload */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.formLabel}>Attachments</Text>
              <Text style={styles.optionalText}>Optional</Text>
            </View>

            {selectedMedia.length === 0 ? (
              <TouchableOpacity
                style={styles.mediaUploadButton}
                onPress={showMediaOptions}
              >
                <View style={styles.mediaUploadIconContainer}>
                  <Camera size={28} color="#FF6B35" />
                </View>
                <Text style={styles.mediaUploadTitle}>Add Photos or Videos</Text>
                <Text style={styles.mediaUploadSubtitle}>
                  Take a photo/video or choose from library
                </Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.mediaHeader}>
                  <View style={styles.mediaCount}>
                    <ImageIcon size={16} color="#6B7280" />
                    <Text style={styles.mediaCountText}>
                      {selectedMedia.length} file{selectedMedia.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={showMediaOptions}>
                    <Text style={styles.addMoreText}>+ Add More</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.mediaGrid}>
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
                        <X size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            uploading && styles.submitButtonLoading
          ]}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          {uploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 36,
    height: 36,
    borderWidth: 0.3,
    borderRadius: 20,
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    color: '#111827',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  locationBanner: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationBannerContent: {
    flex: 1,
  },
  locationBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  locationBannerText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 16,
  },
  formSection: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  requiredBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  optionalText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  incidentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  incidentTypeButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 0.8,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    position: 'relative',
  },
  incidentTypeButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  incidentTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  incidentTypeButtonTextActive: {
    color: '#FF6B35',
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  priorityButtonActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  priorityButtonTextActive: {
    color: '#FF6B35',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 54,
  },
  inputIconContainer: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 12,
  },
  useLocationButton: {
    backgroundColor: '#FFF5F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  useLocationText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '700',
  },
  textAreaWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  textArea: {
    padding: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 140,
    lineHeight: 22,
  },
  charCounter: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  charCounterText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  mediaUploadButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
  },
  mediaUploadIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mediaUploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  mediaUploadSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  mediaCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaCountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  addMoreText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaPreview: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonLoading: {
    opacity: 0.7, 
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3F2',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#FF6B35',
    minWidth: 50,
  },
  inputContainer: {
    flex: 1,  // Add this
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 14,
  },
  required: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
  },
})