import { View, Text } from 'react-native'
import React, { createContext, ReactNode, useContext, useState } from 'react'
import Snackbar from '@/components/Snackbar'

interface SnackbarConfig {
    message: string
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number
}

interface SnackbarContextType {
    showSnackbar: (config: SnackbarConfig) => void 
    hideSnackbar: () => void
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined)

export default function SnackbarProvider({ children }: { children: ReactNode }) {
    const [SnackbarConfig, setSnackbarConfig] = useState<SnackbarConfig & { visible: boolean }>({
        visible: false,
        message: '',
        type: 'info',
        duration: 3000
    })

    const showSnackbar = (config: SnackbarConfig) => {
        setSnackbarConfig({
            ...config,
            visible: true,
            duration: config.duration ?? 3000
        })
    }

    const hideSnackbar = () => {
        setSnackbarConfig(prev => ({ ...prev, visible: false }))
    }

    return (
        <SnackbarContext.Provider value={{ showSnackbar, hideSnackbar }}>
            {children}
            <Snackbar
                visible={SnackbarConfig.visible}
                message={SnackbarConfig.message}
                type={SnackbarConfig.type}
                duration={SnackbarConfig.duration}
                onDismiss={hideSnackbar}
            />
        </SnackbarContext.Provider>
    )
}

export function useSnackbar() {
    const context = useContext(SnackbarContext)
    if (!context) {
        throw new Error('useSnackbar must be used within SnackProvider')
    }
    return context
}