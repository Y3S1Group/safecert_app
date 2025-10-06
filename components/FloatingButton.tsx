import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native'
import { LucideIcon } from 'lucide-react-native'

interface FloatingButtonProps {
  onPress: () => void
  icon: LucideIcon
  label?: string
  backgroundColor?: string
  borderColor?: string
  iconColor?: string
  position?: 'primary' | 'secondary'
}

export default function FloatingButton({ 
  onPress, 
  icon: Icon, 
  label,
  backgroundColor = '#FFFFFF',
  borderColor = '#FF6B35',
  iconColor = '#FF6B35',
  position = 'primary'
}: FloatingButtonProps) {
  const buttonStyle: ViewStyle = position === 'primary' 
    ? styles.fabPrimary 
    : styles.fabSecondary

  return (
    <TouchableOpacity
      style={[buttonStyle,
         { 
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 2
        }
        ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Icon size={24} color={iconColor} />
      {label && <Text style={styles.fabLabel}>{label}</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fabPrimary: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 200,
  },
  fabSecondary: {
    position: 'absolute',
    bottom: 160,
    right: 24, // Offset from primary button
    width: 60,
    height: 60,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 200,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
})