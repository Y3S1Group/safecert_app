import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

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

    // Firebase automatically restores auth state on app restart
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading || isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // First time user - show onboarding
  if (isFirstLaunch) {
    return <Redirect href="/(onboarding)" />;
  }

  // User not logged in - show auth screen
  if (!user) {
    return <Redirect href="/(auth)/authScreen" />;
  }

  // User is logged in - show main app
  return <Redirect href="/(tabs)" />;
}