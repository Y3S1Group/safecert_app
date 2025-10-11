import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Edit, Plus, Calendar, User, Award } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { useLanguage } from '@/providers/languageContext'; // New

// Template interface
export interface Template {
  id: string;
  courseName: string;
  courseDescription: string;
  instructorName: string;
  instructorTitle: string;
  organizationName: string;
  logoUrl: string;
  completionDate: string;
  primaryColor: string;
  secondaryColor: string;
  createdAt: string;
}

// Props interface
interface ManageTemplatesProps {
  templates?: Template[]; // Optional prop
}

// Component
export default function ManageTemplates({ templates: propTemplates }: ManageTemplatesProps) {
  const router = useRouter();
  const { t } = useLanguage(); // New
  const [templates, setTemplates] = useState<Template[]>(propTemplates || []);
  const [loading, setLoading] = useState(!propTemplates); // Only loading if no prop provided
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch templates from Firestore if no prop is provided
  const fetchTemplates = async () => {
    if (propTemplates) return; // Skip fetching if templates passed as prop
    try {
      const snapshot = await getDocs(collection(db, 'certificateTemplates'));
      const tempList: Template[] = snapshot.docs.map(doc => ({
        id: doc.id,
        courseName: doc.data().courseName || '',
        courseDescription: doc.data().courseDescription || '',
        instructorName: doc.data().instructorName || '',
        instructorTitle: doc.data().instructorTitle || '',
        organizationName: doc.data().organizationName || '',
        logoUrl: doc.data().logoUrl || '',
        completionDate: doc.data().completionDate || new Date().toISOString(),
        primaryColor: doc.data().primaryColor || '#6B21A8',
        secondaryColor: doc.data().secondaryColor || '#FDF2F8',
        createdAt: doc.data().createdAt || new Date().toISOString(),
      }));

      tempList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTemplates(tempList);
    } catch (error) {
      console.error('Error fetching templates:', error);
      Alert.alert(t('common.error'), t('certificateList.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  
  useFocusEffect(
    React.useCallback(() => {
      fetchTemplates(); // Re-fetch after returning from edit
    }, [])
  );

  useEffect(() => {
    fetchTemplates();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  };

  const handleDelete = async (templateId: string, courseName: string) => {
    Alert.alert(
      t('certificateList.deleteTitle'),
      `${t('certificateList.deleteConfirm')} "${courseName}"? ${t('certificateList.deleteWarning')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(templateId);
              await deleteDoc(doc(db, 'certificateTemplates', templateId));
              setTemplates(prev => prev.filter(t => t.id !== templateId));
              Alert.alert(t('common.success'), t('certificateList.deleteSuccess'));
            } catch (error) {
              console.error('Error deleting template:', error);
              Alert.alert(t('common.error'), t('certificateList.deleteError'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };


  const handleCreateNew = () => router.push('/certificate/certificates');

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Award size={48} color="#FF6B35" />
          <Text style={styles.loadingText}>{t('certificateList.loadingTemplates')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B35']} tintColor="#FF6B35" />
        }
      >
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Award size={24} color="#FF6B35" />
            <Text style={styles.statNumber}>{templates.length}</Text>
            <Text style={styles.statLabel}>{t('certificateList.totalTemplates')}</Text>
          </View>
        </View>

        {/* Create New Button */}

        {/* Templates List */}
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Award size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>{t('certificateList.noTemplates')}</Text>
            <Text style={styles.emptyText}>
              {t('certificateList.emptyStateMessage')}
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateNew}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>{t('certificateList.createFirst')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map(template => (
            <View key={template.id} style={styles.templateCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  {template.logoUrl ? (
                    <Image source={{ uri: template.logoUrl }} style={styles.templateLogo} resizeMode="contain" />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Award size={24} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.headerInfo}>
                    <Text style={styles.courseName} numberOfLines={1}>
                      {template.courseName}
                    </Text>
                    {template.organizationName && (
                      <View style={styles.organizationBadge}>
                        <Text style={styles.organizationText} numberOfLines={1}>
                          {template.organizationName}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.colorPreview}>
                  <View style={[styles.colorDot, { backgroundColor: template.primaryColor }]} />
                  <View style={[styles.colorDot, { backgroundColor: template.secondaryColor }]} />
                </View>
              </View>

              <View style={styles.cardBody}>
                {template.courseDescription && (
                  <Text style={styles.courseDescription} numberOfLines={2}>
                    {template.courseDescription}
                  </Text>
                )}

                <View style={styles.infoRow}>
                  <User size={14} color="#6B7280" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {template.instructorName}
                    {template.instructorTitle && ` • ${template.instructorTitle}`}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Calendar size={14} color="#6B7280" />
                  <Text style={styles.infoText}>
                    {t('certificateList.created')} {formatDate(template.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.updateButton]}
                  onPress={() => router.push(`/certificate/edit?templateId=${template.id}`)}
                >
                  <Edit size={16} color="#FF6B35" />
                  <Text style={styles.updateButtonText}>{t('common.edit')}</Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton, deletingId === template.id && styles.disabledButton]}
                  onPress={() => handleDelete(template.id, template.courseName)}
                  disabled={deletingId === template.id}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={styles.deleteButtonText}>
                    {deletingId === template.id ? t('certificateList.deleting') : t('common.delete')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles remain unchanged
const styles = StyleSheet.create({
  // ==========================
  // Layout & Containers
  // ==========================
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 15 },

  // ==========================
  // Loading State
  // ==========================
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 16 
  },
  loadingText: { 
    fontSize: 16, 
    color: '#6B7280', 
    fontWeight: '600' 
  },

  // ==========================
  // Header
  // ==========================
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingVertical: 16, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  backButton: { padding: 4 },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#111827' 
  },

  // ==========================
  // Stats Cards
  // ==========================
  statsCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2 
  },
  statItem: { 
    alignItems: 'center' 
  },
  statNumber: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#FF6B35', 
    marginTop: 8 
  },
  statLabel: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginTop: 4 
  },

  // ==========================
  // Create Button
  // ==========================
  createButton: { 
    backgroundColor: '#FF6B35', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 24, 
    shadowColor: '#FF6B35', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4, 
    gap: 8 
  },
  createButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },

  // ==========================
  // Empty State
  // ==========================
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 24 
  },
  emptyIconContainer: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: '#F3F4F6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  emptyTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  emptyText: { 
    fontSize: 15, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 22, 
    marginBottom: 32 
  },
  emptyButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FF6B35', 
    paddingVertical: 14, 
    paddingHorizontal: 28, 
    borderRadius: 12, 
    gap: 8, 
    shadowColor: '#FF6B35', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 4 
  },
  emptyButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 16 
  },

  // ==========================
  // Template Card
  // ==========================
  templateCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    marginBottom: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2, 
    overflow: 'hidden' 
  },

  // Card Header
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    gap: 12 
  },
  templateLogo: { 
    width: 56, 
    height: 56, 
    borderRadius: 8, 
    backgroundColor: '#F9FAFB' 
  },
  logoPlaceholder: { 
    width: 56, 
    height: 56, 
    borderRadius: 8, 
    backgroundColor: '#F3F4F6', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerInfo: { flex: 1 },
  courseName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 4 
  },
  organizationBadge: { 
    backgroundColor: '#FFF7F2', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 6, 
    alignSelf: 'flex-start' 
  },
  organizationText: { 
    fontSize: 12, 
    color: '#FF6B35', 
    fontWeight: '600' 
  },
  colorPreview: { flexDirection: 'row', gap: 6 },
  colorDot: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#E5E7EB' 
  },

  // Card Body
  cardBody: { padding: 16, gap: 10 },
  courseDescription: { 
    fontSize: 14, 
    color: '#6B7280', 
    lineHeight: 20, 
    marginBottom: 4 
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: '#6B7280', flex: 1 },

  // Card Footer / Actions
  cardFooter: { 
    flexDirection: 'row', 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6' 
  },
  actionButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 14, 
    gap: 6 
  },
  updateButton: { borderRightWidth: 1, borderRightColor: '#F3F4F6' },
  updateButtonText: { 
    color: '#FF6B35', 
    fontWeight: '600', 
    fontSize: 14 
  },
  deleteButton: {},
  deleteButtonText: { 
    color: '#EF4444', 
    fontWeight: '600', 
    fontSize: 14 
  },
  disabledButton: { opacity: 0.5 },
});

