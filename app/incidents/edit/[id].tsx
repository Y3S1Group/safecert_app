import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin, Camera, X, Save, ChevronLeft, FileText, MapPinned, CheckCircle, AlertTriangle } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { UploadImageToClooudinary } from '@/config/cloudinaryConfig'
import { useSnackbar } from '@/contexts/SnackbarContext'
import { useAlert } from '@/contexts/AlertContext'
import { sendNotification } from '@/utils/notifications'

interface SelectedMedia {
  uri: string;
  id: string;
  isNew: boolean;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
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
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showSnackbar } = useSnackbar()
  const { showAlert } = useAlert()

  const incidentTypes = ['Injury', 'Near Miss', 'Hazard', 'Equipment Failure', 'Property Damage', 'Environmental']
  const priorities = [
    { key: 'low', label: 'Low' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'High' },
    { key: 'critical', label: 'Critical' }
  ]
  const statuses = [
    { key: 'pending', label: 'Pending' },
    { key: 'investigating', label: 'Investigating' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' }
  ]

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
        
        if (data.imageUrls && data.imageUrls.length > 0) {
          const existingImages = data.imageUrls.map((url: string, index: number) => ({
            uri: url,
            id: `existing-${index}`,
            isNew: false
          }))
          setSelectedImages(existingImages)
        }
      } else {
        showAlert({
          message: 'Incident not found',
          icon: AlertTriangle,
          iconColor: '#EF4444',
          iconBgColor: '#fad5d1ff',
          autoClose: true,
          autoCloseDelay: 1500
        })
        router.back()
      }
    } catch (error) {
      console.error('Error fetching incident:', error)
      showSnackbar({
          message: 'Failed to load incident',
          type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const pickImage = async () => {
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
      showSnackbar({
          message: 'Failed to pick media',
          type: 'error'
      })
    }
  }

  const takePhoto = async () => {
    try {
      const { status} = await ImagePicker.requestCameraPermissionsAsync()
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
        const newImage: SelectedMedia = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
          isNew: true
        }
        setSelectedImages(prev => [...prev, newImage])
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      showSnackbar({
          message: 'Failed to take photo',
          type: 'error'
      })
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
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    )
  }

  const handleSave = async () => {
  if (!incidentType || !location.trim() || !description.trim()) {
    showSnackbar({
      message: 'Please fill in all required fields',
      type: 'error'
    })
    return
  }

  setSaving(true)

  try {
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

    const allImageUrls = [
      ...existingImages.map(img => img.uri),
      ...newImageUrls
    ]

    const docRef = doc(db, 'incidents', id as string)
    const incidentDoc = await getDoc(docRef)
    const incidentData = incidentDoc.data()

    console.log('Incident data:', incidentData)
    console.log('Current user UID:', auth.currentUser?.uid)
    console.log('Reporter UID:', incidentData?.reportedByUid)

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

    // Always send notification for testing (remove the condition)
    if (incidentData?.reportedByUid) {
      console.log('About to send notification...')
      try {
        await sendNotification(
          incidentData.reportedByUid,
          'Report Updated',
          `Your ${incidentType} report has been updated. Status: ${status}`,
          'info'
        )
        console.log('Notification sent successfully!')
      } catch (notifError) {
        console.error('Error sending notification:', notifError)
      }
    } else {
      console.log('No reportedByUid found in incident data')
    }

    showAlert({
      message: 'Incident report has been updated successfully!',
      icon: CheckCircle,
      iconColor: '#10B981',
      iconBgColor: '#D1FAE5',
      autoClose: true,
      autoCloseDelay: 2000
    })

    setTimeout(() => {
      router.back()
    }, 2000)

  } catch (error) {
    console.error('Error updating incident:', error)
    showSnackbar({
      message: 'Failed to update incident. Please try again.',
      type: 'error'
    })
  } finally {
    setSaving(false)
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

  const getStatusColor = (s: string): string => {
    switch (s) {
      case 'pending': return '#F59E0B'
      case 'investigating': return '#3B82F6'
      case 'resolved': return '#10B981'
      case 'closed': return '#6B7280'
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
          <ChevronLeft size={24} style={styles.backButton} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Edit Report</Text>
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

          {/* Status */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Text style={styles.formLabel}>
                Status <Text style={styles.required}>*</Text>
              </Text>
            </View>
            <View style={styles.statusGrid}>
              {statuses.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.statusButton,
                    { borderColor: getStatusColor(s.key) },
                    status === s.key && {
                      backgroundColor: getStatusColor(s.key) + '13',
                      borderColor: getStatusColor(s.key)
                    }
                  ]}
                  onPress={() => setStatus(s.key as any)}
                >
                  <Text style={[
                    styles.statusButtonText,
                    status === s.key && { color: getStatusColor(s.key) }
                  ]}>
                    {s.label}
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
                    const loc = await Location.getCurrentPositionAsync({
                      accuracy: Location.Accuracy.Balanced
                    })

                    const address = await Location.reverseGeocodeAsync({
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                    })
                    if (address[0]) {
                      const isPlusCode = (str: string | null) => {
                        if (!str) return false
                        return /^[A-Z0-9]{4}\+[A-Z0-9]{2,3}$/.test(str)
                      }
                      const addressParts = [
                        address[0].city,
                        address[0].district,
                        address[0].subregion,
                        address[0].region,
                        address[0].street,
                        address[0].name
                      ].filter(part => {
                        if (!part) return false
                        if (part === 'null' || part === 'undefined') return false
                        if (isPlusCode(part)) return false
                        return true
                      })

                      const formattedAddress = addressParts.length > 0
                        ? addressParts.slice(0, 2).join(', ')
                        : `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`
                      const locationData: LocationData = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        address: formattedAddress
                      }
                      setCurrentLocation(locationData)
                      setLocation(formattedAddress)
                      showSnackbar({
                        message: 'GPS location detected successfully',
                        type: 'success',
                        duration: 2000
                      })
                    } else {
                      const coordsString = `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`

                      const locationData: LocationData = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        address: coordsString
                      }

                      setCurrentLocation(locationData)
                      setLocation(coordsString)
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
            <TextInput
              style={styles.textArea}
              placeholder="Describe the incident in detail..."
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
            <Text style={styles.formLabel}>Photos & Evidence</Text>
            <TouchableOpacity style={styles.mediaButton} onPress={showImageOptions}>
              <Camera size={20} color="#FF6B35" />
              <Text style={styles.mediaButtonText}>Add Photos</Text>
            </TouchableOpacity>

            {selectedImages.length > 0 && (
              <View style={styles.mediaGrid}>
                {selectedImages.map((image) => (
                  <View key={image.id} style={styles.mediaItem}>
                    <Image source={{ uri: image.uri }} style={styles.mediaPreview} />
                    <TouchableOpacity
                      style={styles.removeMediaButton}
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
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerIcon: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  formSection: {
    padding: 20,
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
    fontWeight: '600',
    color: '#111827',
  },
  required: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: 'bold',
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
    gap: 10,
  },
  priorityButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    minWidth: '22%',
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: "wrap",
    gap: 10,
  },
  statusButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
    minWidth: '22%',
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    marginLeft: 8,
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
  
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  mediaButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  mediaItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 4,
  },
  newBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
})