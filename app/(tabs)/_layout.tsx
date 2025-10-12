import { Tabs } from 'expo-router';
import { Home, Award, FileText, GraduationCap, User, FileTextIcon } from 'lucide-react-native';
import { useLanguage } from '@/providers/languageContext';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();

    return (
        <Tabs 
            screenOptions={{ 
                headerShown: false,
                tabBarActiveTintColor: '#FF6B35',
                tabBarInactiveTintColor: '#6B7280',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 0,
                    borderRadius: 25,
                    marginHorizontal: 5,
                    marginBottom: Platform.OS === 'ios' ? 12 : 6,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 10, 
                    paddingTop: 8,
                    height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0, // 
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 0,
                        height: 4,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 8,
                },
            }}
        >
            <Tabs.Screen 
                name="index" 
                options={{
                    title: t('tabs.home'),
                    tabBarIcon: ({ color, size }) => (
                        <Home 
                            size={size || 24} 
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="certificates" 
                options={{
                    title: t('tabs.certificates'),
                    tabBarIcon: ({ color, size }) => (
                        <Award 
                            size={size || 24} 
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="report" 
                options={{
                    title: t('tabs.reports'),
                    tabBarIcon: ({ color, size }) => (
                        <FileTextIcon
                            size={size || 24} 
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="training" 
                options={{
                    title: t('tabs.training'),
                    tabBarIcon: ({ color, size }) => (
                        <GraduationCap 
                            size={size || 24} 
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen 
                name="profile" 
                options={{
                    title: t('tabs.profile'),
                    tabBarIcon: ({ color, size }) => (
                        <User 
                            size={size || 24} 
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}