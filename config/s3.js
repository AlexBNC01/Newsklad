const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Конфигурация S3 клиента для Timeweb Cloud
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'ru-central1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Важно для совместимости с S3
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Генерация подписанного URL для загрузки файла
const generateUploadUrl = async (fileName, fileType, expiresIn = 3600) => {
  try {
    const key = `uploads/${Date.now()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ACL: 'public-read', // Публичный доступ на чтение
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    return {
      uploadUrl,
      key,
      publicUrl: `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`,
    };
  } catch (error) {
    console.error('Ошибка генерации URL для загрузки:', error);
    throw new Error('Не удалось сгенерировать URL для загрузки');
  }
};

// Генерация подписанного URL для скачивания файла
const generateDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return downloadUrl;
  } catch (error) {
    console.error('Ошибка генерации URL для скачивания:', error);
    throw new Error('Не удалось сгенерировать URL для скачивания');
  }
};

// Удаление файла
const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    throw new Error('Не удалось удалить файл');
  }
};

// Прямая загрузка файла (для серверной обработки)
const uploadFile = async (fileBuffer, fileName, fileType, folder = 'uploads') => {
  try {
    const key = `${folder}/${Date.now()}-${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: fileType,
      ACL: 'public-read',
    });

    await s3Client.send(command);
    
    return {
      key,
      publicUrl: `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`,
    };
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    throw new Error('Не удалось загрузить файл');
  }
};

// Валидация и обработка изображений
const processImage = async (fileBuffer, options = {}) => {
  const sharp = require('sharp');
  
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'jpeg'
  } = options;

  try {
    const processedBuffer = await sharp(fileBuffer)
      .resize(width, height, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ quality })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error('Ошибка обработки изображения:', error);
    throw new Error('Не удалось обработать изображение');
  }
};

// Создание миниатюр изображений
const createThumbnail = async (fileBuffer, size = 150) => {
  const sharp = require('sharp');
  
  try {
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(size, size, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    return thumbnailBuffer;
  } catch (error) {
    console.error('Ошибка создания миниатюры:', error);
    throw new Error('Не удалось создать миниатюру');
  }
};

// Проверка типа файла
const isValidImageType = (mimeType) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return allowedTypes.includes(mimeType);
};

const isValidFileType = (mimeType) => {
  const allowedTypes = [
    // Изображения
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    // Документы
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Архивы
    'application/zip',
    'application/x-rar-compressed',
  ];
  return allowedTypes.includes(mimeType);
};

// Получение размера файла в человекочитаемом формате
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  s3Client,
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
  uploadFile,
  processImage,
  createThumbnail,
  isValidImageType,
  isValidFileType,
  formatFileSize,
};