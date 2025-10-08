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
        const formData = new FormData()

        formData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: `incident-${Date.now()}.jpg`,
        } as any)

        formData.append('upload_preset', cloudinaryConfig.uploadPreset)

        if (options?.quality) {
            formData.append('quality', options.quality)
        }

        if (options?.transformation) {
            formData.append('transformation', options.transformation)
        }

        const uploadUrl = `${cloudinaryConfig.apiUrl}/${cloudinaryConfig.cloudName}/image/upload`

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`)
        }
        const data: CloudinaryUploadResponse = await response.json()
    
        if ('error' in data) {
            throw new Error((data as any).error.message)
        }
        return data.secure_url

    } catch (error) {
        console.error('Error uploading to Cloudinary:', error)
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
    const uploadPromises = imageUris.map(async (uri, index) => {
        try {
            const url = await UploadImageToClooudinary(uri, options)

            if (options?.onProgress) {
                options.onProgress(index + 1, imageUris.length)
            }

            return url
        } catch (error) {
            console.error(`Failed to uoload image ${index + 1}:`, error)

            return null
        }
    })

    const results = await Promise.all(uploadPromises)

    return results.filter((url): url is string => url !== null)
}

export const validateCloudinaryConfig = (): boolean => {
    const { cloudName, uploadPreset } = cloudinaryConfig

    if (!cloudName) {
        console.error('Clooudinary cloud name not configured')
        return false
    }

    if (!uploadPreset) {
        console.error('Cloudinary upload preset not configured')
        return false
    }
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
        
        // Change from 'raw' to 'auto' - this allows better delivery options
        formData.append('resource_type', 'auto');

        if (options?.folder) {
            formData.append('folder', options.folder);
        }

        // IMPORTANT: Change the upload endpoint to 'auto' instead of 'raw'
        const uploadUrl = `${cloudinaryConfig.apiUrl}/${cloudinaryConfig.cloudName}/auto/upload`;

        console.log('Uploading PDF to Cloudinary:', fileName);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
        }

        const data: CloudinaryPDFUploadResponse = await response.json();

        if ('error' in data) {
            throw new Error((data as any).error.message);
        }

        // Convert to image delivery URL for better viewing (shows first page as preview)
        // Or use the secure_url directly if you've configured your upload preset correctly
        let viewableUrl = data.secure_url;
        
        console.log('PDF uploaded successfully:', viewableUrl);
        return viewableUrl;

    } catch (error) {
        console.error('Error uploading PDF to Cloudinary:', error);
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
            console.error(`Failed to upload PDF ${index + 1} (${file.name}):`, error);
            return null;
        }
    });

    const results = await Promise.all(uploadPromises);

    return results.filter((url): url is string => url !== null);
};

// Add this function to convert Cloudinary PDF URLs for viewing
export const getViewablePDFUrl = (cloudinaryUrl: string): string => {
  if (!cloudinaryUrl.includes('cloudinary.com')) {
    return cloudinaryUrl;
  }
  
  // Option 1: Use Google Docs Viewer (most reliable for mobile)
  return `https://docs.google.com/viewer?url=${encodeURIComponent(cloudinaryUrl)}&embedded=true`;
  
  // Option 2: If you want to try Cloudinary's image conversion (works for first page only)
  // return cloudinaryUrl.replace('/raw/', '/image/').replace('.pdf', '.jpg');
};