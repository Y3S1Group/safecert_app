import { Tabs } from 'expo-router';
import { FileText, FileTextIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CertificateTabLayout() {
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
          marginHorizontal: 20,
          marginBottom: 30,
          paddingBottom: 20,
          paddingTop: 5,
          height: 65,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="certificates"  // match the filename without .tsx
        options={{
          title: 'Create',
          tabBarIcon: ({ color, size }) => <FileText size={size || 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="certificateList"   // match the filename without .tsx
        options={{
          title: 'Templates',
          tabBarIcon: ({ color, size }) => <FileTextIcon size={size || 24} color={color} />,
        }}
      />
    </Tabs>
  );
}
