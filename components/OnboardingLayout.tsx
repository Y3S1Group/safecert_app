import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useRouter } from 'expo-router';

interface OnboardingLayoutProps {
  title: string;
  description: string;
  currentPage: number;
  totalPages: number;
  nextRoute?: string;
  skipRoute?: string;
  children: React.ReactNode;
}

const { width } = Dimensions.get('window');

export default function OnboardingLayout({
  title,
  description,
  currentPage,
  totalPages,
  nextRoute,
  skipRoute,
  children
}: OnboardingLayoutProps) {
  const router = useRouter();

  const handleNext = async () => {
    if (nextRoute) {
      if (nextRoute === '/') {
        // Mark onboarding as completed and go to auth
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem('hasCompletedOnboarding', 'true');
        router.replace('/(auth)/authScreen');
      } else {
        router.push(nextRoute as any);
      }
    }
  };

  const handleSkip = async () => {
    if (skipRoute) {
      // Mark onboarding as completed and go to auth
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('hasCompletedOnboarding', 'true');
      router.replace('/(auth)/authScreen');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Skip button */}
        {skipRoute && (
          <View style={styles.header}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main content */}
        <View style={styles.mainContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          
          <View style={styles.featuresContainer}>
            {children}
          </View>
        </View>

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {/* Page indicators */}
          <View style={styles.pageIndicators}>
            {Array.from({ length: totalPages }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index + 1 === currentPage ? styles.activeIndicator : styles.inactiveIndicator
                ]}
              />
            ))}
          </View>

          {/* Next button */}
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>
              {currentPage === totalPages ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'flex-end',
    paddingTop: 16,
    paddingBottom: 20,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    marginTop: 20,
  },
  bottomSection: {
    paddingBottom: 40,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#FF6B35',
  },
  inactiveIndicator: {
    backgroundColor: '#D1D5DB',
  },
  nextButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});