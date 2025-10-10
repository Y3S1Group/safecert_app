import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from 'expo-status-bar';
import { View } from "react-native";
import { AlertProvider } from "@/contexts/AlertContext";
import SnackbarProvider from "@/contexts/SnackbarContext";
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Create a context for onboarding completion
const OnboardingContext = createContext({
  completeOnboarding: async () => {}
});

export const useOnboarding = () => useContext(OnboardingContext);

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [appIsReady, setAppIsReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check onboarding status
        const value = await AsyncStorage.getItem('hasCompletedOnboarding');
        const isFirst = value === null;
        setIsFirstLaunch(isFirst);

        // Wait for auth state
        const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
          console.log("Auth state changed:", authUser ? "User logged in" : "User not logged in");
          setUser(authUser);
          setAppIsReady(true);
        });

        return () => unsubscribeAuth();
      } catch (error) {
        console.error("Initialization error: ", error);
        setIsFirstLaunch(false);
        setAppIsReady(true);
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    if (!appIsReady || isFirstLaunch === null) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";
    const inTabsGroup = segments[0] === "(tabs)";

    const allowedRoutes = ['createIncident', 'incidents', 'instructor', 'certificate', 'course', 'notifications', 'quiz'];
    const currentRoute = segments[0];
    const isAllowedRoute = allowedRoutes.includes(currentRoute);

    // First time user - redirect to onboarding
    if (isFirstLaunch && !inOnboardingGroup) {
      router.replace("/(onboarding)");
      return;
    }

    // User is not logged in
    if (!user) {
      if (!isFirstLaunch && !inAuthGroup) {
        router.replace("/(auth)/authScreen");
      }
      return;
    }

    // User is logged in - redirect to tabs if not already there
    if (user && !inTabsGroup && !isAllowedRoute) {
      router.replace("/(tabs)");
    }
  }, [user, segments, appIsReady, isFirstLaunch]);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    setIsFirstLaunch(false); // Update state immediately
  };

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && isFirstLaunch !== null) {
      // Hide the splash screen
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, isFirstLaunch]);

  // Don't render anything until app is ready - splash screen stays visible
  if (!appIsReady || isFirstLaunch === null) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <OnboardingContext.Provider value={{ completeOnboarding }}>
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
      </OnboardingContext.Provider>
    </View>
  );
}