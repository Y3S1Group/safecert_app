import { auth, db } from '@/config/firebaseConfig'
import { useRouter } from 'expo-router'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { AlertTriangle, Clock, Edit, Eye, MapPin, Plus, Search, Trash2, TrendingUp, FileText, Image as ImageIcon, Video, CheckCircle } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import FloatingButton from '@/components/FloatingButton'
import { useSnackbar } from '@/contexts/SnackbarContext'
import { useAlert } from '@/contexts/AlertContext'

interface Incident {
  id: string;
  incidentType: string;
  location: string;
  description: string;
  imageUrls: string[];
  videoUrls?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
  reportedByUid: string;
  createdAt: any;
  updatedAt: any;
}

export default function Reports() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const { showSnackbar } = useSnackbar()
    const { showAlert } = useAlert()

  useEffect(() => {
    if (!auth.currentUser) return

    const q = query(
      collection(db, 'incidents'),
      where('reportedByUid', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentsList: Incident[] = []
      snapshot.forEach((doc) => {
        incidentsList.push({ id: doc.id, ...doc.data() } as Incident)
      })
      setIncidents(incidentsList)
      setFilteredIncidents(incidentsList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = incidents

    if (filterStatus !== 'all') {
      filtered = filtered.filter(incident => incident.status === filterStatus)
    }

    if (searchQuery) {
      filtered = filtered.filter(incident => 
        incident.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.incidentType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredIncidents(filtered)
  }, [incidents, filterStatus, searchQuery])

  const handleDeleteIncident = async (incidentId: string) => {
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
              await deleteDoc(doc(db, 'incidents', incidentId))
              showAlert({
                      message: 'Report deleted successfully',
                      icon: CheckCircle,
                      iconColor: '#10B981',
                      iconBgColor: '#D1FAE5',
                      autoClose: true,
                      autoCloseDelay: 1500
                    })
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

  const renderIncidentCard = ({ item }: { item: Incident }) => (
    <TouchableOpacity 
      style={styles.incidentCard}
      onPress={() => router.push(`/incidents/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {/* Priority indicator bar */}
      <View style={[styles.priorityBar, { backgroundColor: getPriorityColor(item.priority) }]} />
      
      <View style={styles.cardContent}>
        {/* Header with status and priority */}
        <View style={styles.cardHeader}>
          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { borderColor: getPriorityColor(item.priority) }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Incident Type */}
        <Text style={styles.cardTitle} numberOfLines={1}>{item.incidentType}</Text>

        {/* Location */}
        <View style={styles.locationContainer}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
        </View>

        {/* Description */}
        <Text style={styles.descriptionText} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Footer with metadata */}
        <View style={styles.cardFooter}>
          <View style={styles.metaContainer}>
            <Clock size={12} color="#9CA3AF" />
            <Text style={styles.metaText}>
              {item.createdAt?.toDate?.()?.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }) || 'Recent'}
            </Text>
          </View>
          
          <View style={styles.attachmentsContainer}>
            {item.imageUrls && item.imageUrls.length > 0 && (
              <View style={styles.attachmentBadge}>
                <ImageIcon size={12} color="#6B7280" />
                <Text style={styles.attachmentCount}>{item.imageUrls.length}</Text>
              </View>
            )}
            {item.videoUrls && item.videoUrls.length > 0 && (
              <View style={styles.attachmentBadge}>
                <Video size={12} color="#6B7280" />
                <Text style={styles.attachmentCount}>{item.videoUrls.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation()
              router.push(`/incidents/${item.id}` as any)
            }}
          >
            <Eye size={16} color="#6B7280" />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation()
              router.push(`/incidents/edit/${item.id}` as any)
            }}
          >
            <Edit size={16} color="#6B7280" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={(e) => {
              e.stopPropagation()
              handleDeleteIncident(item.id)
            }}
          >
            <Trash2 size={16} color="#EF4444" />
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Incident Reports</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.listContainer}>
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by location, type, or description..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButton}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status Filter Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {[
            { key: 'all', label: 'All', count: incidents.length },
            { key: 'pending', label: 'Pending', count: incidents.filter(i => i.status === 'pending').length },
            { key: 'investigating', label: 'In Progress', count: incidents.filter(i => i.status === 'investigating').length },
            { key: 'resolved', label: 'Resolved', count: incidents.filter(i => i.status === 'resolved').length },
            { key: 'closed', label: 'Closed', count: incidents.filter(i => i.status === 'closed').length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterPill,
                filterStatus === filter.key && styles.filterPillActive
              ]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Text style={[
                styles.filterPillText,
                filterStatus === filter.key && styles.filterPillTextActive
              ]}>
                {filter.label}
              </Text>
              <View style={[
                styles.filterCount,
                filterStatus === filter.key && styles.filterCountActive
              ]}>
                <Text style={[
                  styles.filterCountText,
                  filterStatus === filter.key && styles.filterCountTextActive
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results count */}
        {searchQuery.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {filteredIncidents.length} result{filteredIncidents.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        )}

        {/* Incidents List */}
        <FlatList
          data={filteredIncidents}
          renderItem={renderIncidentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={{ marginTop: 0 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertTriangle size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No incident reports</Text>
              <Text style={styles.emptyText}>
                {searchQuery ? 'Try adjusting your search' : 'Create your first incident report to get started'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Floating Action Buttons */}
      <FloatingButton
        icon={TrendingUp}
        backgroundColor="#FFFFFF"
        borderColor="transparent"
        iconColor="#3B82F6"
        position="secondary"
        onPress={() => router.push('/incidents/analytics')}
      />
      <FloatingButton
        icon={Plus}
        backgroundColor="#FFFFFF"
        borderColor="transparent"
        iconColor="#FF6B35"
        position="primary"
        onPress={() => router.push('/incidents/new')}
      />
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
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0.9,
    borderBottomColor: '#E5E7EB',
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
  listContainer: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    fontSize: 28,
    color: '#9CA3AF',
    fontWeight: '300',
    paddingHorizontal: 8,
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 60,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
    height: 36,
  },
  filterPillActive: {
    backgroundColor: '#FEF3F2',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: '#FF6B35',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  resultsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  priorityBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  attachmentCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteText: {
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
})