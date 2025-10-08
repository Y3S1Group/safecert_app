import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import {ArrowLeft} from 'lucide-react-native';
import {useRouter} from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { Trash2 } from 'lucide-react-native';

interface Template {
  id: string;
  courseName: string;
  instructorName: string;
  organizationName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function TemplateListScreen() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'certificateTemplates'));
      const tempList: Template[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        courseName: docSnap.data().courseName || '',
        instructorName: docSnap.data().instructorName || '',
        organizationName: docSnap.data().organizationName || '',
        logoUrl: docSnap.data().logoUrl || '',
        primaryColor: docSnap.data().primaryColor || '#6B21A8',
        secondaryColor: docSnap.data().secondaryColor || '#FDF2F8',
      }));
      setTemplates(tempList);
    } catch (error) {
      console.error('Error fetching templates:', error);
      Alert.alert('Error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.replace('/instructor/instructorDash');
  }

  const handleDelete = async (id: string) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this template?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'certificateTemplates', id));
            setTemplates((prev) => prev.filter((t) => t.id !== id));
            Alert.alert('Deleted', 'Template deleted successfully');
          } catch (error) {
            console.error('Error deleting template:', error);
            Alert.alert('Error', 'Failed to delete template');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#1B365D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Template List</Text>
        </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <Text style={styles.loadingText}>Loading templates...</Text>
        ) : templates.length === 0 ? (
          <Text style={styles.noTemplates}>No templates available</Text>
        ) : (
          templates.map((template) => (
            <View key={template.id} style={styles.card}>
              <View style={styles.cardHeader}>
                {template.logoUrl ? (
                  <Image source={{ uri: template.logoUrl }} style={styles.logo} />
                ) : (
                  <View style={styles.logoPlaceholder} />
                )}
                <View style={styles.info}>
                  <Text style={styles.courseName}>{template.courseName}</Text>
                  <Text style={styles.subText}>
                    {template.instructorName} • {template.organizationName}
                  </Text>
                  <View style={styles.colorRow}>
                    <View
                      style={[styles.colorDot, { backgroundColor: template.primaryColor }]}
                    />
                    <View
                      style={[styles.colorDot, { backgroundColor: template.secondaryColor }]}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(template.id)}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={22} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 24 
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1B365D',
    marginVertical: 16,
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
  },
  noTemplates: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subText: {
    fontSize: 13,
    color: '#6B7280',
    marginVertical: 4,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  deleteBtn: {
    padding: 6,
  },
});

