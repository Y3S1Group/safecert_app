import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { auth, db } from '@/config/firebaseConfig'
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where, writeBatch, getDocs } from 'firebase/firestore'
import { AlertTriangle, Bell, CheckCircle, ChevronLeft, Trash2, CheckCheck, Trash } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLanguage } from '@/providers/languageContext'
import { useAlert } from '@/contexts/AlertContext'
import { useSnackbar } from '@/contexts/SnackbarContext'

interface Notification {
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    read: boolean
    createdAt: any
    userId: string
}

export default function Notifications () {
    const router = useRouter()
    const { t } = useLanguage()
    const { showAlert } = useAlert()
    const { showSnackbar } = useSnackbar()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        if (!auth.currentUser) return 

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs: Notification[] = []
            let unread = 0

            snapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() } as Notification
                notifs.push(data)
                if (!data.read) unread++
            })

            setNotifications(notifs)
            setUnreadCount(unread)
        })

        return () => unsubscribe()
    }, [])

    const markAsRead = async (notificationId: string) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                read: true
            })
        } catch (error) {
            console.error('Error marking notification as read:', error)
        }
    }

    const markAllAsRead = async () => {
        try {
            if (!auth.currentUser) return
            
            const batch = writeBatch(db)
            const unreadNotifs = notifications.filter(n => !n.read)

            if (unreadNotifs.length === 0) {
                showSnackbar({ message: t('notifications.noUnreadMessages'), type: 'info' })
                return
            }

            unreadNotifs.forEach((notif) => {
                const notifRef = doc(db, 'notifications', notif.id)
                batch.update(notifRef, { read: true })
            })

            await batch.commit()
            showSnackbar({ 
                message: t('notifications.markedAllAsRead'), 
                type: 'success' 
            })
        } catch (error) {
            console.error('Error marking all as read:', error)
            showSnackbar({ 
                message: t('notifications.markAllError'), 
                type: 'error' 
            })
        }
    }

    const deleteNotification = async (notificationId: string) => {
        try {
            await deleteDoc(doc(db, 'notifications', notificationId))
        } catch (error) {
            console.error('Error deleting notification:', error)
        }
    }

    const deleteAllNotifications = async () => {
        showAlert({
            message: t('notifications.deleteAllConfirm'),
            icon: Trash,
            iconColor: '#EF4444',
            iconBgColor: '#FEE2E2',
            buttons: [
                { text: t('common.cancel'), style: 'cancel', onPress: () => {} },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!auth.currentUser) return

                            const batch = writeBatch(db)
                            
                            notifications.forEach((notif) => {
                                const notifRef = doc(db, 'notifications', notif.id)
                                batch.delete(notifRef)
                            })

                            await batch.commit()
                            showSnackbar({ 
                                message: t('notifications.deletedAll'), 
                                type: 'success' 
                            })
                        } catch (error) {
                            console.error('Error deleting all notifications:', error)
                            showSnackbar({ 
                                message: t('notifications.deleteAllError'), 
                                type: 'error' 
                            })
                        }
                    }
                }
            ]
        })
    }

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success': return { Icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' }
            case 'warning': return { Icon: AlertTriangle, color: '#F59E0B', bg: '#FEF3C7' }
            case 'error': return { Icon: AlertTriangle, color: '#EF4444', bg: '#FEE2E2' }
            default: return { Icon: Bell, color: '#3B82F6', bg: '#DBEAFE' }
        }
    }

    const renderNotification = ({ item }: { item: Notification }) => {
        const { Icon, color, bg } = getNotificationIcon(item.type)

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard, 
                    !item.read && styles.unreadCard
                ]}
                onPress={() => markAsRead(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                    <Icon size={20} color={color} />
                </View>

                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <Text style={styles.notificationTime}>
                        {item.createdAt?.toDate?.()?.toLocaleString() || t('notifications.justNow')}
                    </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                        e.stopPropagation()
                        deleteNotification(item.id)
                    }}
                >
                    <Trash2 size={18} color="#9CA3AF" />
                </TouchableOpacity>
            </TouchableOpacity>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronLeft size={24} color="#111827" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{t('notifications.title')}</Text>

                <View style={styles.headerRight}>
                    {unreadCount > 0 && (
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Action Buttons */}
            {notifications.length > 0 && (
                <View style={styles.actionBar}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={markAllAsRead}
                        disabled={unreadCount === 0}
                    >
                        <CheckCheck size={18} color={unreadCount > 0 ? '#3B82F6' : '#9CA3AF'} />
                        <Text style={[
                            styles.actionButtonText,
                            { color: unreadCount > 0 ? '#3B82F6' : '#9CA3AF' }
                        ]}>
                            {t('notifications.markAllRead')}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.actionDivider} />

                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={deleteAllNotifications}
                    >
                        <Trash size={18} color="#EF4444" />
                        <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                            {t('notifications.deleteAll')}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Bell size={48} color="#D1D5DB"/>
                        <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
                        <Text style={styles.emptyText}>{t('notifications.allCaughtUp')}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
        marginHorizontal: 16,
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
    },
    headerBadge: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    actionBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E5E7EB',
    },
    listContent: {
        padding: 16,
    },
    notificationCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    unreadCard: {
        backgroundColor: '#F0F9FF',
        borderLeftColor: '#3B82F6',
        shadowOpacity: 0.08,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    notificationTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginRight: 12,
    },
    deleteButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
    },
});