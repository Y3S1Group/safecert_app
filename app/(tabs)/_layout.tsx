import { Tabs } from 'expo-router';
import { Home, Award, FileText, GraduationCap, User, FileTextIcon } from 'lucide-react-native';

export default function TabLayout() {
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
                    marginHorizontal: 10,
                    marginBottom: 10,
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 65,
                    position: 'absolute',
                    shadowColor: '#000', 
                    shadowOffset: {
                        width: 0,
                        height: 4,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen 
                name="index" 
                options={{
                    title: 'Home',
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
                    title: 'Certificates',
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
                    title: 'Reports',
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
                    title: 'Training',
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
                    title: 'Profile',
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