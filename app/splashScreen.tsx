import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

//SplashScreen.preventAutoHideAsync();

export default function AnimatedSplashScreen({ children }: { children: React.ReactNode }) {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function prepare() {
      try {
        // Your initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
      
      // Show splash for a bit, then fade out
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, 500);
    }
  }, [appIsReady, fadeAnim]);

  if (showSplash) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/images/splash-logo3.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 512,
    height: 512,
  },
});