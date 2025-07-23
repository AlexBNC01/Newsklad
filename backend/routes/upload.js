const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { 
  generateUploadUrl, 
  uploadFile, 
  processImage, 
  createThumbnail,
  isValidImageType,
  isValidFileType,
  deleteFile 
} = require('../config/s3');
const db = require('../config/database');
const router = express.Router();

// Настройка multer для обработки файлов в памяти
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB максимум
    files: 10, // максимум 10 файлов за раз
  },
  fileFilter: (req, file, cb) => {
    if (isValidFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Недопустимый тип файла'), false);
    }
  },
});

// Получение подписанного URL для прямой загрузки клиентом
router.post('/signed-url', [
  body('fileName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Имя файла обязательно'),
  body('fileType')
    .custom(value => {
      if (!isValidFileType(value)) {
        throw new Error('Недопустимый тип файла');
      }
      return true;
    }),
  body('fileSize')
    .isInt({ min: 1, max: 50 * 1024 * 1024 })
    .withMessage('Размер файла должен быть от 1 байта до 50MB'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { fileName, fileType, fileSize } = req.body;

    // Генерируем подписанный URL
    const result = await generateUploadUrl(fileName, fileType);

    // Сохраняем информацию о файле в БД
    const [fileRecord] = await db('files').insert({
      company_id: req.user.company_id,
      user_id: req.user.id,
      original_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      s3_key: result.key,
      public_url: result.publicUrl,
      status: 'pending', // Файл еще не загружен
    }).returning('*');

    res.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        fileId: fileRecord.id,
        publicUrl: result.publicUrl,
        expiresIn: 3600, // 1 час
      }
    });

  } catch (error) {
    next(error);
  }
});

// Прямая загрузка через сервер (для обработки изображений)
router.post('/direct', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Файлы не выбраны'
      });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        let fileBuffer = file.buffer;
        let processedFile = null;
        let thumbnail = null;

        // Обработка изображений
        if (isValidImageType(file.mimetype)) {
          // Обрабатываем основное изображение
          processedFile = await processImage(fileBuffer, {
            width: 1920,
            height: 1080,
            quality: 85
          });

          // Создаем миниатюру
          thumbnail = await createThumbnail(fileBuffer, 300);
        }

        // Загружаем основной файл
        const mainFile = await uploadFile(
          processedFile || fileBuffer,
          file.originalname,
          file.mimetype,
          `${req.user.company_id}/files`
        );

        // Загружаем миниатюру (если есть)
        let thumbnailFile = null;
        if (thumbnail) {
          thumbnailFile = await uploadFile(
            thumbnail,
            `thumb_${file.originalname}`,
            'image/jpeg',
            `${req.user.company_id}/thumbnails`
          );
        }

        // Сохраняем в БД
        const [fileRecord] = await db('files').insert({
          company_id: req.user.company_id,
          user_id: req.user.id,
          original_name: file.originalname,
          file_type: file.mimetype,
          file_size: (processedFile || fileBuffer).length,
          s3_key: mainFile.key,
          public_url: mainFile.publicUrl,
          thumbnail_key: thumbnailFile?.key,
          thumbnail_url: thumbnailFile?.publicUrl,
          status: 'completed',
        }).returning('*');

        uploadedFiles.push({
          id: fileRecord.id,
          originalName: fileRecord.original_name,
          publicUrl: fileRecord.public_url,
          thumbnailUrl: fileRecord.thumbnail_url,
          fileType: fileRecord.file_type,
          fileSize: fileRecord.file_size,
        });

      } catch (fileError) {
        console.error(`Ошибка обработки файла ${file.originalname}:`, fileError);
        // Продолжаем обработку других файлов
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Не удалось загрузить ни одного файла'
      });
    }

    res.json({
      success: true,
      message: `Успешно загружено ${uploadedFiles.length} из ${req.files.length} файлов`,
      data: uploadedFiles
    });

  } catch (error) {
    next(error);
  }
});

// Подтверждение успешной загрузки файла через подписанный URL
router.post('/confirm/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const file = await db('files')
      .where('id', fileId)
      .where('company_id', req.user.company_id)
      .first();

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Файл не найден'
      });
    }

    // Обновляем статус файла
    await db('files')
      .where('id', fileId)
      .update({
        status: 'completed',
        uploaded_at: db.fn.now(),
      });

    res.json({
      success: true,
      message: 'Загрузка файла подтверждена'
    });

  } catch (error) {
    next(error);
  }
});

// Получение списка файлов компании
router.get('/', async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type = 'all',
      search = '',
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('files')
      .select(
        'files.*',
        'users.full_name as uploaded_by_name'
      )
      .leftJoin('users', 'files.user_id', 'users.id')
      .where('files.company_id', req.user.company_id)
      .where('files.status', 'completed');

    // Фильтр по типу файла
    if (type !== 'all') {
      if (type === 'images') {
        query = query.whereRaw("file_type LIKE 'image/%'");
      } else if (type === 'documents') {
        query = query.whereRaw("file_type LIKE 'application/%'");
      }
    }

    // Поиск по имени файла
    if (search) {
      query = query.whereRaw("original_name ILIKE ?", [`%${search}%`]);
    }

    // Получаем общее количество
    const totalQuery = query.clone();
    const [{ count }] = await totalQuery.count('files.id as count');
    const total = parseInt(count);

    // Получаем файлы с пагинацией
    const files = await query
      .orderBy('files.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Получение конкретного файла
router.get('/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const file = await db('files')
      .select(
        'files.*',
        'users.full_name as uploaded_by_name'
      )
      .leftJoin('users', 'files.user_id', 'users.id')
      .where('files.id', fileId)
      .where('files.company_id', req.user.company_id)
      .first();

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Файл не найден'
      });
    }

    res.json({
      success: true,
      data: file
    });

  } catch (error) {
    next(error);
  }
});

// Удаление файла
router.delete('/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;

    const file = await db('files')
      .where('id', fileId)
      .where('company_id', req.user.company_id)
      .first();

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Файл не найден'
      });
    }

    // Удаляем файлы из S3
    try {
      await deleteFile(file.s3_key);
      if (file.thumbnail_key) {
        await deleteFile(file.thumbnail_key);
      }
    } catch (s3Error) {
      console.error('Ошибка удаления файла из S3:', s3Error);
      // Продолжаем удаление записи из БД даже если файл не удалился из S3
    }

    // Удаляем запись из БД
    await db('files').where('id', fileId).del();

    res.json({
      success: true,
      message: 'Файл успешно удален'
    });

  } catch (error) {
    next(error);
  }
});

// Обновление метаданных файла
router.patch('/:fileId', [
  body('description').optional().trim(),
  body('tags').optional().isArray(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Ошибка валидации данных',
        details: errors.array()
      });
    }

    const { fileId } = req.params;
    const { description, tags } = req.body;

    const file = await db('files')
      .where('id', fileId)
      .where('company_id', req.user.company_id)
      .first();

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'Файл не найден'
      });
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);

    if (Object.keys(updateData).length > 0) {
      await db('files')
        .where('id', fileId)
        .update({
          ...updateData,
          updated_at: db.fn.now(),
        });
    }

    res.json({
      success: true,
      message: 'Метаданные файла обновлены'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;