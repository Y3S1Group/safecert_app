import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Download } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseConfig';
import { PDFDocument, PageSizes, rgb, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

const safecertLogo = require('@/assets/images/SafeCert.png');

interface Template {
  id: string;
  courseName: string;
  courseDescription: string;
  instructorName: string;
  instructorTitle: string;
  organizationName: string;
  logoUrl: string;
  completionDate: string;
  primaryColor: string;
  secondaryColor: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  completionDate?: string;
}

export default function GenerateCertificate() {
  const APP_NAME = 'SafeCert';
  const APP_TAGLINE = 'Digital Safety Certification';
  const router = useRouter();
  const { courseId, certificateTemplateId } = useLocalSearchParams();

  const [receiverName, setReceiverName] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

  // Fetch current user name
  useEffect(() => {
    console.log('=== USER INFO ===');
    console.log('Current User:', auth.currentUser);
    console.log('Display Name:', auth.currentUser?.displayName);
    console.log('Email:', auth.currentUser?.email);
    
    if (auth.currentUser?.displayName) {
      setReceiverName(auth.currentUser.displayName);
    } else if (auth.currentUser?.email) {
      setReceiverName(auth.currentUser.email.split('@')[0]);
    }
    console.log('Receiver Name Set To:', receiverName);
  }, []);

  // Fetch course and template data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        console.log('=== FETCHING DATA ===');
        console.log('CourseId from params:', courseId);
        console.log('TemplateId from params:', certificateTemplateId);
        console.log('CourseId type:', typeof courseId);
        console.log('TemplateId type:', typeof certificateTemplateId);

        // Fetch course details
        if (courseId) {
          console.log('--- Fetching Course ---');
          console.log('Querying collection: courses');
          console.log('Document ID:', courseId);
          
          const courseDoc = await getDoc(doc(db, 'courses', courseId as string));
          
          console.log('Course document exists:', courseDoc.exists());
          
          if (courseDoc.exists()) {
            console.log('Course data found:', courseDoc.data());
            const courseData = {
              id: courseDoc.id,
              title: courseDoc.data().title || '',
              description: courseDoc.data().description || '',
              instructor: courseDoc.data().instructor || '',
              completionDate: courseDoc.data().completionDate || new Date().toISOString(),
            };
            console.log('Setting course state:', courseData);
            setCourse(courseData);
          } else {
            console.log('❌ Course document does NOT exist!');
            console.log('Check if document ID is correct in Firestore');
          }
        } else {
          console.log('⚠️ No courseId provided in params');
        }

        // Fetch template details
        if (certificateTemplateId) {
          console.log('--- Fetching Template ---');
          console.log('Querying collection: certificateTemplates');
          console.log('Document ID:', certificateTemplateId);
          
          const templateDoc = await getDoc(doc(db, 'certificateTemplates', certificateTemplateId as string));
          
          console.log('Template document exists:', templateDoc.exists());
          
          if (templateDoc.exists()) {
            console.log('Template data found:', templateDoc.data());
            const templateData = {
              id: templateDoc.id,
              courseName: templateDoc.data().courseName || '',
              courseDescription: templateDoc.data().courseDescription || '',
              instructorName: templateDoc.data().instructorName || '',
              instructorTitle: templateDoc.data().instructorTitle || '',
              organizationName: templateDoc.data().organizationName || '',
              logoUrl: templateDoc.data().logoUrl || '',
              completionDate: templateDoc.data().completionDate || new Date().toISOString(),
              primaryColor: templateDoc.data().primaryColor || '#6B21A8',
              secondaryColor: templateDoc.data().secondaryColor || '#FDF2F8',
            };
            console.log('Setting template state:', templateData);
            setTemplate(templateData);
          } else {
            console.log('❌ Template document does NOT exist!');
            console.log('Check if document ID is correct in Firestore');
          }
        } else {
          console.log('⚠️ No certificateTemplateId provided in params');
        }

        console.log('=== FETCH COMPLETE ===');
        
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        Alert.alert('Error', 'Failed to fetch certificate data');
      } finally {
        setIsLoading(false);
        console.log('Loading state set to false');
      }
    };
    fetchData();
  }, [courseId, certificateTemplateId]);

  // Log state changes
  useEffect(() => {
    console.log('=== STATE UPDATE ===');
    console.log('Course state:', course);
    console.log('Template state:', template);
    console.log('Is Loading:', isLoading);
  }, [course, template, isLoading]);

  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const loadLocalImage = async (): Promise<Uint8Array> => {
    const asset = Asset.fromModule(safecertLogo);
    await asset.downloadAsync();
    const response = await fetch(asset.localUri!);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  const fetchImageBytes = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  const getImageType = (url: string): 'png' | 'jpg' => url.toLowerCase().includes('.png') ? 'png' : 'jpg';
  
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { 
      r: parseInt(result[1], 16) / 255, 
      g: parseInt(result[2], 16) / 255, 
      b: parseInt(result[3], 16) / 255 
    } : { r: 0.42, g: 0.13, b: 0.66 };
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const wrapText = (text: string, maxWidth: number, font: any, fontSize: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  const handleBack = () => {
    console.log('Back button pressed');
    router.back();
  };

  const generateCertificate = async () => {
    console.log('=== GENERATE CERTIFICATE ===');
    console.log('Receiver Name:', receiverName);
    console.log('Template:', template);
    console.log('Course:', course);
    
    if (!receiverName.trim() || !template || !course) {
      console.log('❌ Missing required data');
      console.log('Has receiverName:', !!receiverName.trim());
      console.log('Has template:', !!template);
      console.log('Has course:', !!course);
      Alert.alert('Error', 'Missing required data to generate certificate');
      return;
    }

    setIsGenerating(true);
    console.log('Starting PDF generation...');
    
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage(PageSizes.A4);
      const { width, height } = page.getSize();

      console.log('PDF page created:', { width, height });

      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      const { r: pr, g: pg, b: pb } = hexToRgb(template.primaryColor);
      const primaryColor = rgb(pr, pg, pb);

      const { r: sr, g: sg, b: sb } = hexToRgb(template.secondaryColor);
      const secondaryColor = rgb(sr, sg, sb);

      console.log('Colors:', { primaryColor: template.primaryColor, secondaryColor: template.secondaryColor });

      // Background
      page.drawRectangle({ x: 0, y: 0, width, height, color: secondaryColor });

      // Left & right border
      page.drawRectangle({ x: 0, y: 0, width: 30, height, color: primaryColor });
      page.drawRectangle({ x: width - 30, y: 0, width: 30, height, color: primaryColor });

      // App logo
      try {
        console.log('Loading logo...');
        const logoBytes = await loadLocalImage();
        const logo = await pdfDoc.embedPng(logoBytes);
        const logoSize = 60;
        const logoDims = logo.scale(logoSize / logo.width);
        page.drawImage(logo, { 
          x: 60, 
          y: height - logoDims.height - 50, 
          width: logoDims.width, 
          height: logoDims.height 
        });
        console.log('Logo loaded successfully');
      } catch (error) {
        console.error('Error loading logo:', error);
      }

      let currentY = height - 150;

      // Certificate title
      const titleText = 'CERTIFICATE OF COMPLETION';
      const titleSize = 36;
      const titleWidth = boldFont.widthOfTextAtSize(titleText, titleSize);
      page.drawText(titleText, { 
        x: (width - titleWidth) / 2, 
        y: currentY, 
        size: titleSize, 
        font: boldFont, 
        color: rgb(0, 0, 0) 
      });

      currentY -= 80;

      // "This is to certify that"
      const certifyText = 'This is to certify that';
      const certifySize = 16;
      const certifyWidth = regularFont.widthOfTextAtSize(certifyText, certifySize);
      page.drawText(certifyText, { 
        x: (width - certifyWidth) / 2, 
        y: currentY, 
        size: certifySize, 
        font: regularFont, 
        color: rgb(0, 0, 0) 
      });

      currentY -= 50;

      // Recipient name
      const nameText = receiverName.toUpperCase();
      const nameSize = 32;
      const nameWidth = boldFont.widthOfTextAtSize(nameText, nameSize);
      const nameX = (width - nameWidth) / 2;
      page.drawText(nameText, { 
        x: nameX, 
        y: currentY, 
        size: nameSize, 
        font: boldFont, 
        color: primaryColor 
      });
      page.drawLine({ 
        start: { x: nameX - 20, y: currentY - 5 }, 
        end: { x: nameX + nameWidth + 20, y: currentY - 5 }, 
        thickness: 2, 
        color: primaryColor 
      });

      currentY -= 50;

      // "has successfully completed"
      const completedText = 'has successfully completed';
      const completedSize = 16;
      const completedWidth = regularFont.widthOfTextAtSize(completedText, completedSize);
      page.drawText(completedText, { 
        x: (width - completedWidth) / 2, 
        y: currentY, 
        size: completedSize, 
        font: regularFont, 
        color: rgb(0, 0, 0) 
      });

      currentY -= 40;

      // Course name
      const courseNameText = course.title || template.courseName;
      console.log('Course name on certificate:', courseNameText);
      const courseNameSize = 24;
      const courseNameWidth = boldFont.widthOfTextAtSize(courseNameText, courseNameSize);
      page.drawText(courseNameText, { 
        x: (width - courseNameWidth) / 2, 
        y: currentY, 
        size: courseNameSize, 
        font: boldFont, 
        color: rgb(0, 0, 0) 
      });

      currentY -= 40;

      // Course description (wrapped)
      const descriptionText = course.description || template.courseDescription;
      if (descriptionText) {
        console.log('Adding description:', descriptionText);
        const descriptionSize = 12;
        const maxDescWidth = width - 160;
        const descLines = wrapText(descriptionText, maxDescWidth, regularFont, descriptionSize);
        
        descLines.forEach(line => {
          const lineWidth = regularFont.widthOfTextAtSize(line, descriptionSize);
          page.drawText(line, { 
            x: (width - lineWidth) / 2, 
            y: currentY, 
            size: descriptionSize, 
            font: regularFont, 
            color: rgb(0.3, 0.3, 0.3) 
          });
          currentY -= 18;
        });
      }

      currentY -= 20;

      // Completion date
      const completionDateText = formatDate(course.completionDate || template.completionDate);
      const dateText = `Date of Completion: ${completionDateText}`;
      console.log('Completion date:', dateText);
      const dateSize = 14;
      const dateWidth = regularFont.widthOfTextAtSize(dateText, dateSize);
      page.drawText(dateText, { 
        x: (width - dateWidth) / 2, 
        y: currentY, 
        size: dateSize, 
        font: regularFont, 
        color: rgb(0, 0, 0) 
      });

      currentY -= 60;

      // Instructor signature section
      const instructorName = template.instructorName || course.instructor;
      const instructorTitle = template.instructorTitle || 'Instructor';
      
      console.log('Instructor:', instructorName, '|', instructorTitle);
      
      if (instructorName) {
        const signatureLineY = currentY;
        const signatureLineLength = 150;
        const signatureX = (width - signatureLineLength) / 2;
        
        // Signature line
        page.drawLine({ 
          start: { x: signatureX, y: signatureLineY }, 
          end: { x: signatureX + signatureLineLength, y: signatureLineY }, 
          thickness: 1, 
          color: rgb(0, 0, 0) 
        });

        // Instructor name
        const instNameSize = 14;
        const instNameWidth = boldFont.widthOfTextAtSize(instructorName, instNameSize);
        page.drawText(instructorName, { 
          x: (width - instNameWidth) / 2, 
          y: signatureLineY - 20, 
          size: instNameSize, 
          font: boldFont, 
          color: rgb(0, 0, 0) 
        });

        // Instructor title
        const instTitleSize = 12;
        const instTitleWidth = italicFont.widthOfTextAtSize(instructorTitle, instTitleSize);
        page.drawText(instructorTitle, { 
          x: (width - instTitleWidth) / 2, 
          y: signatureLineY - 35, 
          size: instTitleSize, 
          font: italicFont, 
          color: rgb(0.4, 0.4, 0.4) 
        });
      }

      // Footer - Organization & App info
      const footerY = 60;
      const orgName = template.organizationName || APP_NAME;
      const footerText = `${orgName} • ${APP_TAGLINE}`;
      const footerSize = 10;
      const footerWidth = regularFont.widthOfTextAtSize(footerText, footerSize);
      page.drawText(footerText, { 
        x: (width - footerWidth) / 2, 
        y: footerY, 
        size: footerSize, 
        font: regularFont, 
        color: rgb(0.5, 0.5, 0.5) 
      });

      console.log('Saving PDF...');
      // Save and share
      const pdfBytes = await pdfDoc.save();
      const filePath = `${FileSystem.documentDirectory}certificate_${receiverName.replace(/\s+/g, '_')}.pdf`;
      await FileSystem.writeAsStringAsync(filePath, uint8ArrayToBase64(pdfBytes), { 
        encoding: 'base64' 
      });

      console.log('✅ PDF saved to:', filePath);
      setGenerationComplete(true);

      if (await Sharing.isAvailableAsync()) {
        console.log('Sharing PDF...');
        await Sharing.shareAsync(filePath, { 
          mimeType: 'application/pdf', 
          dialogTitle: 'Share Certificate' 
        });
      } else {
        Alert.alert('Success', `Certificate saved: ${filePath}`);
      }
    } catch (err) {
      console.error('❌ Error generating certificate:', err);
      console.error('Error stack:', err);
      Alert.alert('Error', 'Failed to generate certificate. Please try again.');
    } finally {
      setIsGenerating(false);
      console.log('Generation complete, isGenerating set to false');
    }
  };

  if (isLoading) {
    console.log('Rendering: Loading screen');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B365D" />
          <Text style={styles.loadingText}>Loading certificate data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course || !template) {
    console.log('Rendering: Error screen - No course or template');
    console.log('Course:', course);
    console.log('Template:', template);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Certificate data not found</Text>
          <Text style={styles.errorSubtext}>
            {!course && 'Course data missing. '}
            {!template && 'Template data missing.'}
          </Text>
          <Text style={styles.errorDebug}>
            CourseId: {courseId || 'none'}{'\n'}
            TemplateId: {certificateTemplateId || 'none'}
          </Text>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log('Rendering: Main screen');
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#1B365D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Certificate</Text>
        </View>

        {generationComplete ? (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Check size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Certificate Generated!</Text>
            <Text style={styles.successText}>
              Your certificate has been generated successfully.
            </Text>
            <TouchableOpacity 
              style={styles.regenerateButton} 
              onPress={generateCertificate}
              disabled={isGenerating}
            >
              <Download size={20} color="#FFFFFF" />
              <Text style={styles.regenerateButtonText}>Generate Again</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={handleBack}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Ready to Generate</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Recipient:</Text>
              <Text style={styles.infoValue}>{receiverName}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Course:</Text>
              <Text style={styles.infoValue}>{course.title}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Instructor:</Text>
              <Text style={styles.infoValue}>{template.instructorName || course.instructor}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Completion Date:</Text>
              <Text style={styles.infoValue}>
                {formatDate(course.completionDate || template.completionDate)}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]} 
              onPress={generateCertificate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Download size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Generate Certificate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 12, color: '#111827', flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 18, color: '#DC2626', marginBottom: 8, textAlign: 'center', fontWeight: 'bold' },
  errorSubtext: { fontSize: 14, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  errorDebug: { fontSize: 12, color: '#9CA3AF', marginBottom: 20, textAlign: 'center', fontFamily: 'monospace' },
  backButton: { 
    backgroundColor: '#1B365D', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 8 
  },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  previewContainer: { marginTop: 20 },
  previewTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  infoCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  generateButton: { 
    backgroundColor: '#1B365D', 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  generateButtonDisabled: { opacity: 0.6 },
  generateButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold',
    marginLeft: 8,
  },
  successContainer: { 
    alignItems: 'center', 
    marginTop: 40,
    padding: 20,
  },
  successIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#111827',
    marginBottom: 8,
  },
  successText: { 
    fontSize: 16, 
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
  },
  regenerateButton: { 
    backgroundColor: '#1B365D', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  regenerateButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold',
    marginLeft: 8,
  },
  doneButton: { 
    backgroundColor: '#F3F4F6', 
    paddingHorizontal: 24, 
    paddingVertical: 14, 
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: { 
    color: '#1B365D', 
    fontSize: 16, 
    fontWeight: '600',
  },
});