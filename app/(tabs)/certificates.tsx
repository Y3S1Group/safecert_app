/*
    app/(tabs)/index.tsx
*/
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import TemplateList from '@/app/certificate/certificateList';
import EarnCertificates from '@/app/certificate/earn';
import { auth, db } from '@/config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useLanguage } from '@/providers/languageContext'; // New

const TABS = ['Earned', 'Templates'];

export default function certificates() {
  const { t } = useLanguage(); // New
  const [activeTab, setActiveTab] = useState('Earned');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch logged-in user's jobTitle
  // Listen to real-time updates of logged-in user's jobTitle
  useEffect(() => {
    const user = auth.currentUser;

    if (!user?.email) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    // ✅ Real-time Firestore listener with correct typings
    const userDocRef = doc(db, 'users', user.email); // or user.uid if using UID docs
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap: DocumentSnapshot<DocumentData>) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserRole(data?.jobTitle || 'User');
        } else {
          setUserRole('User');
        }
        setLoading(false);
      },
      (error: Error) => {
        console.error('Error listening to user document:', error);
        setUserRole('User');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleTabPress = (tab: string) => {
    // Prevent non-instructors from accessing Templates
    if (tab === 'Templates' && userRole !== 'Instructor') {
      Alert.alert(
        t('certificates.accessDenied'),
        t('certificates.instructorOnly'),
        [{ text: t('common.ok') }]
      );
      return;
    }
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Earned':
        return (
          <View style={styles.tabContent}>
            <EarnCertificates />
          </View>
        );
      case 'Templates':
        return (
          <View style={styles.tabContent}>
            <TemplateList />
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#666' }}>
          {t('common.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('certificates.title')}</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab)}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === tab && styles.tabButtonTextActive,
                ]}
              >
                {t(`certificates.tabs.${tab.toLowerCase()}`)}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.contentContainer}>{renderContent()}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabBarContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 32,
  },
  tabButton: {
    paddingBottom: 16,
    position: 'relative',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9E9E9E',
  },
  tabButtonTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF6B35',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  contentContainer: {
    flex: 1,
    padding: 5,
  },
  tabContent: {
    flex: 1,
    gap: 5,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },
});
