import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI } from '../config/api';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Проверка первого запуска приложения
  const checkFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      if (!hasLaunched) {
        setIsFirstLaunch(true);
        await AsyncStorage.setItem('hasLaunched', 'true');
      }
    } catch (error) {
      console.error('Ошибка проверки первого запуска:', error);
    }
  };

  // Загрузка профиля пользователя
  const loadUserProfile = async () => {
    try {
      const result = await userAPI.getProfile();
      if (result.success && result.data) {
        setUser(result.data.user);
        setCompany(result.data.company);
        return true;
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      if (error.message === 'SESSION_EXPIRED') {
        await signOut();
      }
    }
    return false;
  };

  // Проверка авторизации при запуске
  const initializeAuth = async () => {
    try {
      // Проверяем гостевой режим
      const guestMode = await AsyncStorage.getItem('isGuestMode');
      if (guestMode === 'true') {
        setIsGuestMode(true);
        // Создаем временного пользователя для гостевого режима
        setUser({
          id: 'guest',
          email: 'guest@local',
          full_name: 'Гостевой пользователь',
          role: 'admin',
          permissions: {
            can_manage_users: true,
            can_manage_equipment: true,
            can_manage_inventory: true,
            can_view_reports: true,
            can_export_data: true,
          },
        });
        setCompany({
          id: 'guest-company',
          name: 'Гостевая компания',
          settings: {
            currency: 'RUB',
            timezone: 'Europe/Moscow',
          },
        });
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('access_token');
      
      if (token) {
        const profileLoaded = await loadUserProfile();
        if (!profileLoaded) {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        }
      }
    } catch (error) {
      console.error('Ошибка инициализации авторизации:', error);
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } finally {
      setLoading(false);
    }
  };

  // Вход в систему
  const signIn = async (credentials) => {
    try {
      const result = await authAPI.login(credentials);
      
      if (result.success) {
        // Сохраняем токены
        await AsyncStorage.multiSet([
          ['access_token', result.data.tokens.access_token],
          ['refresh_token', result.data.tokens.refresh_token],
        ]);

        // Устанавливаем данные пользователя
        setUser(result.data.user);
        setCompany({
          id: result.data.user.company_id,
          name: result.data.user.company_name,
          settings: result.data.user.company_settings,
        });

        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Регистрация
  const signUp = async (userData) => {
    try {
      const result = await authAPI.register(userData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Подтверждение email
  const verifyEmail = async (verificationData) => {
    try {
      const result = await authAPI.verifyEmail(verificationData);
      
      if (result.success) {
        // Сохраняем токены
        await AsyncStorage.multiSet([
          ['access_token', result.data.tokens.access_token],
          ['refresh_token', result.data.tokens.refresh_token],
        ]);

        // Устанавливаем данные пользователя
        setUser(result.data.user);
        setCompany(result.data.user.company);

        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Повторная отправка кода подтверждения
  const resendVerification = async (userId) => {
    try {
      const result = await authAPI.resendVerification(userId);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Вход в гостевой режим
  const signInAsGuest = async () => {
    try {
      await AsyncStorage.setItem('isGuestMode', 'true');
      setIsGuestMode(true);
      
      // Создаем временного пользователя для гостевого режима
      setUser({
        id: 'guest',
        email: 'guest@local',
        full_name: 'Гостевой пользователь',
        role: 'admin',
        permissions: {
          can_manage_users: true,
          can_manage_equipment: true,
          can_manage_inventory: true,
          can_view_reports: true,
          can_export_data: true,
        },
      });
      
      setCompany({
        id: 'guest-company',
        name: 'Гостевая компания',
        settings: {
          currency: 'RUB',
          timezone: 'Europe/Moscow',
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Ошибка входа в гостевой режим:', error);
      return { success: false, error: error.message };
    }
  };

  // Выход из системы
  const signOut = async () => {
    try {
      if (isGuestMode) {
        // Для гостевого режима просто очищаем данные
        await AsyncStorage.multiRemove(['isGuestMode']);
        setIsGuestMode(false);
        setUser(null);
        setCompany(null);
        return;
      }

      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          await authAPI.logout(refreshToken);
        } catch (error) {
          console.error('Ошибка выхода с сервера:', error);
        }
      }

      // Очищаем локальные данные
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      setUser(null);
      setCompany(null);
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  // Обновление профиля пользователя
  const updateProfile = async (profileData) => {
    try {
      const result = await userAPI.updateProfile(profileData);
      
      if (result.success) {
        setUser({ ...user, ...result.data });
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Сброс пароля
  const forgotPassword = async (email) => {
    try {
      const result = await authAPI.forgotPassword(email);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Проверка авторизации
  const isAuthenticated = () => {
    return !!(user && company);
  };

  // Проверка роли пользователя
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Проверка разрешений
  const hasPermission = (permission) => {
    return user?.permissions?.[permission] === true;
  };

  // Получение информации о компании
  const getCompanyInfo = () => {
    return company;
  };

  // Получение пользователей компании
  const getCompanyUsers = async () => {
    try {
      const result = await userAPI.getCompanyUsers();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Ошибка получения пользователей:', error);
      return [];
    }
  };

  // Приглашение пользователя
  const inviteUser = async (userData) => {
    try {
      const result = await userAPI.inviteUser(userData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Инициализация при монтировании
  useEffect(() => {
    const initialize = async () => {
      await checkFirstLaunch();
      await initializeAuth();
    };
    
    initialize();
  }, []);

  const value = {
    // Состояние
    user,
    company,
    loading,
    isFirstLaunch,
    isGuestMode,
    
    // Методы аутентификации
    signIn,
    signUp,
    signOut,
    signInAsGuest,
    verifyEmail,
    resendVerification,
    forgotPassword,
    
    // Методы профиля
    updateProfile,
    loadUserProfile,
    
    // Проверки
    isAuthenticated,
    hasRole,
    hasPermission,
    getCompanyInfo,
    
    // Пользователи компании
    getCompanyUsers,
    inviteUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};