// app/(onboarding)/index.tsx
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatureItem from '../../components/FeatureItem';
import { BookOpen, CheckCircle, Award, Download, AlertTriangle, Camera } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '../_layout';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreens() {
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();

  const goToNextPage = async () => {
    if (currentPage < 2) {
      pagerRef.current?.setPage(currentPage + 1);
    } else {
      // Mark onboarding as completed and update parent state
      await completeOnboarding();
      // Navigate to auth screen
      router.replace('/(auth)/authScreen');
    }
  };

  const skipOnboarding = async () => {
    // Mark onboarding as completed and update parent state
    await completeOnboarding();
    router.replace('/(auth)/authScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Skip Button - Fixed */}
        <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Swipeable Content Area */}
        <PagerView
          style={styles.pagerContainer}
          initialPage={0}
          ref={pagerRef}
          onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
        >
          {/* Screen 1 */}
          <View key="1" style={styles.page}>
            <Text style={styles.title}>Safety Training at Your Fingertips</Text>
            <Text style={styles.description}>
              Access all your required safety training courses anytime, anywhere - even offline.
            </Text>
            
            <View style={styles.featuresContainer}>
              <FeatureItem
                icon={<BookOpen size={24} color="#FF6B35" />}
                title="Easy Access"
                description="Simple interface designed for all skill levels"
                iconBackgroundColor="rgba(255, 107, 53, 0.1)"
              />
              <FeatureItem
                icon={<CheckCircle size={24} color="#FF6B35" />}
                title="Track Progress"
                description="Monitor your training completion and certifications"
                iconBackgroundColor="rgba(255, 107, 53, 0.1)"
              />
            </View>
          </View>

          {/* Screen 2 */}
          <View key="2" style={styles.page}>
            <Text style={styles.title}>Manage Your Certifications</Text>
            <Text style={styles.description}>
              Keep track of all your safety certifications in one place and get alerts before they expire.
            </Text>
            
            <View style={styles.featuresContainer}>
              <FeatureItem
                icon={<Award size={24} color="#1B365D" />}
                title="Digital Certificates"
                description="All your certifications in one secure location"
                iconBackgroundColor="rgba(27, 54, 93, 0.1)"
              />
              <FeatureItem
                icon={<Download size={24} color="#1B365D" />}
                title="Easy Sharing"
                description="Share your certifications with supervisors or employers"
                iconBackgroundColor="rgba(27, 54, 93, 0.1)"
              />
            </View>
          </View>

          {/* Screen 3 */}
          <View key="3" style={styles.page}>
            <Text style={styles.title}>Report Safety Incidents Quickly</Text>
            <Text style={styles.description}>
              Easily report safety incidents or hazards with our simple reporting tool.
            </Text>
            
            <View style={styles.featuresContainer}>
              <FeatureItem
                icon={<AlertTriangle size={24} color="#B03A2E" />}
                title="Fast Reporting"
                description="Report incidents with just a few taps"
                iconBackgroundColor="rgba(176, 58, 46, 0.1)"
              />
              <FeatureItem
                icon={<Camera size={24} color="#B03A2E" />}
                title="Photo Evidence"
                description="Add photos to document safety hazards"
                iconBackgroundColor="rgba(176, 58, 46, 0.1)"
              />
            </View>
          </View>
        </PagerView>

        {/* Fixed Bottom Navigation */}
        <View style={styles.bottomContainer}>
          {/* Page Indicators */}
          <View style={styles.pageIndicators}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentPage === index && styles.activeIndicator,
                ]}
              />
            ))}
          </View>

          {/* Fixed Next/Get Started Button */}
          <TouchableOpacity style={styles.nextButton} onPress={goToNextPage}>
            <Text style={styles.nextButtonText}>
              {currentPage === 2 ? 'Get Started' : 'Next'}
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  pagerContainer: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    gap: 16,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 20,
    gap: 24,
    backgroundColor: '#FFFFFF',
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  activeIndicator: {
    width: 24,
    backgroundColor: '#FF6B35',
  },
  nextButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});