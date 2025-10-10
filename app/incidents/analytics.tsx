import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, TrendingUp, AlertTriangle, Clock, CheckCircle, Activity, BarChart3, PieChartIcon, MapPin } from 'lucide-react-native'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import { useRouter } from 'expo-router'
import { LineChart, BarChart, PieChart, ProgressChart } from 'react-native-chart-kit'
import { Svg } from 'react-native-svg'
import { useLanguage } from '@/providers/languageContext' // NEW

const { width } = Dimensions.get('window')

interface AnalyticsData {
  totalIncidents: number;
  criticalIncidents: number;
  incidentsByPriority: { priority: string; count: number; color: string }[];
  incidentsByType: { type: string; count: number; percentage: number }[];
  weeklyTrend: number[];
  safetyTips: string[];
  trendIndicators: {
    incidentChange: number;
    criticalChange: number;
  };
}

export default function Analytics() {
  const router = useRouter()
  const { t } = useLanguage() // NEW
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d')

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    if (!auth.currentUser) return

    try {
      setLoading(true)

      const now = new Date()
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
      const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))

      const q = query(
        collection(db, 'incidents'),
        where('createdAt', '>=', startDate)
      )

      const querySnapshot = await getDocs(q)
      const incidents: any[] = []

      querySnapshot.forEach((doc) => {
        incidents.push({ id: doc.id, ...doc.data() })
      })

      const analytics: AnalyticsData = {
        totalIncidents: incidents.length,
        criticalIncidents: incidents.filter(i => i.priority === 'critical').length,
        incidentsByPriority: processIncidentsByPriority(incidents),
        incidentsByType: processIncidentsByType(incidents),
        weeklyTrend: calculateWeeklyTrend(incidents, daysBack),
        safetyTips: generateSafetyTips(incidents, {
          incidentsByPriority: processIncidentsByPriority(incidents),
          criticalIncidents: incidents.filter(i => i.priority === 'critical').length
        }),
        trendIndicators: await calculateTrendIndicators(incidents, daysBack)
      }

      // Generate safety tips based on all analytics
      analytics.safetyTips = generateSafetyTips(incidents, analytics)

      setAnalyticsData(analytics)

    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const processIncidentsByType = (incidents: any[]) => {
    const typeCount: { [key: string]: number } = {}

    incidents.forEach(incident => {
      typeCount[incident.incidentType] = (typeCount[incident.incidentType] || 0) + 1
    })

    const total = incidents.length || 1
    return Object.entries(typeCount)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count)
  }

  const processIncidentsByPriority = (incidents: any[]) => {
    const priorityCount: { [key: string]: number } = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }

    incidents.forEach(incident => {
      if (priorityCount.hasOwnProperty(incident.priority)) {
        priorityCount[incident.priority]++
      }
    })

    return Object.entries(priorityCount).map(([priority, count]) => ({
      priority,
      count,
      color: getPriorityColor(priority)
    }))
  }

  const calculateWeeklyTrend = (incidents: any[], daysBack: number) => {
    const weeks = Math.ceil(daysBack / 7)
    const weeklyData = Array(Math.min(weeks, 4)).fill(0)

    incidents.forEach(incident => {
      if (incident.createdAt?.toDate) {
        const daysAgo = Math.floor((Date.now() - incident.createdAt.toDate()) / (1000 * 60 * 60 * 24))
        const weekIndex = Math.floor(daysAgo / 7)
        if (weekIndex < weeklyData.length) {
          weeklyData[weeklyData.length - 1 - weekIndex]++
        }
      }
    })

    return weeklyData
  }

  const generateSafetyTips = (incidents: any[], analytics: any) => {
    const tips: string[] = []

    // Tip based on critical incidents
    if (analytics.criticalIncidents > 0) {
      // Since t() doesn't support interpolation, build the string manually
      tips.push(`${analytics.criticalIncidents} ${t('analytics.tips.criticalIncidentsDetected')}`)
    }

    // Tip based on priority distribution
    const criticalCount = analytics.incidentsByPriority.find((p: any) => p.priority === 'critical')?.count || 0
    const highCount = analytics.incidentsByPriority.find((p: any) => p.priority === 'high')?.count || 0

    if (criticalCount > 0 || highCount > 3) {
      tips.push(t('analytics.tips.highRiskDetected'))
    }

    // Generic safety reminder
    if (incidents.length > 10) {
      tips.push(t('analytics.tips.multipleIncidents'))
    } else if (incidents.length > 0) {
      tips.push(t('analytics.tips.stayAlert'))
    } else {
      tips.push(t('analytics.tips.greatJob'))
    }

    return tips.slice(0, 3)
  }

  const calculateTrendIndicators = async (currentIncidents: any[], daysBack: number) => {
    try {
      // Get previous period data
      const prevStartDate = new Date(Date.now() - (daysBack * 2 * 24 * 60 * 60 * 1000))
      const prevEndDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000))

      const prevQuery = query(
        collection(db, 'incidents'),
        where('createdAt', '>=', prevStartDate),
        where('createdAt', '<', prevEndDate)
      )

      const prevSnapshot = await getDocs(prevQuery)
      const prevIncidents: any[] = []
      prevSnapshot.forEach((doc) => {
        prevIncidents.push({ id: doc.id, ...doc.data() })
      })

      const prevTotal = prevIncidents.length
      const prevCritical = prevIncidents.filter(i => i.priority === 'critical').length

      const currentTotal = currentIncidents.length
      const currentCritical = currentIncidents.filter(i => i.priority === 'critical').length

      // Calculate percentage change
      const incidentChange = prevTotal === 0 ? 0 : Math.round(((currentTotal - prevTotal) / prevTotal) * 100)
      const criticalChange = prevCritical === 0 ? 0 : Math.round(((currentCritical - prevCritical) / prevCritical) * 100)

      return { incidentChange, criticalChange }
    } catch (error) {
      console.error('Error calculating trends:', error)
      return { incidentChange: 0, criticalChange: 0 }
    }
  }

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#EF4444'
      case 'high': return '#F97316'
      case 'medium': return '#F59E0B'
      case 'low': return '#10B981'
      default: return '#6B7280'
    }
  }

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '7d': return t('analytics.timeRange.7days')
      case '30d': return t('analytics.timeRange.30days')
      case '90d': return t('analytics.timeRange.90days')
      case '1y': return t('analytics.timeRange.1year')
      default: return t('analytics.timeRange.30days')
    }
  }

  // NEW: Function to get translated priority labels
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return t('reports.priority.low')
      case 'medium': return t('reports.priority.medium')
      case 'high': return t('reports.priority.high')
      case 'critical': return t('reports.priority.critical')
      default: return priority
    }
  }

  if (loading || !analyticsData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconContainer}>
            <Activity size={40} color="#FF6B35" />
          </View>
          <Text style={styles.loadingText}>{t('analytics.analyzingData')}</Text>
          <Text style={styles.loadingSubtext}>{t('analytics.pleaseWait')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('analytics.title')}</Text>
          <Text style={styles.headerSubtitle}>{getTimeRangeLabel(timeRange)}</Text>
        </View>
        <View style={styles.headerIcon}>
          <TrendingUp size={24} color="#FF6B35" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timeRangeContent}
          >
            {[
              { key: '7d', label: t('analytics.timeRangeButtons.7days') },
              { key: '30d', label: t('analytics.timeRangeButtons.30days') },
              { key: '90d', label: t('analytics.timeRangeButtons.90days') },
              { key: '1y', label: t('analytics.timeRangeButtons.1year') }
            ].map((range) => (
              <TouchableOpacity
                key={range.key}
                style={[
                  styles.timeRangeButton,
                  timeRange === range.key && styles.timeRangeButtonActive
                ]}
                onPress={() => setTimeRange(range.key as any)}
              >
                <Text style={[
                  styles.timeRangeText,
                  timeRange === range.key && styles.timeRangeTextActive
                ]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Stats Bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analyticsData.totalIncidents}</Text>
            <Text style={styles.statLabel}>{t('analytics.totalIncidents')}</Text>
            {analyticsData.trendIndicators.incidentChange !== 0 && (
              <Text style={[
                styles.trendBadge,
                { color: analyticsData.trendIndicators.incidentChange > 0 ? '#EF4444' : '#10B981' }
              ]}>
                {analyticsData.trendIndicators.incidentChange > 0 ? '↑' : '↓'} {Math.abs(analyticsData.trendIndicators.incidentChange)}%
              </Text>
            )}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{analyticsData.criticalIncidents}</Text>
            <Text style={styles.statLabel}>{t('analytics.critical')}</Text>
            {analyticsData.trendIndicators.criticalChange !== 0 && (
              <Text style={[
                styles.trendBadge,
                { color: analyticsData.trendIndicators.criticalChange > 0 ? '#EF4444' : '#10B981' }
              ]}>
                {analyticsData.trendIndicators.criticalChange > 0 ? '↑' : '↓'} {Math.abs(analyticsData.trendIndicators.criticalChange)}%
              </Text>
            )}
          </View>
        </View>

        {/* Safety Tips Section */}
        <View style={[styles.section, styles.safetyTipsSection]}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>{t('analytics.safetyTips')}</Text>
          </View>
          {analyticsData.safetyTips.length > 0 ? (
            analyticsData.safetyTips.map((tip, index) => (
              <View key={index} style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <CheckCircle size={16} color="#10B981" />
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <CheckCircle size={16} color="#10B981" />
              </View>
              <Text style={styles.tipText}>{t('analytics.tips.greatJob')}</Text>
            </View>
          )}
        </View>


        {/* Priority Distribution */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>{t('analytics.riskDistribution')}</Text>
          </View>
          <View style={styles.priorityDistribution}>
            {analyticsData.incidentsByPriority.map((item) => (
              <View key={item.priority} style={styles.priorityRow}>
                <View style={styles.priorityInfo}>
                  <View style={[styles.priorityDot, { backgroundColor: item.color }]} />
                  <Text style={styles.priorityName}>
                    {getPriorityLabel(item.priority)}
                  </Text>
                </View>
                <Text style={[styles.priorityCount, { color: item.color }]}>
                  {item.count}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Incidents by Type */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>{t('analytics.incidentsByType')}</Text>
          </View>

          <BarChart
            data={{
              labels: analyticsData.incidentsByType.slice(0, 5).map(item =>
                item.type.length > 10 ? item.type.substring(0, 10) + '...' : item.type
              ),
              datasets: [{
                data: analyticsData.incidentsByType.slice(0, 5).map(item => item.count)
              }]
            }}
            width={width - 64}
            height={220}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForLabels: {
                fontSize: 10
              }
            }}
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
            showValuesOnTopOfBars
            fromZero
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>{t('analytics.incidentTrend')}</Text>
          </View>

          <LineChart
            data={{
              labels: analyticsData.weeklyTrend.length === 4
                ? [t('analytics.weekLabels.week1'), t('analytics.weekLabels.week2'), t('analytics.weekLabels.week3'), t('analytics.weekLabels.week4')]
                : analyticsData.weeklyTrend.length === 13
                  ? ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12', 'W13']
                  : analyticsData.weeklyTrend.length === 52
                    ? ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12']
                    : [t('analytics.weekLabels.week1'), t('analytics.weekLabels.week2')],
              datasets: [{
                data: analyticsData.weeklyTrend.length > 0
                  ? [...analyticsData.weeklyTrend, Math.max(...analyticsData.weeklyTrend) * 1.1] // Add padding for visibility
                  : [0, 1]
              }]
            }}
            width={width - 64}
            height={220}
            chartConfig={{
              backgroundColor: '#FF6B35',
              backgroundGradientFrom: '#FF6B35',
              backgroundGradientTo: '#F97316',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#FFFFFF'
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
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
    width: 36,
    height: 36,
    borderWidth: 0.3,
    borderRadius: 20,
    backgroundColor: '#ffffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeRangeContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  timeRangeButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  trendBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  safetyTipsSection: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  tipIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontWeight: '500',
  },
  priorityDistribution: {
    gap: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  priorityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  priorityCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
})