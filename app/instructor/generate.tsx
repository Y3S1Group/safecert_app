import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
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

export default function GenerateCertificate() {
  const APP_NAME = 'SafeCert';
  const APP_TAGLINE = 'Digital Safety Certification';
  const router = useRouter();

  const [receiverName, setReceiverName] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch certificate templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'certificateTemplates'));
        const tempList: Template[] = snapshot.docs.map(doc => ({
          id: doc.id,
          courseName: doc.data().courseName || '',
          courseDescription: doc.data().courseDescription || '',
          instructorName: doc.data().instructorName || '',
          instructorTitle: doc.data().instructorTitle || '',
          organizationName: doc.data().organizationName || '',
          logoUrl: doc.data().logoUrl || '',
          completionDate: doc.data().completionDate || new Date().toISOString(),
          primaryColor: doc.data().primaryColor || '#6B21A8',
          secondaryColor: doc.data().secondaryColor || '#FDF2F8',
        }));
        setTemplates(tempList);
      } catch (error) {
        console.error('Error fetching templates:', error);
        Alert.alert('Error', 'Failed to fetch templates');
      }
    };
    fetchTemplates();
  }, []);

  // Convert Uint8Array to base64
  const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Load local asset image
  const loadLocalImage = async (): Promise<Uint8Array> => {
    try {
      const asset = Asset.fromModule(safecertLogo);
      await asset.downloadAsync();
      
      if (!asset.localUri) {
        throw new Error('Failed to load local asset');
      }

      const response = await fetch(asset.localUri);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('Error loading local image:', error);
      throw error;
    }
  };

  // Fetch image bytes from URL
  const fetchImageBytes = async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  // Detect image type from URL or content
  const getImageType = (url: string): 'png' | 'jpg' => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.png') || lowerUrl.includes('image/png')) {
      return 'png';
    }
    return 'jpg';
  };

  // Convert hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    } : { r: 0.42, g: 0.13, b: 0.66 };
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleBack = () => {
    router.replace('/instructor/instructorDash');
  };

  // Generate PDF certificate
  const generateCertificate = async () => {
    if (!receiverName.trim()) {
      Alert.alert('Error', 'Please enter receiver name');
      return;
    }
    if (!selectedTemplateId) {
      Alert.alert('Error', 'Please select a template');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) {
      Alert.alert('Error', 'Template not found');
      return;
    }

    setIsGenerating(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage(PageSizes.A4);
      const { width, height } = page.getSize();

      // Embed fonts
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      // Get colors
      const primaryRgb = hexToRgb(template.primaryColor);
      const primaryColor = rgb(primaryRgb.r, primaryRgb.g, primaryRgb.b);
      const secondaryRgb = hexToRgb(template.secondaryColor);
      const secondaryColor = rgb(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);

      // Draw background with secondary color
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: height,
        color: secondaryColor,
      });

      // Draw decorative border with primary color
      const borderWidth = 30;
      // Left border
      page.drawRectangle({
        x: 0,
        y: 0,
        width: borderWidth,
        height: height,
        color: primaryColor,
      });
      // Right border
      page.drawRectangle({
        x: width - borderWidth,
        y: 0,
        width: borderWidth,
        height: height,
        color: primaryColor,
      });

      // Draw decorative pattern on borders
      for (let i = 0; i < height; i += 40) {
        page.drawCircle({
          x: borderWidth / 2,
          y: i,
          size: 8,
          color: rgb(primaryRgb.r * 0.8, primaryRgb.g * 0.8, primaryRgb.b * 0.8),
          opacity: 0.6,
        });
        page.drawCircle({
          x: width - borderWidth / 2,
          y: i,
          size: 8,
          color: rgb(primaryRgb.r * 0.8, primaryRgb.g * 0.8, primaryRgb.b * 0.8),
          opacity: 0.6,
        });
      }

      // Draw SafeCert App Logo (Top Left)
      try {
        const safecertLogoBytes = await loadLocalImage();
        const safecertLogoImage = await pdfDoc.embedPng(safecertLogoBytes);
        
        const safecertLogoSize = 60;
        const safecertLogoDims = safecertLogoImage.scale(safecertLogoSize / safecertLogoImage.width);
        
        page.drawImage(safecertLogoImage, {
          x: 60,
          y: height - safecertLogoDims.height - 50,
          width: safecertLogoDims.width,
          height: safecertLogoDims.height,
        });

        // Draw app name below logo
        page.drawText(APP_NAME, {
          x: 60,
          y: height - safecertLogoDims.height - 70,
          size: 12,
          font: boldFont,
          color: primaryColor,
        });

        // Draw app tagline
        page.drawText(APP_TAGLINE, {
          x: 60,
          y: height - safecertLogoDims.height - 85,
          size: 8,
          font: regularFont,
          color: rgb(0.4, 0.4, 0.4),
        });
      } catch (err) {
        console.warn('Failed to load SafeCert logo:', err);
      }

      // Draw Organization Logo (Top Right) if exists
      if (template.logoUrl) {
        try {
          const orgLogoBytes = await fetchImageBytes(template.logoUrl);
          const imageType = getImageType(template.logoUrl);
          
          let orgLogoImage;
          if (imageType === 'png') {
            orgLogoImage = await pdfDoc.embedPng(orgLogoBytes);
          } else {
            orgLogoImage = await pdfDoc.embedJpg(orgLogoBytes);
          }
          
          const orgLogoSize = 70;
          const orgLogoDims = orgLogoImage.scale(orgLogoSize / orgLogoImage.width);
          
          page.drawImage(orgLogoImage, {
            x: width - orgLogoDims.width - 60,
            y: height - orgLogoDims.height - 50,
            width: orgLogoDims.width,
            height: orgLogoDims.height,
          });

          // Draw organization name below logo
          if (template.organizationName) {
            const orgNameSize = 10;
            const orgNameWidth = boldFont.widthOfTextAtSize(template.organizationName, orgNameSize);
            const orgLogoCenter = width - orgLogoDims.width - 60 + (orgLogoDims.width / 2);
            
            page.drawText(template.organizationName, {
              x: orgLogoCenter - (orgNameWidth / 2),
              y: height - orgLogoDims.height - 70,
              size: orgNameSize,
              font: boldFont,
              color: primaryColor,
            });
          }
        } catch (err) {
          console.warn('Failed to load organization logo:', err);
        }
      }

      // Certificate title
      const titleText = 'CERTIFICATE';
      const titleFontSize = 42;
      const titleWidth = boldFont.widthOfTextAtSize(titleText, titleFontSize);
      page.drawText(titleText, {
        x: (width - titleWidth) / 2,
        y: height - 150,
        size: titleFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      const subtitleText = 'OF COMPLETION';
      const subtitleFontSize = 36;
      const subtitleWidth = boldFont.widthOfTextAtSize(subtitleText, subtitleFontSize);
      page.drawText(subtitleText, {
        x: (width - subtitleWidth) / 2,
        y: height - 190,
        size: subtitleFontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Course name
      const courseNameY = height - 250;
      const courseNameWidth = boldFont.widthOfTextAtSize(template.courseName, 18);
      page.drawText(template.courseName, {
        x: (width - courseNameWidth) / 2,
        y: courseNameY,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Course description (wrap text if needed)
      if (template.courseDescription) {
        const maxWidth = width - 160;
        const words = template.courseDescription.split(' ');
        let line = '';
        let yOffset = courseNameY - 25;
        const lines: string[] = [];
        
        words.forEach((word, index) => {
          const testLine = line + word + ' ';
          const testWidth = regularFont.widthOfTextAtSize(testLine, 11);
          
          if (testWidth > maxWidth && line !== '') {
            lines.push(line.trim());
            line = word + ' ';
          } else {
            line = testLine;
          }
          
          if (index === words.length - 1) {
            lines.push(line.trim());
          }
        });

        // Center align description lines
        lines.forEach(descLine => {
          const lineWidth = italicFont.widthOfTextAtSize(descLine, 11);
          page.drawText(descLine, {
            x: (width - lineWidth) / 2,
            y: yOffset,
            size: 11,
            font: italicFont,
            color: rgb(0.2, 0.2, 0.2),
          });
          yOffset -= 15;
        });
      }

      // "Presented to" text
      const presentedToWidth = italicFont.widthOfTextAtSize('Presented to', 14);
      page.drawText('Presented to', {
        x: (width - presentedToWidth) / 2,
        y: height - 350,
        size: 14,
        font: italicFont,
        color: rgb(0, 0, 0),
      });

      // Recipient name (large and prominent with primary color)
      const recipientNameSize = 32;
      const recipientNameText = receiverName.trim().toUpperCase();
      const recipientNameWidth = boldFont.widthOfTextAtSize(recipientNameText, recipientNameSize);
      const recipientNameX = (width - recipientNameWidth) / 2;
      
      page.drawText(recipientNameText, {
        x: recipientNameX,
        y: height - 390,
        size: recipientNameSize,
        font: boldFont,
        color: primaryColor,
      });

      // Draw underline for name
      page.drawLine({
        start: { x: recipientNameX - 20, y: height - 395 },
        end: { x: recipientNameX + recipientNameWidth + 20, y: height - 395 },
        thickness: 2,
        color: primaryColor,
      });

      // Completion text
      const completionText = `for successfully completing the ${template.courseName} Workshop on ${formatDate(template.completionDate)}.`;
      const completionWords = completionText.split(' ');
      let completionLine = '';
      let completionY = height - 440;
      const completionMaxWidth = width - 160;
      const completionLines: string[] = [];
      
      completionWords.forEach((word, index) => {
        const testLine = completionLine + word + ' ';
        const testWidth = regularFont.widthOfTextAtSize(testLine, 12);
        
        if (testWidth > completionMaxWidth && completionLine !== '') {
          completionLines.push(completionLine.trim());
          completionLine = word + ' ';
        } else {
          completionLine = testLine;
        }
        
        if (index === completionWords.length - 1) {
          completionLines.push(completionLine.trim());
        }
      });

      // Center align completion text
      completionLines.forEach(compLine => {
        const lineWidth = regularFont.widthOfTextAtSize(compLine, 12);
        page.drawText(compLine, {
          x: (width - lineWidth) / 2,
          y: completionY,
          size: 12,
          font: regularFont,
          color: rgb(0, 0, 0),
        });
        completionY -= 18;
      });

      // Draw decorative seal/badge
      const sealCenterX = width / 2;
      const sealCenterY = 180;
      const sealRadius = 50;

      // Outer circle (primary color)
      page.drawCircle({
        x: sealCenterX,
        y: sealCenterY,
        size: sealRadius,
        color: primaryColor,
      });

      // Inner circle (gold/yellow)
      page.drawCircle({
        x: sealCenterX,
        y: sealCenterY,
        size: sealRadius - 10,
        color: rgb(1, 0.84, 0.0),
      });

      // Center white circle
      page.drawCircle({
        x: sealCenterX,
        y: sealCenterY,
        size: sealRadius - 20,
        color: rgb(1, 1, 1),
      });

      // Draw checkmark using simple shapes
      page.drawLine({
        start: { x: sealCenterX - 15, y: sealCenterY },
        end: { x: sealCenterX - 5, y: sealCenterY - 12 },
        thickness: 5,
        color: rgb(1, 0.84, 0.0),
      });
      page.drawLine({
        start: { x: sealCenterX - 5, y: sealCenterY - 12 },
        end: { x: sealCenterX + 15, y: sealCenterY + 8 },
        thickness: 5,
        color: rgb(1, 0.84, 0.0),
      });

      // Draw ribbons below seal
      page.drawRectangle({
        x: sealCenterX - 35,
        y: sealCenterY - sealRadius - 30,
        width: 20,
        height: 40,
        color: primaryColor,
      });
      page.drawRectangle({
        x: sealCenterX + 15,
        y: sealCenterY - sealRadius - 30,
        width: 20,
        height: 40,
        color: primaryColor,
      });

      // Instructor signature section
      const signatureY = 140;
      const signatureX = width - 250;

      // Signature line
      page.drawLine({
        start: { x: signatureX, y: signatureY },
        end: { x: signatureX + 150, y: signatureY },
        thickness: 1.5,
        color: rgb(0, 0, 0),
      });

      // Instructor name
      const instructorNameWidth = regularFont.widthOfTextAtSize(template.instructorName, 12);
      page.drawText(template.instructorName, {
        x: signatureX + (150 - instructorNameWidth) / 2,
        y: signatureY - 20,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Instructor title
      if (template.instructorTitle) {
        const instructorTitleWidth = regularFont.widthOfTextAtSize(template.instructorTitle, 10);
        page.drawText(template.instructorTitle, {
          x: signatureX + (150 - instructorTitleWidth) / 2,
          y: signatureY - 35,
          size: 10,
          font: regularFont,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      // Footer with app info
      const footerText = `Certified via ${APP_NAME} - ${APP_TAGLINE}`;
      const footerWidth = regularFont.widthOfTextAtSize(footerText, 8);
      page.drawText(footerText, {
        x: (width - footerWidth) / 2,
        y: 40,
        size: 8,
        font: italicFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Save PDF
      const pdfBytes = await pdfDoc.save();

      if (!FileSystem.documentDirectory) {
        throw new Error('File system not available');
      }
      
      const fileName = `certificate_${receiverName.trim().replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      const base64 = uint8ArrayToBase64(pdfBytes);

      await FileSystem.writeAsStringAsync(filePath, base64, {
        encoding: 'base64',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Certificate',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `Certificate saved to: ${filePath}`);
      }
      
      Alert.alert('Success', 'Certificate generated successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      Alert.alert('Error', `Failed to generate certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <ArrowLeft size={24} color="#1B365D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate Certificate</Text>
        </View>

        {/* Receiver Name */}
        <Text style={styles.label}>Student Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter student's full name"
          placeholderTextColor="#9CA3AF"
          value={receiverName}
          onChangeText={setReceiverName}
          editable={!isGenerating}
        />

        {/* Templates List */}
        <Text style={styles.sectionTitle}>Select Certificate Template</Text>
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.noTemplates}>No templates available</Text>
            <Text style={styles.emptySubtext}>Create a template first to generate certificates</Text>
          </View>
        ) : (
          templates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateItem,
                selectedTemplateId === template.id && styles.templateSelected,
              ]}
              onPress={() => setSelectedTemplateId(template.id)}
              disabled={isGenerating}
            >
              <View style={styles.templateContent}>
                {template.logoUrl ? (
                  <Image 
                    source={{ uri: template.logoUrl }} 
                    style={styles.logoPreview}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.logoPlaceholder} />
                )}
                <View style={styles.templateInfo}>
                  <Text style={styles.templateText}>{template.courseName}</Text>
                  <Text style={styles.templateSubText}>
                    {template.instructorName} • {template.organizationName}
                  </Text>
                  <View style={styles.colorIndicator}>
                    <View 
                      style={[
                        styles.colorDot, 
                        { backgroundColor: template.primaryColor }
                      ]} 
                    />
                    <View 
                      style={[
                        styles.colorDot, 
                        { backgroundColor: template.secondaryColor }
                      ]} 
                    />
                  </View>
                </View>
                {selectedTemplateId === template.id && (
                  <Check size={24} color="#1B365D" style={styles.checkIcon} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Generate Button */}
        <TouchableOpacity 
          style={[
            styles.generateButton, 
            (isGenerating || !selectedTemplateId || !receiverName.trim()) && styles.generateButtonDisabled
          ]} 
          onPress={generateCertificate}
          disabled={isGenerating || !selectedTemplateId || !receiverName.trim()}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating Certificate...' : 'Generate Certificate'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  content: { 
    padding: 16,
    paddingBottom: 32,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginLeft: 12, 
    color: '#111827',
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#111827',
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 16, 
    color: '#1B365D' 
  },
  templateItem: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  templateSelected: { 
    borderColor: '#1B365D', 
    borderWidth: 3,
    backgroundColor: '#EEF2FF',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  templateContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templateText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#111827',
    marginBottom: 4,
  },
  templateSubText: { 
    fontSize: 13, 
    color: '#6B7280',
    marginBottom: 6,
  },
  colorIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B365D',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '700', 
    fontSize: 16, 
    marginLeft: 8 
  },
  logoPreview: { 
    width: 60, 
    height: 60, 
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  checkIcon: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
  },
  noTemplates: {
    textAlign: 'center',
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
});