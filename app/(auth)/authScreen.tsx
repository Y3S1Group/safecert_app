/*
    app/(auth)/authScreen.tsx
*/
import { View, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { Text, TextInput, HelperText } from 'react-native-paper';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { Eye, EyeOff } from 'lucide-react-native';

export default function AuthScreen() {
    const router = useRouter();
    const { showSnackbar } = useSnackbar();
    const [isLogin, setIsLogin] = useState<boolean>(true);
    const [fullName, setFullName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    
    // Error states for each field
    const [errors, setErrors] = useState({
        fullName: '',
        email: '',
        password: '',
        general: ''
    });

    const clearErrors = () => {
        setErrors({
            fullName: '',
            email: '',
            password: '',
            general: ''
        });
    };

    const handleAuth = async () => {
        clearErrors();

        // Validation
        let hasError = false;
        const newErrors = { fullName: '', email: '', password: '', general: '' };

        if (!isLogin && !fullName.trim()) {
            newErrors.fullName = 'Full name is required';
            hasError = true;
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Invalid email format';
            hasError = true;
        }

        if (!password) {
            newErrors.password = 'Password is required';
            hasError = true;
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            hasError = true;
        }

        if (hasError) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                // Sign In logic
                await signInWithEmailAndPassword(auth, email, password);
                showSnackbar({
                    message: 'Successfully logged in!',
                    type: 'success',
                    duration: 2000
                });
            } else {
                // Sign Up logic
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await saveUser(user);
                showSnackbar({
                    message: 'Account created successfully!',
                    type: 'success',
                    duration: 2000
                });
            }
        } catch (error: any) {
            // Handle specific Firebase errors with inline messages
            const newErrors = { fullName: '', email: '', password: '', general: '' };
            
            if (error.code === 'auth/email-already-in-use') {
                newErrors.email = 'This email is already registered';
            } else if (error.code === 'auth/weak-password') {
                newErrors.password = 'Password should be at least 6 characters';
            } else if (error.code === 'auth/invalid-email') {
                newErrors.email = 'Invalid email address';
            } else if (error.code === 'auth/user-not-found') {
                newErrors.email = 'No account found with this email';
            } else if (error.code === 'auth/wrong-password') {
                newErrors.password = 'Incorrect password';
            } else if (error.code === 'auth/invalid-credential') {
                newErrors.general = 'Invalid email or password';
            } else if (error.code === 'auth/network-request-failed') {
                newErrors.general = 'Network error. Check your connection';
            } else if (error.message) {
                newErrors.general = error.message;
            }

            setErrors(newErrors);
        } finally {
            setLoading(false);
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
            showSnackbar({
                message: 'Account created, but failed to save profile',
                type: 'warning',
                duration: 4000
            });
        }
    }

    const toggleAuthMode = () => {
        setIsLogin(!isLogin);
        // Clear fields and errors when switching
        setFullName("");
        setEmail("");
        setPassword("");
        setShowPassword(false);
        clearErrors();
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
                {/* General Error Message */}
                {errors.general ? (
                    <View style={styles.generalError}>
                        <Text style={styles.generalErrorText}>{errors.general}</Text>
                    </View>
                ) : null}

                {/* Full Name Input (Sign Up only) */}
                {!isLogin && (
                    <View style={styles.inputContainer}>
                        <TextInput 
                            label="Full Name"
                            mode="outlined"
                            style={styles.textInput}
                            autoCorrect={false}
                            autoCapitalize="words"
                            keyboardType="default"
                            outlineColor={errors.fullName ? "#EF4444" : "#D1D5D8"}
                            activeOutlineColor={errors.fullName ? "#EF4444" : "#FF6B35"}
                            theme={{
                                colors: {
                                    background: '#FFFFFF',
                                    onSurfaceVariant: "#6B7280",
                                },
                                roundness: 12,
                            }}
                            value={fullName}
                            onChangeText={(text) => {
                                setFullName(text);
                                if (errors.fullName) {
                                    setErrors(prev => ({ ...prev, fullName: '' }));
                                }
                            }}
                            disabled={loading}
                            error={!!errors.fullName}
                        />
                        {errors.fullName ? (
                            <HelperText type="error" visible={!!errors.fullName} style={styles.errorText}>
                                {errors.fullName}
                            </HelperText>
                        ) : null}
                    </View>
                )}

                {/* Email Input */}
                <View style={styles.inputContainer}>
                    <TextInput 
                        label="Email"
                        mode="outlined"
                        style={styles.textInput}
                        autoCorrect={false}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        outlineColor={errors.email ? "#EF4444" : "#D1D5D8"}
                        activeOutlineColor={errors.email ? "#EF4444" : "#FF6B35"}
                        theme={{
                            colors: {
                                background: '#FFFFFF',
                                onSurfaceVariant: "#6B7280",
                            },
                            roundness: 12,
                        }}
                        value={email}
                        onChangeText={(text) => {
                            setEmail(text);
                            if (errors.email || errors.general) {
                                setErrors(prev => ({ ...prev, email: '', general: '' }));
                            }
                        }}
                        disabled={loading}
                        error={!!errors.email}
                    />
                    {errors.email ? (
                        <HelperText type="error" visible={!!errors.email} style={styles.errorText}>
                            {errors.email}
                        </HelperText>
                    ) : null}
                </View>

                {/* Password Input with Toggle */}
                <View style={styles.inputContainer}>
                    <View style={styles.passwordContainer}>
                        <TextInput 
                            label="Password"
                            mode="outlined"
                            secureTextEntry={!showPassword} 
                            style={styles.textInput}
                            autoCorrect={false}
                            autoCapitalize="none"
                            outlineColor={errors.password ? "#EF4444" : "#D1D5D8"}
                            activeOutlineColor={errors.password ? "#EF4444" : "#FF6B35"}
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (errors.password || errors.general) {
                                    setErrors(prev => ({ ...prev, password: '', general: '' }));
                                }
                            }}
                            theme={{
                                colors: {
                                    background: '#FFFFFF',
                                    onSurfaceVariant: "#6B7280",
                                },
                                roundness: 12,
                            }}
                            disabled={loading}
                            error={!!errors.password}
                        />
                        <TouchableOpacity
                            style={styles.eyeIcon}
                            onPress={() => setShowPassword(!showPassword)}
                            disabled={loading}
                        >
                            {showPassword ? (
                                <EyeOff size={20} color="#6B7280" />
                            ) : (
                                <Eye size={20} color="#6B7280" />
                            )}
                        </TouchableOpacity>
                    </View>
                    {errors.password ? (
                        <HelperText type="error" visible={!!errors.password} style={styles.errorText}>
                            {errors.password}
                        </HelperText>
                    ) : null}
                </View>

                <TouchableOpacity
                    onPress={handleAuth}
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    <Text style={styles.submitButtonText}>
                        {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                </Text>
                <Pressable onPress={toggleAuthMode} disabled={loading}>
                    <Text style={[styles.footerLinkText, loading && styles.footerLinkDisabled]}>
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </Text>
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
    inputContainer: {
        marginBottom: 8,
    },
    passwordContainer: {
        position: 'relative',
    },
    textInput: {
        borderRadius: 12,
        height: 48,
        backgroundColor: '#FFFFFF',
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 18,
        padding: 4,
        zIndex: 10,
    },
    errorText: {
        marginTop: -4,
        marginBottom: 8,
        fontSize: 12,
        paddingHorizontal: 4,
    },
    generalError: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    generalErrorText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: '#FF6B35',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#FCA78E',
        opacity: 0.7,
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
    footerLinkDisabled: {
        opacity: 0.5,
    },
});