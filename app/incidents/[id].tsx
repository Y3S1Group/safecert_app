import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, MapPin, Clock, AlertTriangle, Edit, Trash2, User, CheckCircle, DeleteIcon } from 'lucide-react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/config/firebaseConfig'
import { useSnackbar } from '@/contexts/SnackbarContext'
import { useAlert } from '@/contexts/AlertContext'

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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

  if (!incident) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.errorText}>Incident not found</Text>
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
          <Text style={styles.headerTitle}>Incident Details</Text>
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

        {/* Status and Priority Badges */}
        <View style={styles.badgeContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(incident.status) }]}>
            <Text style={styles.badgeText}>{incident.status.toUpperCase()}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(incident.priority) }]}>
            <Text style={styles.badgeText}>{incident.priority.toUpperCase()} PRIORITY</Text>
          </View>
        </View>

        {/* Incident Type */}
        <View style={styles.section}>
          <View style={styles.typeContainer}>
            <AlertTriangle size={32} color="#FF6B35" />
            <Text style={styles.incidentType}>{incident.incidentType}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <Text style={styles.sectionText}>{incident.location}</Text>
          {incident.detectedAddress && (
            <Text style={styles.detectedAddress}>Detected: {incident.detectedAddress}</Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{incident.description}</Text>
        </View>

        {/* Images */}
        {incident.imageUrls && incident.imageUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({incident.imageUrls.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imageGrid}>
                {incident.imageUrls.map((url, index) => (
                  <Image
                    key={index}
                    source={{ uri: url }}
                    style={styles.incidentImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Reported By */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Reported By</Text>
          </View>
          <Text style={styles.sectionText}>{incident.reportedByName}</Text>
          <Text style={styles.emailText}>{incident.reportedBy}</Text>
        </View>

        {/* Timestamps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>
          <View style={styles.timestampRow}>
            <Text style={styles.timestampLabel}>Created:</Text>
            <Text style={styles.timestampValue}>
              {incident.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
            </Text>
          </View>
          <View style={styles.timestampRow}>
            <Text style={styles.timestampLabel}>Last Updated:</Text>
            <Text style={styles.timestampValue}>
              {incident.updatedAt?.toDate?.()?.toLocaleString() || 'N/A'}
            </Text>
          </View>
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
    paddingBottom: 40,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginTop: 16,
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
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incidentType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  detectedAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  descriptionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  imageGrid: {
    flexDirection: 'row',
  },
  incidentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginRight: 12,
  },
  emailText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timestampLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  timestampValue: {
    fontSize: 14,
    color: '#374151',
  },
})