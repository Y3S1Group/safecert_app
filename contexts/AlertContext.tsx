import { View, Text } from 'react-native'
import React, { createContext, ReactNode, useContext, useState } from 'react'
import { Bell } from 'lucide-react-native'
import CustomeAlert from '@/components/CustomeAlert'

interface AlertButton {
    text: String
    onPress: () => void
    style?: 'default' | 'destructive' | 'cancel'
}

interface AlertConfig {
    message: string
    icon?: any
    iconColor?: string
    iconBgColor?: string
    buttons?: AlertButton[]
    autoClose?: boolean
    autoCloseDelay?: number
}

interface AlertContextType {
    showAlert: (conig: AlertConfig) => void
    hideAlert: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
    const [alertConfig, setAlertConfig] = useState<AlertConfig & { visible: boolean }>({
        visible: false,
        message: '',
        icon: Bell,
        iconColor: '#FF6B35',
        iconBgColor: '#EFF6FF'
    })

    const showAlert = (config: AlertConfig) => {
        setAlertConfig({
            ...config,
            visible: true
        })
    }

    const hideAlert = () => {
        setAlertConfig(prev => ({ ...prev, visible: false }))
    }

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <CustomeAlert
                visible={alertConfig.visible}
                onClose={hideAlert}
                message={alertConfig.message}
                icon={alertConfig.icon}
                iconColor={alertConfig.iconColor}
                iconBgColor={alertConfig.iconBgColor}
                buttons={alertConfig.buttons}
                autoClose={alertConfig.autoClose}
                autoCloseDelay={alertConfig.autoCloseDelay}
            />
        </AlertContext.Provider>
    )
}

export function useAlert() {
    const context = useContext(AlertContext)
    if (!context) {
        throw new Error('useAlert must be used within AlertProvider')
    }
    return context
}
