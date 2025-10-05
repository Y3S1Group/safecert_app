import { auth, db } from '@/config/firebaseConfig'
import { useRouter } from 'expo-router'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { AlertTriangle, Clock, Edit, Eye, Filter, MapPin, Plus, Search, Trash2, TrendingUp, FileText, Image as ImageIcon, Video } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

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
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'analytics'>('list')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

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
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this incident report? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'incidents', incidentId))
              Alert.alert('Success', 'Report deleted successfully')
            } catch (error) {
              console.error('Error deleting incident:', error)
              Alert.alert('Error', 'Failed to delete report')
            }
          }
        }
      ]
    )
  }

  const handleUpdateStatus = async (incidentId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'incidents', incidentId), {
        status: newStatus,
        updatedAt: new Date()
      })
      Alert.alert('Success', `Status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating status:', error)
      Alert.alert('Error', 'Failed to update status')
    }
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'create':
        return (
          <View style={styles.emptyStateContainer}>
            <View style={styles.iconCircle}>
              <Plus size={32} color="#FF6B35" />
            </View>
            <Text style={styles.emptyStateTitle}>Create New Report</Text>
            <Text style={styles.emptyStateDescription}>
              Document incidents and issues quickly with our easy-to-use reporting system
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                console.log('=== CREATE BUTTON PRESSED ===')
                console.log('Current route:', router)
                console.log('Attempting to navigate to: /createIncident')

                try {
                  router.push('/incidents/new')
                  console.log('Navigation called successfully')
                } catch (error) {
                  console.error('Navigation error:', error)
                }
              }}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Create Incident Report</Text>
            </TouchableOpacity>
          </View>
        )

      case 'list':
        return (
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
                  {filteredIncidents.length} {filteredIncidents.length === 1 ? 'result' : 'results'} found
                </Text>
              </View>
            )}

            {/* Incidents List */}
            <FlatList
              data={filteredIncidents}
              renderItem={renderIncidentCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 0 }}
              ListEmptyComponent={
                <View style={styles.emptyStateContainer}>
                  <View style={styles.iconCircle}>
                    <FileText size={32} color="#D1D5DB" />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    {searchQuery ? 'No results found' : 'No incident reports'}
                  </Text>
                  <Text style={styles.emptyStateDescription}>
                    {searchQuery 
                      ? 'Try adjusting your search or filters' 
                      : 'Create your first incident report to get started'}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => setActiveTab('create')}
                    >
                      <Plus size={18} color="#FF6B35" />
                      <Text style={styles.secondaryButtonText}>Create Report</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          </View>
        )

      case 'analytics':
        return (
          <View style={styles.emptyStateContainer}>
            <View style={styles.iconCircle}>
              <TrendingUp size={32} color="#1B365D" />
            </View>
            <Text style={styles.emptyStateTitle}>Analytics Dashboard</Text>
            <Text style={styles.emptyStateDescription}>
              View detailed insights and statistics about your incident reports
            </Text>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#1B365D' }]}
              onPress={() => router.push('/incidents/analytics')}
            >
              <TrendingUp size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>View Analytics</Text>
            </TouchableOpacity>
          </View>
        )

      default:
        return null
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Tab Navigation */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incident Reports</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'list' && styles.activeTab]}
            onPress={() => setActiveTab('list')}
          >
            <FileText size={18} color={activeTab === 'list' ? '#FF6B35' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
              Reports
            </Text>
            {incidents.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{incidents.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.activeTab]}
            onPress={() => setActiveTab('create')}
          >
            <Plus size={18} color={activeTab === 'create' ? '#FF6B35' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
              Create
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
            onPress={() => setActiveTab('analytics')}
          >
            <TrendingUp size={18} color={activeTab === 'analytics' ? '#FF6B35' : '#9CA3AF'} />
            <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
              Analytics
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderTabContent()}
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
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  tabBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
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
    fontSize: 24,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },
  filterScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    maxHeight: 60,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: '#FF6B35',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  resultsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
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
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
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
    fontWeight: '500',
  },
  attachmentsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
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
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
  },
})