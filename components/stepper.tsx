import { View, Text, StyleSheet } from 'react-native';
import React from 'react';

type StepperProps = {
  currentStep: number; // 1-based index
  steps: string[];
};

export default function Stepper({ currentStep, steps }: StepperProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index + 1 === currentStep;
        const isCompleted = index + 1 < currentStep;

        return (
          <View key={index} style={styles.stepContainer}>
            {/* Circle */}
            <View
              style={[
                styles.circle,
                isCompleted && styles.completedCircle,
                isActive && styles.activeCircle,
              ]}
            >
              {isCompleted ? <Text style={styles.checkMark}>✓</Text> : <Text style={styles.circleText}>{index + 1}</Text>}
            </View>

            {/* Step Label */}
            <Text style={[styles.stepLabel, isActive && styles.activeStepLabel]}>
              {step}
            </Text>

            {/* Line */}
            {index !== steps.length - 1 && (
              <View
                style={[
                  styles.line,
                  isCompleted ? styles.completedLine : styles.inactiveLine,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  activeCircle: {
    borderColor: '#1B365D',
    backgroundColor: '#1B365D',
  },
  completedCircle: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  circleText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  checkMark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flexShrink: 1,
  },
  activeStepLabel: {
    color: '#1B365D',
    fontWeight: '600',
  },
  line: {
    height: 2,
    flex: 1,
    marginHorizontal: 4,
  },
  completedLine: {
    backgroundColor: '#10B981',
  },
  inactiveLine: {
    backgroundColor: '#D1D5DB',
  },
});
