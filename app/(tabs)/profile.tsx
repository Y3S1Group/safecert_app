import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { auth, db } from '@/config/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeftRight, Bell, Building, CheckCircle, ChevronRight, HelpCircle, HelpCircleIcon, LockIcon, LogOut, LogOutIcon, Mail, Phone, Shield, User, Languages } from 'lucide-react-native';
import CustomModal from '@/components/CustomModal';
import EditProfileForm from '@/components/EditProfileForm';
import { ActivityIndicator } from 'react-native-paper';
import { useAlert } from '@/contexts/AlertContext';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useLanguage } from '@/providers/languageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Constants from 'expo-constants';

interface UserInfo {
  name: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  uid: string;
}

interface Course {
  id: string;
  title: string;
  subtopicsCount: number;
  certificateTemplateId?: string;
}

export default function profile() {
  const router = useRouter();
  const { t } = useLanguage();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', department: '', jobTitle: '' });
  const [userLevel, setUserLevel] = useState(0);
  const [completedCoursesCount, setCompletedCoursesCount] = useState(0);
  const { showAlert } = useAlert();
  const { showSnackbar } = useSnackbar();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user.uid, user.email || '');
        await fetchUserLevel();
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
      let userData = userDoc.exists() ? userDoc.data() : {};
      const userInfoData: UserInfo = {
        name: userData?.name || t('profile.name'),
        email: email,
        phone: userData?.phone || t('common.notProvided'),
        department: userData?.department || t('common.notAssigned'),
        jobTitle: userData?.jobTitle || t('profile.employee'),
        uid: uid,
      };
      setUserInfo(userInfoData);
      setEditForm({
        name: userInfoData.name,
        phone: userInfoData.phone,
        department: userInfoData.department,
        jobTitle: userInfoData.jobTitle,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      showSnackbar({ message: t('common.errorLoadingData'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLevel = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        console.log('No user email found');
        return;
      }

      // Get user's enrolled courses
      const userDocRef = doc(db, 'users', userEmail);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('User document not found');
        return;
      }

      const userData = userDoc.data();
      const enrolledCourseIds = userData.courses || [];

      if (enrolledCourseIds.length === 0) {
        console.log('No enrolled courses');
        return;
      }

      // Fetch all enrolled courses data
      const coursesData: Course[] = [];
      for (const courseId of enrolledCourseIds) {
        const courseDoc = await getDoc(doc(db, 'courses', courseId));
        if (courseDoc.exists()) {
          coursesData.push({
            id: courseDoc.id,
            title: courseDoc.data().title,
            subtopicsCount: courseDoc.data().subtopicsCount || 0,
            certificateTemplateId: courseDoc.data().certificateTemplateId
          });
        }
      }

      // Count completed courses
      let completedCount = 0;

      for (const course of coursesData) {
        const progressDocRef = doc(db, 'users', userEmail, 'courseProgress', course.id);
        const progressDoc = await getDoc(progressDocRef);

        if (progressDoc.exists()) {
          const progressData = progressDoc.data();
          const completedSubtopicsCount = (progressData.completedSubtopics || []).length;
          
          // Check if course is completed
          if (completedSubtopicsCount > 0 && completedSubtopicsCount === course.subtopicsCount) {
            completedCount += 1;
          }
        }
      }

      setCompletedCoursesCount(completedCount);
      setUserLevel(Math.floor((completedCount + 1) / 2));

    } catch (error) {
      console.error('Error fetching user level:', error);
    }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getNextLevelRequirement = (level: number) => level * 2 + 1;

  const handleLogout = async () => {
    showAlert({
      message: t('profile.logoutConfirm'),
      icon: LogOutIcon,
      iconColor: '#FF6B35',
      iconBgColor: '#FEE2E2',
      buttons: [
        { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
        { text: t('auth.logout'), style: 'destructive', onPress: async () => { await signOut(auth); router.replace('/(auth)/authScreen'); } }
      ]
    });
  };

  const handleEditProfile = () => userInfo && setModalVisible(true);
  const handleFormChange = (field: string, value: string) => setEditForm(prev => ({ ...prev, [field]: value }));

  const handleSaveProfile = async () => {
    if (!userInfo) return;
    try {
      await updateDoc(doc(db, 'users', userInfo.email), {
        name: editForm.name,
        phone: editForm.phone,
        department: editForm.department,
        jobTitle: editForm.jobTitle
      });
      setUserInfo(prev => prev ? { ...prev, ...editForm } : null);
      setModalVisible(false);
      showAlert({
        message: t('profile.updateSuccess'),
        icon: CheckCircle,
        iconColor: '#10B981',
        iconBgColor: '#D1FAE5',
        autoClose: true,
        autoCloseDelay: 2000
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar({ message: t('profile.updateError'), type: 'error' });
    }
  };

  const handleCancelEdit = () => {
    if (userInfo) setEditForm({ name: userInfo.name, phone: userInfo.phone, department: userInfo.department, jobTitle: userInfo.jobTitle });
    setModalVisible(false);
  };

  const handleSwitchToInstructor = async () => {
    if (!userInfo) return;
    showAlert({
      message: t('profile.switchConfirm'),
      icon: ArrowLeftRight,
      iconColor: '#FF6B35',
      iconBgColor: '#FEE2E2',
      buttons: [
        { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
        {
          text: t('profile.switch'), style: 'default', onPress: async () => {
            try {
              const userRef = doc(db, 'users', userInfo.email);
              await updateDoc(userRef, { jobTitle: 'Instructor' });
              setUserInfo(prev => prev ? { ...prev, jobTitle: 'Instructor' } : null);
              showAlert({ message: t('profile.switchSuccess'), icon: CheckCircle, iconColor: '#10B981', iconBgColor: '#D1FAE5', autoClose: true, autoCloseDelay: 1500 });
              setTimeout(() => router.replace('/(tabs)/profile'), 1500);
            } catch (error) {
              console.error('Error switching role:', error);
              showSnackbar({ message: t('profile.switchError'), type: 'error' });
            }
          }
        }
      ]
    });
  };

  const handleNotifications = () => showAlert({ message: t('profile.notificationsComingSoon'), icon: Bell, iconColor: '#FF6B35', iconBgColor: '#eeefeeff', autoClose: true, autoCloseDelay: 1200 });
  const handlePrivacySecurity = () => showAlert({ message: t('profile.privacyComingSoon'), icon: LockIcon, iconColor: '#FF6B35', iconBgColor: '#eeefeeff', autoClose: true, autoCloseDelay: 1200 });
  const handleHelpSupport = () => showAlert({ message: t('profile.helpComingSoon'), icon: HelpCircleIcon, iconColor: '#FF6B35', iconBgColor: '#eeefeeff', autoClose: true, autoCloseDelay: 1200 });
  const handleLanguageSettings = () => setLanguageModalVisible(true);

  if (loading) return <View style={[styles.container, styles.centerContent]}><ActivityIndicator size="small" color="#FF6B35" /></View>;
  if (!userInfo) return <View style={[styles.container, styles.centerContent]}><Text style={styles.errorText}>{t('profile.unableToLoad')}</Text></View>;

  const currentLevel = userLevel;
  const nextLevelRequirement = getNextLevelRequirement(currentLevel);
  const progress = nextLevelRequirement > 0 ? completedCoursesCount / nextLevelRequirement : 0;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}><Text style={styles.headerTitle}>{t('profile.title')}</Text></View>
        </View>

        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(userInfo.name)}</Text></View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {userInfo.name}{userInfo.jobTitle === 'Employee' && ` (Lvl ${currentLevel})`}
              </Text>
              <Text style={styles.profileJobTitle}>{userInfo.jobTitle}</Text>
              {userInfo.jobTitle === 'Employee' && (
                <>
                  <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {completedCoursesCount}/{nextLevelRequirement} courses
                  </Text>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}><User size={20} color="#6B7280" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('profile.fullName')}</Text><Text style={styles.infoValue}>{userInfo.name}</Text></View></View>
            <View style={styles.divider} />
            <View style={styles.infoItem}><Mail size={20} color="#6B7280" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('profile.email')}</Text><Text style={styles.infoValue}>{userInfo.email}</Text></View></View>
            <View style={styles.divider} />
            <View style={styles.infoItem}><Phone size={20} color="#6B7280" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('profile.phone')}</Text><Text style={styles.infoValue}>{userInfo.phone}</Text></View></View>
            <View style={styles.divider} />
            <View style={styles.infoItem}><Building size={20} color="#6B7280" /><View style={styles.infoContent}><Text style={styles.infoLabel}>{t('profile.department')}</Text><Text style={styles.infoValue}>{userInfo.department}</Text></View></View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>

          {/* Language Setting */}
          <TouchableOpacity style={styles.settingItem} onPress={handleLanguageSettings}>
            <View style={styles.settingLeft}><Languages size={20} color="#6B7280" /><Text style={styles.settingText}>{t('profile.changeLanguage')}</Text></View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingItem} onPress={handleSwitchToInstructor}>
            <View style={styles.settingLeft}><Building size={20} color="#6B7280" /><Text style={styles.settingText}>{t('profile.switchToInstructor')}</Text></View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={styles.divider} />

          <View style={styles.settingsList}>
            <TouchableOpacity style={styles.settingItem} onPress={handleNotifications}><View style={styles.settingLeft}><Bell size={20} color="#6B7280" /><Text style={styles.settingText}>{t('profile.notifications')}</Text></View><ChevronRight size={20} color="#9CA3AF" /></TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem} onPress={handlePrivacySecurity}><View style={styles.settingLeft}><Shield size={20} color="#6B7280" /><Text style={styles.settingText}>{t('profile.privacy')}</Text></View><ChevronRight size={20} color="#9CA3AF" /></TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingItem} onPress={handleHelpSupport}><View style={styles.settingLeft}><HelpCircle size={20} color="#6B7280" /><Text style={styles.settingText}>{t('profile.helpSupport')}</Text></View><ChevronRight size={20} color="#9CA3AF" /></TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}><LogOut size={20} color="#B03A2E" /><Text style={styles.logoutText}>{t('auth.logout')}</Text></TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}><Text style={styles.footerText}>Safecert v{appVersion}</Text><Text style={styles.footerText}>{t('profile.copyright')}</Text></View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <CustomModal visible={modalVisible} onClose={() => setModalVisible(false)} title={t('profile.editProfile')} onSave={handleSaveProfile} onCancel={handleCancelEdit} saveButtonText={t('common.save')} cancelButtonText={t('common.cancel')}>
        <EditProfileForm formData={editForm} onFormChange={handleFormChange} />
      </CustomModal>

      {/* Language Switcher Modal */}
      <CustomModal visible={languageModalVisible} onClose={() => setLanguageModalVisible(false)} title={t('profile.changeLanguage')} hideButtons={true}>
        <LanguageSwitcher />
        <TouchableOpacity style={styles.closeLanguageButton} onPress={() => setLanguageModalVisible(false)}>
          <Text style={styles.closeLanguageButtonText}>{t('common.done')}</Text>
        </TouchableOpacity>
      </CustomModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 0.9,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
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
    marginTop: 20,
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
    marginBottom: 28,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeLanguageButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeLanguageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
});