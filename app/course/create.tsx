import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { addDoc, collection, setDoc, doc } from "firebase/firestore";
import { db } from "@/config/firebaseConfig"; 
import { useRouter } from "expo-router";
import Stepper from '@/components/stepper';
import { useLanguage } from '@/providers/languageContext';

export default function CreateCourse() {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [customId, setCustomId] = useState("");
  const router = useRouter();
  const { t } = useLanguage();

  // Generate custom ID like SAFE-COURSE-001, SAFE-COURSE-002, etc.
  useEffect(() => {
    const generateCustomId = () => {
      const randomNum = Math.floor(1000 + Math.random() * 9000); // random 4-digit
      setCustomId(`SAFE-COURSE-${randomNum}`);
    };
    generateCustomId();
  }, []);

  const handleCreateCourse = async () => {
    if (!courseTitle.trim() || !courseDescription.trim()) {
      Alert.alert(t('common.validation'), t('course.fillAllFields'));
      return;
    }

    try {
      const docRef = await setDoc(doc(db, "courses", customId), {
        customId,
        title: courseTitle,
        description: courseDescription,
        createdAt: new Date(),
        status: "draft",
      });

      Alert.alert(t('common.success'), t('course.createSuccess'));
      // Move to next step (certificate template creation)
      router.push({
        pathname: "/certificate/certificates",
        params: { courseId: customId },
      });

      setCourseTitle("");
      setCourseDescription("");
    } catch (error) {
      console.error("Error creating course:", error);
      Alert.alert(t('common.error'), t('course.createError'));
    }
  };

  const handleBack = () => {
    router.replace('/instructor/instructorDash');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stepper 
        currentStep={1} 
        steps={[t('course.createCourse'), t('course.createCertificate')]} 
      />
      <Text style={styles.header}>{t('course.createNewCourse')}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>{t('course.courseId')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: "#f1f1f1" }]}
          value={customId}
          editable={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('course.courseTitle')}</Text>
        <TextInput
          style={styles.input}
          value={courseTitle}
          onChangeText={setCourseTitle}
          placeholder={t('course.enterCourseTitle')}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('course.description')}</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: "top" }]}
          value={courseDescription}
          onChangeText={setCourseDescription}
          placeholder={t('course.enterDescription')}
          multiline
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCreateCourse}>
        <Text style={styles.buttonText}>{t('course.saveContinue')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.buttonText}>{t('common.back')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 20,
    color: "#1B365D",
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#1B365D",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },
  backButton: {
    backgroundColor: "#777171ff",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});