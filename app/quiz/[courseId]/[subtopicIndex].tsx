import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '@/config/firebaseConfig';
import { QuizQuestion, QuizAttempt } from '@/types/quiz';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';

export default function QuizPage() {
  const { courseId, subtopicIndex, quizData } = useLocalSearchParams();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (quizData) {
      try {
        const parsedQuiz = JSON.parse(decodeURIComponent(quizData as string));
        setQuestions(parsedQuiz);
        setSelectedAnswers(new Array(parsedQuiz.length).fill(-1));
      } catch (error) {
        console.error('Error parsing quiz data:', error);
        Alert.alert('Error', 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }
  }, [quizData]);

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return (correct / questions.length) * 100;
  };

  const handleSubmit = async () => {
    const unanswered = selectedAnswers.filter(a => a === -1).length;
    if (unanswered > 0) {
      Alert.alert('Incomplete', `You have ${unanswered} unanswered questions. Please answer all questions.`);
      return;
    }

    const finalScore = calculateScore();
    const passed = finalScore >= 70;
    setScore(finalScore);
    setShowResults(true);

    // Save quiz attempt and update progress
    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      const attemptId = `${courseId}_${subtopicIndex}_${Date.now()}`;
      await setDoc(doc(db, 'quizAttempts', attemptId), {
        quizId: attemptId,
        courseId,
        subtopicIndex: parseInt(subtopicIndex as string),
        userId: user.uid,
        userEmail: user.email,
        answers: selectedAnswers,
        score: finalScore,
        passed,
        completedAt: new Date(),
      });

      // Update course progress if passed
      if (passed) {
        const progressRef = doc(db, 'users', user.email, 'courseProgress', courseId as string);
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
          const currentProgress = progressSnap.data();
          const completedSubtopics = currentProgress.completedSubtopics || [];
          
          if (!completedSubtopics.includes(parseInt(subtopicIndex as string))) {
            await updateDoc(progressRef, {
              completedSubtopics: arrayUnion(parseInt(subtopicIndex as string)),
              lastUpdated: new Date(),
            });
          }
        } else {
          // Create new progress document
          await setDoc(progressRef, {
            courseId,
            userId: user.uid,
            completedSubtopics: [parseInt(subtopicIndex as string)],
            lastUpdated: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (showResults) {
    const passed = score >= 70;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.resultsContainer}>
          {passed ? (
            <CheckCircle size={80} color="#10B981" />
          ) : (
            <XCircle size={80} color="#EF4444" />
          )}
          
          <Text style={styles.resultsTitle}>
            {passed ? 'Congratulations! 🎉' : 'Keep Trying!'}
          </Text>
          
          <Text style={styles.scoreText}>Your Score: {score.toFixed(0)}%</Text>
          
          <Text style={styles.resultsMessage}>
            {passed 
              ? 'You passed! This subtopic is now marked as complete.' 
              : 'You need 70% to pass. Review the materials and try again.'}
          </Text>

          <View style={styles.resultsSummary}>
            <Text style={styles.summaryText}>
              Correct: {questions.filter((q, i) => selectedAnswers[i] === q.correctAnswer).length} / {questions.length}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.backToCourseButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToCourseButtonText}>Back to Course</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const question = questions[currentQuestion];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Question {currentQuestion + 1} of {questions.length}</Text>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswers[currentQuestion] === index && styles.optionSelected
              ]}
              onPress={() => handleAnswerSelect(index)}
            >
              <View style={[
                styles.optionCircle,
                selectedAnswers[currentQuestion] === index && styles.optionCircleSelected
              ]}>
                {selectedAnswers[currentQuestion] === index && (
                  <View style={styles.optionCircleInner} />
                )}
              </View>
              <Text style={[
                styles.optionText,
                selectedAnswers[currentQuestion] === index && styles.optionTextSelected
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentQuestion === 0}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentQuestion === questions.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.submitButton]}
            onPress={handleSubmit}
          >
            <Text style={[styles.navButtonText, styles.submitButtonText]}>Submit Quiz</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navButton}
            onPress={handleNext}
          >
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  optionSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleSelected: {
    borderColor: '#FF6B35',
  },
  optionCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#111827',
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#FF6B35',
  },
  submitButtonText: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 16,
  },
  resultsMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  resultsSummary: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 32,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  backToCourseButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backToCourseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});