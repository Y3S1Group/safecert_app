/*
    app/(auth)/authScreen.tsx
*/
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable, Alert } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { Text, TextInput } from 'react-native-paper';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default function AuthScreen() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState<boolean>(true);
    const [fullName, setFullName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");

    const handleAuth = async () => {
        try {
            if (isLogin) {
                // Sign In logic
                await signInWithEmailAndPassword(auth, email, password);
                // Don't show alert - Firebase persistence will handle the redirect
            } else {
                // Sign Up logic
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await saveUser(user);
                // Don't show alert - Firebase persistence will handle the redirect
            }
            // The AuthProvider will automatically redirect to tabs when auth state changes
        } catch (error: any) {
            Alert.alert('Authentication Error', error.message);
            console.error("Authentication error:", error.message);
        }
    }

    const saveUser = async (user: any) => {
        try {
            await setDoc(doc(db, 'users', email), {
                name: fullName,
                email: email,
                phone: 'Not provided',
                department: 'Not assigned',
                jobTitle: 'Employee',
                member: false,
                uid: user?.uid
            });
            console.log("User data saved to Firestore.");
        } catch (error) {
            console.error("Error saving user data:", error);
        }
    }

    const toggleAuthMode = () => {
        setIsLogin(!isLogin);
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>{isLogin ? 'Log in' : 'Create Account'}</Text>
                <Text style={styles.subtitle}>
                    {isLogin 
                        ? 'Log in to your safety training account' 
                        : 'Sign up for your safety training account'}
                </Text>  
            </View>

            <View style={styles.form}>
                {!isLogin && (
                    <TextInput 
                        label="Full Name"
                        mode="outlined"
                        style={styles.textInput}
                        autoCorrect={false}
                        autoCapitalize="none"
                        keyboardType="default"
                        outlineColor="#D1D5D8"
                        activeOutlineColor="#FF6B35"
                        theme={{
                            colors: {
                                background: '#FFFFFF',
                                onSurfaceVariant: "#6B7280",
                            },
                            roundness: 12,
                        }}
                        value={fullName}
                        onChangeText={setFullName}
                    />
                )}
                <TextInput 
                    label="Email"
                    mode="outlined"
                    style={styles.textInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    outlineColor="#D1D5D8"
                    activeOutlineColor="#FF6B35"
                    theme={{
                        colors: {
                            background: '#FFFFFF',
                            onSurfaceVariant: "#6B7280",
                        },
                        roundness: 12,
                    }}
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput 
                    label="Password"
                    mode="outlined"
                    secureTextEntry={true} 
                    style={styles.textInput}
                    autoCorrect={false}
                    autoCapitalize="none"
                    outlineColor="#D1D5D8"
                    activeOutlineColor="#FF6B35"
                    value={password}
                    onChangeText={setPassword}
                    theme={{
                        colors: {
                            background: '#FFFFFF',
                            onSurfaceVariant: "#6B7280",
                        },
                        roundness: 12,
                    }}
                />
                <TouchableOpacity
                    onPress={handleAuth}
                    style={styles.submitButton}
                    activeOpacity={0.8}
                >
                    <Text style={styles.submitButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                </Text>
                <Pressable onPress={toggleAuthMode}>
                    <Text style={styles.footerLinkText}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
                </Pressable>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    contentContainer: {
        flexGrow: 1,
        marginTop: 80,
        paddingHorizontal: 26,
    },
    header: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 40,
    },
    title: {
        fontSize: 24,
        color: '#111827',
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
    },
    form: {
        marginBottom: 32,
    },
    textInput: {
        marginBottom: 16,
        borderRadius: 12,
        height: 48,
        backgroundColor: '#FFFFFF',
    },
    submitButton: {
        backgroundColor: '#FF6B35',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center'
    },
    footer: {
        display: "flex",
        flexDirection: 'row',
        gap: 2,
        justifyContent: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#374151',
    },
    footerLinkText: {
        color: '#FF6B35',
        fontWeight: '800',
    },
});