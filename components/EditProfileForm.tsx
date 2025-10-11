import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useLanguage } from '@/providers/languageContext';

interface EditProfileFormProps {
  formData: {
    name: string;
    phone: string;
    department: string;
    jobTitle: string;
  };
  onFormChange: (field: string, value: string) => void;
}

export default function EditProfileForm({ formData, onFormChange }: EditProfileFormProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <TextInput
        label={t('profile.fullName')}
        mode="outlined"
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => onFormChange('name', text)}
        outlineColor="#D1D5D8"
        activeOutlineColor="#FF6B35"
        theme={{
          colors: {
            background: '#FFFFFF',
            onSurfaceVariant: "#6B7280",
          },
          roundness: 12,
        }}
      />

      <TextInput
        label={t('profile.phone')}
        mode="outlined"
        style={styles.input}
        value={formData.phone}
        onChangeText={(text) => onFormChange('phone', text)}
        keyboardType="phone-pad"
        outlineColor="#D1D5D8"
        activeOutlineColor="#FF6B35"
        theme={{
          colors: {
            background: '#FFFFFF',
            onSurfaceVariant: "#6B7280",
          },
          roundness: 12,
        }}
      />

      <TextInput
        label={t('profile.department')}
        mode="outlined"
        style={styles.input}
        value={formData.department}
        onChangeText={(text) => onFormChange('department', text)}
        outlineColor="#D1D5D8"
        activeOutlineColor="#FF6B35"
        theme={{
          colors: {
            background: '#FFFFFF',
            onSurfaceVariant: "#6B7280",
          },
          roundness: 12,
        }}
      />

      <TextInput
        label={t('profile.jobTitle')}
        mode="outlined"
        style={styles.input}
        value={formData.jobTitle}
        onChangeText={(text) => onFormChange('jobTitle', text)}
        outlineColor="#D1D5D8"
        activeOutlineColor="#FF6B35"
        theme={{
          colors: {
            background: '#FFFFFF',
            onSurfaceVariant: "#6B7280",
          },
          roundness: 12,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
});