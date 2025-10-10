import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin, Clock, AlertTriangle, Edit, Trash2, User, CheckCircle, DeleteIcon, ChevronLeft, Calendar, Info, FileText, Image as ImageIcon } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/config/firebaseConfig'
import { useSnackbar } from '@/contexts/SnackbarContext'
import { useAlert } from '@/contexts/AlertContext'

const { width } = Dimensions.get('window')

interface Incident {
  id: string;
  incidentType: string;
  location: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  imageUrls: string[];
  videoUrls?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  detectedAddress?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'closed';
  reportedBy: string;
  reportedByName: string;
  createdAt: any;
  updatedAt: any;
}

export default function IncidentDetails() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const { showSnackbar } = useSnackbar()
  const { showAlert } = useAlert()

  useEffect(() => {
    fetchIncident()
  }, [id])

  const fetchIncident = async () => {
    try {
      const docRef = doc(db, 'incidents', id as string)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        setIncident({ id: docSnap.id, ...docSnap.data() } as Incident)
      } else {
        showAlert({
        message: 'Incident not found',
        icon: AlertTriangle,
        iconColor: '#EF4444',
        iconBgColor: '#eeefeeff',
        autoClose: true,
        autoCloseDelay: 2000
      })

      setTimeout(() => {
        router.back()
      }, 2000)
      }
    } catch (error) {
      console.error('Error fetching incident:', error)
      showSnackbar({
        message: 'Failed to load incident details',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    showAlert({
      message: 'Are you sure you want to delete this incident report? This action cannot be undone.',
      icon: Trash2,
      iconColor: '#EF4444' ,
      iconBgColor: '#eeefeeff',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Cancelled')
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'incidents', id as string))
              showAlert({
                message: 'Report deleted successfully',
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
              console.error('Error deleting incident:', error)
              showSnackbar({
                message: 'Failed to delete report',
                type: 'error'
              })
            }
          }
        }
      ]
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B'
      case 'investigating': return '#3B82F6'
      case 'resolved': return '#10B981'
      case 'closed': return '#6B7280'
      default: return '#6B7280'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FEF3C7'
      case 'investigating': return '#DBEAFE'
      case 'resolved': return '#D1FAE5'
      case 'closed': return '#F3F4F6'
      default: return '#F3F4F6'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock
      case 'investigating': return AlertTriangle
      case 'resolved': return CheckCircle
      case 'closed': return CheckCircle
      default: return Clock
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#EF4444'
      case 'high': return '#F97316'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  const getPriorityBgColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#FEE2E2'
      case 'high': return '#FFEDD5'
      case 'medium': return '#FEF3C7'
      case 'low': return '#D1FAE5'
      default: return '#F3F4F6'
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'N/A'
    const date = timestamp.toDate()
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp?.toDate) return ''
    const date = timestamp.toDate()
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(timestamp)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <AlertTriangle size={40} color="#FF6B35" />
          </View>
          <Text style={styles.loadingText}>Loading details...</Text>
          <Text style={styles.loadingSubtext}>Please wait</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <AlertTriangle size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorText}>Incident not found</Text>
          <Text style={styles.errorSubtext}>This incident may have been deleted</Text>
        </View>
      </SafeAreaView>
    )
  }

  const StatusIcon = getStatusIcon(incident.status)

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Incident Details</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push(`/incidents/edit/${incident.id}`)}
          >
            <Edit size={20} color="#FF6B35" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
          >
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Info Card */}
        <View style={styles.mainCard}>
          {/* Incident Type with Priority Badge */}
          <View style={styles.typeSection}>
            <View style={styles.typeHeader}>
              <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(incident.priority) }]} />
              <View style={styles.typeInfo}>
                <Text style={styles.incidentType}>{incident.incidentType}</Text>
                <Text style={styles.reportedTime}>{getRelativeTime(incident.createdAt)}</Text>
              </View>
            </View>
            
            <View style={[styles.priorityBadge, { 
              backgroundColor: getPriorityBgColor(incident.priority),
              borderColor: getPriorityColor(incident.priority)
            }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(incident.priority) }]}>
                {incident.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Status Banner */}
          <View style={[styles.statusBanner, { 
            backgroundColor: getStatusBgColor(incident.status)
          }]}>
            <StatusIcon size={18} color={getStatusColor(incident.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(incident.status) }]}>
              {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
            </Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <FileText size={18} color="#6B7280" />
              <Text style={styles.sectionLabel}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>{incident.description}</Text>
          </View>

          {/* Location */}
          <View style={styles.locationSection}>
            <View style={styles.sectionHeader}>
              <MapPin size={18} color="#6B7280" />
              <Text style={styles.sectionLabel}>Location</Text>
            </View>
            {/* <Text style={styles.locationText}>{incident.location}</Text> */}
            {incident.detectedAddress && (
              <View style={styles.detectedLocationBadge}>
                <Info size={12} color="#FF6B35" />
                <Text style={styles.detectedLocationText}>{incident.detectedAddress}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Images Gallery */}
        {incident.imageUrls && incident.imageUrls.length > 0 && (
          <View style={styles.galleryCard}>
            <View style={styles.galleryHeader}>
              <View style={styles.galleryHeaderLeft}>
                <ImageIcon size={20} color="#FF6B35" />
                <Text style={styles.galleryTitle}>Evidence Photos</Text>
              </View>
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>{incident.imageUrls.length}</Text>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageGallery}
            >
              {incident.imageUrls.map((url, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image
                    source={{ uri: url }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageNumber}>{index + 1}/{incident.imageUrls.length}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reporter & Timeline Card */}
        <View style={styles.metaCard}>
          {/* Reporter Info */}
          <View style={styles.reporterSection}>
            <Text style={styles.metaSectionTitle}>Reported By</Text>
            <View style={styles.reporterInfo}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {incident.reportedByName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.reporterDetails}>
                <Text style={styles.reporterName}>{incident.reportedByName}</Text>
                <Text style={styles.reporterEmail}>{incident.reportedBy}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.metaSectionTitle}>Timeline</Text>
            
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <View style={styles.timelineRow}>
                  <Clock size={14} color="#6B7280" />
                  <Text style={styles.timelineLabel}>Created</Text>
                </View>
                <Text style={styles.timelineDate}>{formatDate(incident.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: '#10B981' }]} />
              <View style={styles.timelineContent}>
                <View style={styles.timelineRow}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.timelineLabel}>Updated</Text>
                </View>
                <Text style={styles.timelineDate}>{formatDate(incident.updatedAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
  },

  // Main Card
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  typeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  typeHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  priorityIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
  typeInfo: {
    flex: 1,
  },
  incidentType: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 28,
  },
  reportedTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    marginLeft: 26,
    color: '#374151',
  },
  locationSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  locationText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    lineHeight: 22,
  },
  detectedLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEF3E2',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  detectedLocationText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },

  // Gallery Card
  galleryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  galleryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  galleryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  imageCountBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  imageGallery: {
    gap: 12,
    paddingRight: 8,
    marginLeft: 22,
  },
  imageContainer: {
    position: 'relative',
  },
  galleryImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  imageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  imageNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Meta Card
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  metaSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  reporterSection: {
    marginBottom: 20,
  },
  reporterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reporterDetails: {
    flex: 1,
  },
  reporterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  reporterEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  timelineSection: {
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B35',
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timelineLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 4,
    marginVertical: 8,
  },
})