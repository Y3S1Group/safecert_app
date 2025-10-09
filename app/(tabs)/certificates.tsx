/*
    app/(tabs)/index.tsx
*/
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import TemplateList from '@/app/certificate/certificateList';
import EarnCertificates from '@/app/certificate/earn';

const TABS = ['Earned', 'Templates', 'Analytics'];

export default function certificates() {
  const [activeTab, setActiveTab] = useState('Earned');

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
      case 'Analytics':
        return (
          <View style={styles.tabContent}>
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Analytics Coming Soon</Text>
              <Text style={styles.emptyText}>
                Analytics data will be displayed here.
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Certificates</Text>
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
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabButtonText,
                activeTab === tab && styles.tabButtonTextActive
              ]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.contentContainer}>
        {renderContent()}
      </ScrollView>
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
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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