import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useEffect } from 'react'
import { Bell } from 'lucide-react-native'

interface AlertButton {
    text: String
    onPress: () => void
    style?: 'default' | 'destructive' | 'cancel'
}

interface CustomeAlertProps {
    visible: boolean
    onClose: () => void
    message: string
    icon?: any
    iconColor?: string
    iconBgColor?: string
    buttons?: AlertButton[]
    autoClose?: boolean
    autoCloseDelay?: number
}

export default function CustomeAlert({
    visible,
    onClose,
    message,
    icon: Icon = Bell,
    iconColor = '#FF6B35',
    iconBgColor = '#EFF6FF',
    buttons,
    autoClose = false,
    autoCloseDelay = 8000
}: CustomeAlertProps) {

    useEffect(() => {
        if (visible && autoClose) {
            const timer = setTimeout(() => {
                onClose()
            }, autoCloseDelay)
            return () => clearTimeout(timer)
        }
    }, [visible, autoClose, autoCloseDelay, onClose])

    const getButtonStyle = (style?: string) => {
        switch (style) {
            case 'destructive':
                return { backgroundColor: '#EF4444' }
            case 'cancel':
                return { backgroundColor: '#F3F4F6' }
            default:
                return { backgroundColor: '#FF6B35' }
        }
    }

    const getButtonTextStyle = (style?: string) => {
        switch (style) {
            case 'cancel':
                return { color: '#374151' }
            default:
                return { color: '#FFFFFF' }
        }
    }
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay}
                activeOpacity={1}
                onPress={autoClose ? undefined : onClose}
            >
                <TouchableOpacity activeOpacity={1}>
                    <View style={styles.alertContainer}>
                        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
                            <Icon size={28} color={iconColor} />
                        </View>

                        <Text style={styles.message}>{message}</Text>

                        {buttons && buttons.length > 0 ? (
                            <View style={styles.buttonContainer}>
                                {buttons.map((button, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            getButtonStyle(button.style),
                                            buttons.length === 2 && styles.halfButton
                                        ]}
                                        onPress={() => {
                                            button.onPress()
                                            onClose()
                                        }}
                                    >
                                        <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                                            {button.text}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ) : !autoClose ? (
                            <TouchableOpacity style={styles.button} onPress={onClose}>
                                <Text style={styles.buttonText}>Done</Text>
                            </TouchableOpacity>
                        ): null} 
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    alertContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 20,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    button: {
        backgroundColor: '#FF6B35',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        width: '100%',
    },
    halfButton: {
        width: '48%',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
})