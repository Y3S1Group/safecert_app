import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from "react-native";
import { AlertProvider } from "@/contexts/AlertContext";
import SnackbarProvider from "@/contexts/SnackbarContext";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const value = await AsyncStorage.getItem('hasCompletedOnboarding');
        setIsFirstLaunch(value === null);
      } catch (error) {
        console.error("AsyncStorage error: ", error);
        setIsFirstLaunch(false);
      }
    };
    
    checkFirstLaunch();

    // Firebase Auth persistence will automatically handle login state
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      console.log("Auth state changed:", authUser ? "User logged in" : "User not logged in");
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (loading || isFirstLaunch === null) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inTabsGroup = segments[0] === "(tabs)";

    const allowedRoutes = ['createIncident', 'incidents', 'instructor', 'certificate', 'course', 'notifications'];
    const currentRoute = segments[0];
    const isAllowedRoute = allowedRoutes.includes(currentRoute);

    // First time user - redirect to onboarding
    if (isFirstLaunch && !inOnboardingGroup) {
      router.replace("/(onboarding)");
      return;
    }

    // User is not logged in
    if (!user) {
      // If not first launch and not in auth group, redirect to auth
      if (!isFirstLaunch && !inAuthGroup) {
        router.replace("/(auth)/authScreen");
      }
      return;
    }

    // User is logged in - redirect to tabs if not already there
    if (user && !inTabsGroup && !isAllowedRoute) {
      router.replace("/(tabs)");
    }
  }, [user, segments, loading, isFirstLaunch]);

  // Show loading screen while checking auth state and first launch
  if (loading || isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <AlertProvider>
      <SnackbarProvider>
        <StatusBar style='inverted' />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SnackbarProvider>
    </AlertProvider>
  );
}