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