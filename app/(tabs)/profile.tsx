import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { auth, db } from '@/config/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Bell, Building, CheckCircle, ChevronRight, HelpCircle, HelpCircleIcon, LockIcon, LogOut, LogOutIcon, Mail, Phone, Shield, User } from 'lucide-react-native';
import CustomModal from '@/components/CustomModal';
import EditProfileForm from '@/components/EditProfileForm';
import { ActivityIndicator } from 'react-native-paper';
import CustomeAlert from '@/components/CustomeAlert';
import { useAlert } from '@/contexts/AlertContext';
import { useSnackbar } from '@/contexts/SnackbarContext';

interface UserInfo {
  name: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  uid: string;
}

export default function profile() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    department: '',
    jobTitle: ''
  });
  const { showAlert } = useAlert()
  const { showSnackbar } = useSnackbar()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user.uid, user.email || '');
      } else {
        setUserInfo(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string, email: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', email));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userInfoData = {
          name: userData.name || 'User',
          email: email,
          phone: userData.phone || 'Not provided',
          department: userData.department || 'Not assigned',
          jobTitle: userData.jobTitle || 'Employee',
          uid: uid
        };
        setUserInfo(userInfoData);
        setEditForm({
          name: userInfoData.name,
          phone: userInfoData.phone,
          department: userInfoData.department,
          jobTitle: userInfoData.jobTitle
        });
      } else {
        const defaultUserInfo = {
          name: 'User',
          email: email,
          phone: 'Not provided',
          department: 'Not assigned',
          jobTitle: 'Employee',
          uid: uid
        };
        setUserInfo(defaultUserInfo);
        setEditForm({
          name: defaultUserInfo.name,
          phone: defaultUserInfo.phone,
          department: defaultUserInfo.department,
          jobTitle: defaultUserInfo.jobTitle
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      showSnackbar({
        message: 'Failed to load user data',
        type: 'error'
      })
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const handleLogout = async () => {
    showAlert({
      message: 'Are you sure you want to log out?',
      icon: LogOutIcon,
      iconColor: '#FF6B35',
      iconBgColor: '#FEE2E2',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Cancelled')
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth)
              router.replace('/(auth)/authScreen')
            } catch (error) {
              console.error('Error signing out:', error)
            }
          }
        }
      ]
    })
  };

  const handleEditProfile = () => {
    if (!userInfo) return;
    setModalVisible(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!userInfo) return;
    try {
      await updateDoc(doc(db, 'users', userInfo.email), {
        name: editForm.name,
        phone: editForm.phone,
        department: editForm.department,
        jobTitle: editForm.jobTitle
      });
      setUserInfo(prev => prev ? {
        ...prev,
        name: editForm.name,
        phone: editForm.phone,
        department: editForm.department,
        jobTitle: editForm.jobTitle
      } : null);
      setModalVisible(false);
      showAlert({
        message: 'Profile updated successfully',
        icon: CheckCircle,
        iconColor: '#10B981',
        iconBgColor: '#D1FAE5',
        autoClose: true,
        autoCloseDelay: 2000
      })
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar({
        message: 'Failed to update profile',
        type: 'error'
      })
    }
  };

  const handleCancelEdit = () => {
    if (userInfo) {
      setEditForm({
        name: userInfo.name,
        phone: userInfo.phone,
        department: userInfo.department,
        jobTitle: userInfo.jobTitle
      });
    }
    setModalVisible(false);
  };

  const handleNotifications = () => {
    showAlert({
      message: 'Notification settings coming soon! Stay tuned for updates.',
      icon: Bell,
      iconColor: '#FF6B35',
      iconBgColor: '#eeefeeff',
      autoClose: true,
      autoCloseDelay: 1200
    })
  };
  const handlePrivacySecurity = () => {
    showAlert({
      message: 'Privacy & Security settings coming soon!',
      icon: LockIcon,
      iconColor: '#FF6B35',
      iconBgColor: '#eeefeeff',
      autoClose: true,
      autoCloseDelay: 1200
    })
  };
  const handleHelpSupport = () => {
    showAlert({
      message: 'Help & Support center coming soon!',
      icon: HelpCircleIcon,
      iconColor: '#FF6B35',
      iconBgColor: '#eeefeeff',
      autoClose: true,
      autoCloseDelay: 1200
    })
  };


  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#FF6B35" />
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Unable to load profile</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userInfo.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userInfo.name}</Text>
            <Text style={styles.profileJobTitle}>{userInfo.jobTitle}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      {/* Personal Information */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <User size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{userInfo.name}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Mail size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userInfo.email}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Phone size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{userInfo.phone}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Building size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{userInfo.department}</Text>
            </View>
          </View>
        </View>
      </View>
      {/* Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={handleNotifications}>
            <View style={styles.settingLeft}>
              <Bell size={20} color="#6B7280" />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem} onPress={handlePrivacySecurity}>
            <View style={styles.settingLeft}>
              <Shield size={20} color="#6B7280" />
              <Text style={styles.settingText}>Privacy & Security</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingItem} onPress={handleHelpSupport}>
            <View style={styles.settingLeft}>
              <HelpCircle size={20} color="#6B7280" />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
            <LogOut size={20} color="#B03A2E" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Safety App v1.0.0</Text>
        <Text style={styles.footerText}>© 2025 Safety First Inc.</Text>
      </View>
    </ScrollView>
    <CustomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Edit Profile"
        onSave={handleSaveProfile}
        onCancel={handleCancelEdit}
        saveButtonText="Save"
        cancelButtonText="Cancel"
      >
        <EditProfileForm 
          formData={editForm}
          onFormChange={handleFormChange}
        />
    </CustomModal>
    </>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    marginTop: 40,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 30,
    paddingBottom: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#B03A2E',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1B365D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileJobTitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  editButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoList: {
    paddingVertical: 0,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingsList: {
    paddingVertical: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 12,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#B03A2E',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 16,
    marginRight: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});