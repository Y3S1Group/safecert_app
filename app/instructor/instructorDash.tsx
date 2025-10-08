import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';
import { Bell, User, BookOpen } from 'lucide-react-native';

export default function TeacherDashboard() {
  const router = useRouter();

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  }

  const handleCertificates = () => {
    router.replace('/certificate/certificateList');
  };

  const handleGenerateProfile = () => {
    router.replace('/instructor/generate');
  };

  const handleCreateCourse = () => {
    router.replace('/course/create');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Teacher Dashboard</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionItem} onPress={handleCertificates}>
          <Bell size={20} color="#6B7280" />
          <Text style={styles.actionText}>Certificates</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionItem} onPress={handleGenerateProfile}>
          <User size={20} color="#6B7280" />
          <Text style={styles.actionText}>Generate Certificates</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionItem} onPress={handleCreateCourse}>
          <BookOpen size={20} color="#6B7280" />
          <Text style={styles.actionText}>Create Course</Text>
        </TouchableOpacity>

                <View style={styles.divider} />

        <TouchableOpacity style={styles.actionItem} onPress={handleBackToProfile}>
          <BookOpen size={20} color="#6B7280" />
          <Text style={styles.actionText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Safety App v1.0.0</Text>
        <Text style={styles.footerText}>© 2025 Safety First Inc.</Text>
      </View>
    </ScrollView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 40,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
