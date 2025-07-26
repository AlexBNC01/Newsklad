import AsyncStorage from '@react-native-async-storage/async-storage';

// Базовый URL API
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'  // Для разработки
  : 'https://alexbnc01-newsklad-7dd6.twc1.net/api'; // Для продакшена

// Timeout для запросов
const REQUEST_TIMEOUT = 30000; // 30 секунд

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = REQUEST_TIMEOUT;
  }

  // Получение токена из хранилища
  async getAuthToken() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return token;
    } catch (error) {
      console.error('Ошибка получения токена:', error);
      return null;
    }
  }

  // Сохранение токенов
  async saveTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        ['access_token', accessToken],
        ['refresh_token', refreshToken],
      ]);
    } catch (error) {
      console.error('Ошибка сохранения токенов:', error);
    }
  }

  // Очистка токенов
  async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } catch (error) {
      console.error('Ошибка очистки токенов:', error);
    }
  }

  // Обновление токена
  async refreshAccessToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('Refresh token не найден');
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
        timeout: this.timeout,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка обновления токена');
      }

      await this.saveTokens(
        data.data.tokens.access_token,
        data.data.tokens.refresh_token
      );

      return data.data.tokens.access_token;
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      await this.clearTokens();
      throw error;
    }
  }

  // Основной метод для запросов
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    const config = {
      method: 'GET',
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      timeout: this.timeout,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Если токен истек, пробуем обновить
      if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
        try {
          const newToken = await this.refreshAccessToken();
          
          // Повторяем запрос с новым токеном
          const retryConfig = {
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };

          const retryResponse = await fetch(url, retryConfig);
          const retryData = await retryResponse.json();

          if (!retryResponse.ok) {
            throw new Error(retryData.error || 'Ошибка запроса');
          }

          return retryData;
        } catch (refreshError) {
          // Если обновление токена не удалось, редиректим на логин
          throw new Error('SESSION_EXPIRED');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new Error('Превышено время ожидания запроса');
      }
      throw error;
    }
  }

  // Методы для разных HTTP методов
  async get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url);
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Загрузка файлов
  async uploadFile(endpoint, file, additionalData = {}) {
    const token = await this.getAuthToken();
    const formData = new FormData();

    // Добавляем файл
    formData.append('files', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.name || 'image.jpg',
    });

    // Добавляем дополнительные данные
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
      timeout: 60000, // 60 секунд для загрузки файлов
    };

    return this.request(endpoint, config);
  }

  // Загрузка нескольких файлов
  async uploadFiles(endpoint, files, additionalData = {}) {
    const token = await this.getAuthToken();
    const formData = new FormData();

    // Добавляем файлы
    files.forEach((file, index) => {
      formData.append('files', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || `image_${index}.jpg`,
      });
    });

    // Добавляем дополнительные данные
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    const config = {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
      timeout: 120000, // 2 минуты для множественной загрузки
    };

    return this.request(endpoint, config);
  }
}

// Создаем экземпляр клиента
const api = new ApiClient();

// Экспортируем методы
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendVerification: (userId) => api.post('/auth/resend-verification', { user_id: userId }),
  logout: (refreshToken) => api.post('/auth/logout', { refresh_token: refreshToken }),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  getProfile: () => api.get('/users/profile'),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  getCompanyUsers: () => api.get('/users/company'),
  inviteUser: (userData) => api.post('/users/invite', userData),
};

export const partsAPI = {
  getAll: (params) => api.get('/parts', params),
  getById: (id) => api.get(`/parts/${id}`),
  create: (data) => api.post('/parts', data),
  update: (id, data) => api.patch(`/parts/${id}`, data),
  delete: (id) => api.delete(`/parts/${id}`),
};

export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', params),
  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.patch(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
};

export const transactionAPI = {
  getAll: (params) => api.get('/transactions', params),
  create: (data) => api.post('/transactions', data),
  getById: (id) => api.get(`/transactions/${id}`),
};

export const repairAPI = {
  getAll: (params) => api.get('/repairs', params),
  getById: (id) => api.get(`/repairs/${id}`),
  create: (data) => api.post('/repairs', data),
  update: (id, data) => api.patch(`/repairs/${id}`, data),
  addPart: (repairId, data) => api.post(`/repairs/${repairId}/parts`, data),
  addStaff: (repairId, data) => api.post(`/repairs/${repairId}/staff`, data),
  complete: (repairId, data) => api.post(`/repairs/${repairId}/complete`, data),
};

export const containerAPI = {
  getAll: () => api.get('/containers'),
  create: (data) => api.post('/containers', data),
  update: (id, data) => api.patch(`/containers/${id}`, data),
  delete: (id) => api.delete(`/containers/${id}`),
};

export const staffAPI = {
  getAll: () => api.get('/staff'),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.patch(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

export const uploadAPI = {
  getSignedUrl: (fileData) => api.post('/upload/signed-url', fileData),
  uploadDirect: (files) => api.uploadFiles('/upload/direct', files),
  confirmUpload: (fileId) => api.post(`/upload/confirm/${fileId}`),
  getFiles: (params) => api.get('/upload', params),
  getFile: (fileId) => api.get(`/upload/${fileId}`),
  deleteFile: (fileId) => api.delete(`/upload/${fileId}`),
  updateFile: (fileId, data) => api.patch(`/upload/${fileId}`, data),
};

export const reportsAPI = {
  generate: (config) => api.post('/reports/generate', config),
  getHistory: (params) => api.get('/reports/history', params),
  download: (reportId) => api.get(`/reports/${reportId}/download`),
};

export default api;