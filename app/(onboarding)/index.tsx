import React from 'react';
import { View } from 'react-native';
import OnboardingLayout from '../../components/OnboardingLayout';
import FeatureItem from '../../components/FeatureItem';
import { BookOpen, CheckCircle } from 'lucide-react-native';

export default function OnboardingScreenOne() {
  return (
    <OnboardingLayout
      title="Safety Training at Your Fingertips"
      description="Access all your required safety training courses anytime, anywhere - even offline."
      currentPage={1}
      totalPages={3}
      nextRoute="/(onboarding)/second"
      skipRoute="/"
    >
      <View style={{ gap: 16 }}>
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
    </OnboardingLayout>
  );
}