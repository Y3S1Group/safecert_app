import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to tabs without rendering anything
    router.replace('/(tabs)');
  }, []);

  // Show nothing while redirecting (no flicker)
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}