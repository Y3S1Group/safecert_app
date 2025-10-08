import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect } from 'react'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react-native'

interface SnackbarProps {
    visible: boolean
    message: string
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number
    onDismiss: () => void
}

export default function Snackbar({
    visible,
    message,
    type = "info",
    duration = 3000,
    onDismiss
}: SnackbarProps) {
    const translateY = new Animated.Value(100)

    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 8
            }).start()

            if (duration > 0) {
                const timer = setTimeout(() => {
                    handleDismiss()
                }, duration)
                return () => clearTimeout(timer)
            }
        } else {
            Animated.timing(translateY, {
                toValue: 100,
                duration: 200,
                useNativeDriver: true
            }).start()
        }
    }, [visible])

    const handleDismiss = () => {
        Animated.timing(translateY, {
            toValue: 100,
            duration: 200,
            useNativeDriver: true
        }).start(() => onDismiss())
    }

    const getSnackbarConfig = () => {
        switch (type) {
            case 'success':
                return {
                    Icon: CheckCircle,
                    backgroundColor: '#10B981',
                    iconColor: '#FFFFFF'
                }
            case 'error':
                return {
                    Icon: XCircle,
                    backgroundColor: '#EF4444',
                    iconColor: '#FFFFFF'
                }
            case 'warning':
                return {
                    Icon: AlertTriangle,
                    backgroundColor: '#F59E0B',
                    iconColor: '#FFFFFF'
                }
            default:
                return {
                    Icon: Info,
                    backgroundColor: '#3B82F6',
                    iconColor: '#FFFFFF'
                }
        }
    }

    const { Icon, backgroundColor, iconColor } = getSnackbarConfig()

    if (!visible) return null

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor, transform: [{ translateY }] }
            ]}
        >
            <Icon size={20} color={iconColor} />
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <X size={18} color={iconColor} />
            </TouchableOpacity>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 9999,
    },
    message: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 12,
    },
    closeButton: {
        padding: 4,
        marginLeft: 8,
    },
})