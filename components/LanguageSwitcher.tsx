import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../providers/languageContext';

type Language = 'en' | 'si' | 'ta';

const LanguageSwitcher = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'si', name: 'Sinhala', nativeName: 'සිංහල' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  ];

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profile.changeLanguage')}</Text>
      <View style={styles.languageList}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageButton,
              language === lang.code && styles.activeLanguageButton,
            ]}
            onPress={() => handleLanguageChange(lang.code)}
          >
            <View style={styles.languageContent}>
              <Text
                style={[
                  styles.languageText,
                  language === lang.code && styles.activeLanguageText,
                ]}
              >
                {lang.nativeName}
              </Text>
              <Text
                style={[
                  styles.languageSubtext,
                  language === lang.code && styles.activeLanguageSubtext,
                ]}
              >
                {lang.name}
              </Text>
            </View>
            {language === lang.code && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1f2937',
  },
  languageList: {
    gap: 12,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  activeLanguageButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  languageContent: {
    flex: 1,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  activeLanguageText: {
    color: '#1e40af',
  },
  languageSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  activeLanguageSubtext: {
    color: '#3b82f6',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LanguageSwitcher;