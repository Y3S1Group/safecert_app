export const cloudinaryConfig = {
    cloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
    uploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '',
    apiUrl: 'https://api.cloudinary.com/v1_1',
}

export interface CloudinaryUploadResponse {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
}

export interface CloudinaryPDFUploadResponse {
    secure_url: string;
    public_id: string;
    format: string;
    resource_type: string;
    bytes: number;
    created_at: string;
}

export const UploadImageToClooudinary = async (
    imageUri: string,
    options?: {
        folder?: string;
        quality?: string;
        transformation?: string;
    }
): Promise<string> => {
    try {
        console.log('📸 Uploading image to Cloudinary:', imageUri) // Debug log

        const formData = new FormData()

        // Handle different URI formats (camera vs gallery)
        const imageFile: any = {
            uri: imageUri,
            type: 'image/jpeg',
            name: `incident-${Date.now()}.jpg`,
        }

        formData.append('file', imageFile)
        formData.append('upload_preset', cloudinaryConfig.uploadPreset)

        if (options?.folder) {
            formData.append('folder', options.folder)
        }

        if (options?.quality) {
            formData.append('quality', options.quality)
        }

        if (options?.transformation) {
            formData.append('transformation', options.transformation)
        }

        const uploadUrl = `${cloudinaryConfig.apiUrl}/${cloudinaryConfig.cloudName}/image/upload`

        console.log('📤 Uploading to:', uploadUrl) // Debug log

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            // ✅ REMOVE Content-Type header - let browser set it automatically with boundary
            // headers: {
            //     'Content-Type': 'multipart/form-data', // ❌ This causes issues!
            // },
        })

        console.log('📥 Response status:', response.status) // Debug log

        if (!response.ok) {
            const errorText = await response.text()
            console.error('❌ Upload failed:', errorText)
            throw new Error(`Upload failed: ${response.statusText}`)
        }

        const data: CloudinaryUploadResponse = await response.json()
        console.log('✅ Upload successful:', data.secure_url) // Debug log
    
        if ('error' in data) {
            throw new Error((data as any).error.message)
        }

        return data.secure_url

    } catch (error) {
        console.error('❌ Error uploading to Cloudinary:', error)
        throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

export const uploadMultipleImages = async (
    imageUris: string[],
    options?: {
        folder?: string;
        quality?: string;
        onProgress?: (completed: number, total: number) => void;
    }
): Promise<string[]> => {
    console.log(`📸 Starting upload of ${imageUris.length} images`) // Debug log

    const uploadPromises = imageUris.map(async (uri, index) => {
        try {
            console.log(`📤 Uploading image ${index + 1}/${imageUris.length}:`, uri) // Debug log
            
            const url = await UploadImageToClooudinary(uri, options)

            if (options?.onProgress) {
                options.onProgress(index + 1, imageUris.length)
            }

            console.log(`✅ Image ${index + 1} uploaded successfully`) // Debug log
            return url
        } catch (error) {
            console.error(`❌ Failed to upload image ${index + 1}:`, error)
            return null
        }
    })

    const results = await Promise.all(uploadPromises)
    const successfulUploads = results.filter((url): url is string => url !== null)
    
    console.log(`✅ Successfully uploaded ${successfulUploads.length}/${imageUris.length} images`) // Debug log

    return successfulUploads
}

export const validateCloudinaryConfig = (): boolean => {
    const { cloudName, uploadPreset } = cloudinaryConfig

    if (!cloudName) {
        console.error('❌ Cloudinary cloud name not configured')
        return false
    }

    if (!uploadPreset) {
        console.error('❌ Cloudinary upload preset not configured')
        return false
    }

    console.log('✅ Cloudinary config valid')
    return true
}

export const getOptimizedImageUrl = (
  cloudinaryUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
  } = {}
): string => {
  if (!cloudinaryUrl.includes('cloudinary.com')) {
    return cloudinaryUrl
  }
  const { width, height, quality = 'auto', format = 'auto' } = options

  const transformations: string[] = []
  
  if (width) transformations.push(`w_${width}`)
  if (height) transformations.push(`h_${height}`)
  if (quality) transformations.push(`q_${quality}`)
  if (format) transformations.push(`f_${format}`)
  
  if (transformations.length === 0) {
    return cloudinaryUrl
  }
  
  const transformationString = transformations.join(',')
  return cloudinaryUrl.replace('/upload/', `/upload/${transformationString}/`)
}

export const uploadPDFToCloudinary = async (
    fileUri: string,
    fileName: string,
    options?: {
        folder?: string;
    }
): Promise<string> => {
    try {
        if (!validateCloudinaryConfig()) {
            throw new Error('Cloudinary configuration is missing');
        }

        const formData = new FormData();

        formData.append('file', {
            uri: fileUri,
            type: 'application/pdf',
            name: fileName,
        } as any);

        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('resource_type', 'auto');

        if (options?.folder) {
            formData.append('folder', options.folder);
        }

        const uploadUrl = `${cloudinaryConfig.apiUrl}/${cloudinaryConfig.cloudName}/auto/upload`;

        console.log('📄 Uploading PDF to Cloudinary:', fileName);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            // ✅ No Content-Type header for PDF upload either
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
        }

        const data: CloudinaryPDFUploadResponse = await response.json();

        if ('error' in data) {
            throw new Error((data as any).error.message);
        }

        let viewableUrl = data.secure_url;
        
        console.log('✅ PDF uploaded successfully:', viewableUrl);
        return viewableUrl;

    } catch (error) {
        console.error('❌ Error uploading PDF to Cloudinary:', error);
        throw new Error(`Failed to upload PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

export const uploadMultiplePDFs = async (
    files: Array<{ uri: string; name: string }>,
    options?: {
        folder?: string;
        onProgress?: (completed: number, total: number) => void;
    }
): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
        try {
            const url = await uploadPDFToCloudinary(file.uri, file.name, options);

            if (options?.onProgress) {
                options.onProgress(index + 1, files.length);
            }

            return url;
        } catch (error) {
            console.error(`❌ Failed to upload PDF ${index + 1} (${file.name}):`, error);
            return null;
        }
    });

    const results = await Promise.all(uploadPromises);

    return results.filter((url): url is string => url !== null);
};

export const getViewablePDFUrl = (cloudinaryUrl: string): string => {
  if (!cloudinaryUrl.includes('cloudinary.com')) {
    return cloudinaryUrl;
  }
  
  return `https://docs.google.com/viewer?url=${encodeURIComponent(cloudinaryUrl)}&embedded=true`;
};