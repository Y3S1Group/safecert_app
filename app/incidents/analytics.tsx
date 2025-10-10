import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, Clock, CheckCircle, Activity, BarChart3, Calendar } from 'lucide-react-native'
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
  trendData: number[];
  trendLabels: string[];
  safetyTips: string[];
  trendIndicators: {
    incidentChange: number;
    criticalChange: number;
  };
}

type TrendView = 'weekly' | 'monthly'

export default function Analytics() {
  const router = useRouter()
  const { t } = useLanguage() // NEW
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [statsTimeRange, setStatsTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [trendView, setTrendView] = useState<TrendView>('weekly')
  const [trendOffset, setTrendOffset] = useState(0) // For navigating through time periods

  useEffect(() => {
    fetchAnalyticsData()
  }, [statsTimeRange, trendView, trendOffset])

  const fetchAnalyticsData = async () => {
    if (!auth.currentUser) return

    try {
      if (initialLoading) {
        setInitialLoading(true)
      }

      const now = new Date()
      const daysBack = statsTimeRange === '7d' ? 7 : statsTimeRange === '30d' ? 30 : statsTimeRange === '90d' ? 90 : 365
      const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))

      const statsQuery = query(
        collection(db, 'incidents'),
        where('createdAt', '>=', startDate)
      )

      const statsSnapshot = await getDocs(statsQuery)
      const statsIncidents: any[] = []

      statsSnapshot.forEach((doc) => {
        statsIncidents.push({ id: doc.id, ...doc.data() })
      })

      const allIncidentsQuery = query(collection(db, 'incidents'))
      const allIncidentsSnapshot = await getDocs(allIncidentsQuery)
      const allIncidents: any[] = []
      
      allIncidentsSnapshot.forEach((doc) => {
        allIncidents.push({ id: doc.id, ...doc.data() })
      })
      const trendResult = trendView === 'weekly' 
        ? calculateWeeklyTrendByMonth(allIncidents, trendOffset)
        : calculateMonthlyTrend(allIncidents, trendOffset)
      const analytics: AnalyticsData = {
        totalIncidents: statsIncidents.length,
        criticalIncidents: statsIncidents.filter(i => i.priority === 'critical').length,
        incidentsByPriority: processIncidentsByPriority(statsIncidents),
        incidentsByType: processIncidentsByType(statsIncidents),
        trendData: trendResult.data,
        trendLabels: trendResult.labels,
        safetyTips: [],
        trendIndicators: await calculateTrendIndicators(statsIncidents, daysBack)
      }
      
      setAnalyticsData(analytics)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      if (initialLoading) {
        setInitialLoading(false)
      }
    }
  }

  const calculateWeeklyTrendByMonth = (incidents: any[], offset: number = 0) => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    
    // Get all weeks in this month
    const weeks: { start: Date; end: Date; label: string }[] = []
    let weekCounter = 1
    
    let currentDate = new Date(currentMonth)
    
    while (currentDate < nextMonth) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6)

      if (weekEnd >= nextMonth) {
        weekEnd.setTime(nextMonth.getTime() - 1)
      }

      weeks.push({
        start: new Date(weekStart),
        end: new Date(weekEnd),
        label: `W${weekCounter}`
      })

      weekCounter++
      currentDate.setDate(currentDate.getDate() + 7)
    }

    const weeklyData = Array(weeks.length).fill(0)
    
    incidents.forEach(incident => {
      if (incident.createdAt?.toDate) {
        const incidentDate = incident.createdAt.toDate()
        
        weeks.forEach((week, index) => {
          if (incidentDate >= week.start && incidentDate <= week.end) {
            weeklyData[index]++
          }
        })
      }
    })
    return {
      data: weeklyData,
      labels: weeks.map(w => w.label)
    }
  }

  const calculateMonthlyTrend = (incidents: any[], offset: number = 0) => {
    const now = new Date()
    const monthsToShow = 6
    const monthlyData = Array(monthsToShow).fill(0)
    const labels: string[] = []
    incidents.forEach(incident => {
      if (incident.createdAt?.toDate) {
        const incidentDate = incident.createdAt.toDate()
        const currentDate = new Date(now)
        
        currentDate.setMonth(currentDate.getMonth() - offset)
        
        const monthsDiff = (currentDate.getFullYear() - incidentDate.getFullYear()) * 12 + 
                          (currentDate.getMonth() - incidentDate.getMonth())
        
        if (monthsDiff >= 0 && monthsDiff < monthsToShow) {
          monthlyData[monthsToShow - 1 - monthsDiff]++
        }
      }
    })
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = new Date(now)
      monthDate.setMonth(monthDate.getMonth() - i - offset)
      labels.push(monthDate.toLocaleString('default', { month: 'short' }))
    }
    return { data: monthlyData, labels }
  }

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }
  const getCurrentPeriodLabel = () => {
    const now = new Date()
    const displayDate = new Date(now.getFullYear(), now.getMonth() - trendOffset, 1)
    
    if (trendView === 'weekly') {
      return displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })
    } else {
      return displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })
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

  const calculateTrendIndicators = async (currentIncidents: any[], daysBack: number) => {
    try {
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

  const handleTrendNavigation = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setTrendOffset(prev => prev + 1) // Go to past
    } else {
      setTrendOffset(prev => Math.max(0, prev - 1)) // Go to recent (can't go beyond current)
    }
  }

  const resetToCurrentPeriod = () => {
    setTrendOffset(0)
  }

  if (initialLoading || !analyticsData) {
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

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 16 },
    propsForLabels: { fontSize: 10 },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#FF6B35'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('analytics.title')}</Text>
          <Text style={styles.headerSubtitle}>{getTimeRangeLabel(statsTimeRange)}</Text>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeRangeContent}>
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
                  statsTimeRange === range.key && styles.timeRangeButtonActive
                ]}
                onPress={() => setStatsTimeRange(range.key as any)}
              >
                <Text style={[
                  styles.timeRangeText,
                  statsTimeRange === range.key && styles.timeRangeTextActive
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

        {/* Incident Trend Chart with Navigation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>{t('analytics.incidentTrend')}</Text>
          </View>

          {/* Trend View Toggle */}
          <View style={styles.trendViewToggle}>
            <TouchableOpacity
              style={[styles.trendViewButton, trendView === 'weekly' && styles.trendViewButtonActive]}
              onPress={() => {
                setTrendView('weekly')
                setTrendOffset(0)
              }}
            >
              <Text style={[styles.trendViewText, trendView === 'weekly' && styles.trendViewTextActive]}>
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.trendViewButton, trendView === 'monthly' && styles.trendViewButtonActive]}
              onPress={() => {
                setTrendView('monthly')
                setTrendOffset(0)
              }}
            >
              <Text style={[styles.trendViewText, trendView === 'monthly' && styles.trendViewTextActive]}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View>
          {/* Period Navigation */}
          <View style={styles.periodNavigation}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => handleTrendNavigation('left')}
            >
              <ChevronLeft size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.currentPeriod} onPress={resetToCurrentPeriod}>
              <Calendar size={16} color="#FF6B35" />
              <Text style={styles.currentPeriodText}>
                {trendOffset === 0 ? getCurrentPeriodLabel() : getCurrentPeriodLabel()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, trendOffset === 0 && styles.navButtonDisabled]}
              onPress={() => handleTrendNavigation('right')}
              disabled={trendOffset === 0}
            >
              <ChevronRight size={20} color={trendOffset === 0 ? '#D1D5DB' : '#6B7280'} />
            </TouchableOpacity>
          </View>
          {/* Line Chart */}
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: analyticsData.trendLabels,
                datasets: [{
                  data: analyticsData.trendData.length > 0 ? analyticsData.trendData : [0]
                }]
              }}
              width={width - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLines={false}
              withHorizontalLines={true}
              fromZero
            />
          </View>
        </View>
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
    padding: 20,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  timeRangeSection: {
    marginBottom: 20,
  },
  timeRangeContent: {
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  timeRangeButtonActive: {
    backgroundColor: '#FF6B35',
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  trendBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  trendViewToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  trendViewButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  trendViewButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trendViewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  trendViewTextActive: {
    color: '#FF6B35',
  },
  periodNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  currentPeriod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF3E2',
    borderRadius: 20,
    marginHorizontal: 12,
  },
  currentPeriodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  chart: {
    borderRadius: 16,
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
})