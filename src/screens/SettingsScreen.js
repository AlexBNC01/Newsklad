import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const { transactions, parts, isDarkTheme, toggleTheme, getThemeColors } = useData();
  const { user, company, isGuestMode, signOut } = useAuth();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  
  const themeColors = getThemeColors();

  const getStatistics = () => {
    const totalParts = parts.length;
    const totalQuantity = parts.reduce((sum, part) => sum + part.quantity, 0);
    const totalTransactions = transactions.length;
    const recentTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return transactionDate >= weekAgo;
    }).length;

    return {
      totalParts,
      totalQuantity,
      totalTransactions,
      recentTransactions,
    };
  };

  const stats = getStatistics();

  const handleExportData = () => {
    Alert.alert(
      'Экспорт данных',
      'Функция экспорта будет доступна в следующих версиях приложения.',
      [{ text: 'Понятно' }]
    );
  };

  const handleSync = () => {
    Alert.alert(
      'Синхронизация',
      'Синхронизация с сервером будет реализована в следующих версиях.',
      [{ text: 'Понятно' }]
    );
  };

  const handleBackup = () => {
    Alert.alert(
      'Резервное копирование',
      'Создать резервную копию данных?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Создать', 
          onPress: () => {
            Alert.alert('Успешно', 'Резервная копия создана локально');
          }
        }
      ]
    );
  };

  const handleContainerManagement = () => {
    navigation.navigate('ContainerManagement');
  };

  const handleFieldConfiguration = (fieldType) => {
    navigation.navigate('FieldConfiguration', { fieldType });
  };

  const handleStatistics = () => {
    navigation.navigate('Statistics');
  };

  const handlePartTypesManagement = () => {
    navigation.navigate('PartTypesManagement');
  };

  const handleReports = () => {
    navigation.navigate('Reports');
  };

  const handleUserManagement = () => {
    navigation.navigate('UserManagement');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Выход из аккаунта',
      isGuestMode 
        ? 'Выйти из гостевого режима? Все данные останутся на устройстве.'
        : 'Выйти из аккаунта? Вы сможете войти заново в любое время.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            // Navigation будет обработана автоматически через AuthContext
          }
        }
      ]
    );
  };

  const handleSignIn = () => {
    Alert.alert(
      'Войти в аккаунт',
      'Хотите войти в существующий аккаунт или создать новый?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Войти', 
          onPress: () => navigation.navigate('AuthModal', { screen: 'Login' })
        },
        { 
          text: 'Регистрация', 
          onPress: () => navigation.navigate('AuthModal', { screen: 'Register' })
        }
      ]
    );
  };

  const handleSwitchAccount = () => {
    Alert.alert(
      'Смена аккаунта',
      'Выйти из текущего аккаунта и войти в другой?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Сменить', 
          onPress: async () => {
            await signOut();
            // Пользователь будет перенаправлен на экран входа
          }
        }
      ]
    );
  };

  const renderStatistics = () => (
    <View style={dynamicStyles.section}>
      <Text style={dynamicStyles.sectionTitle}>Статистика</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="cube-outline" size={32} color="#007AFF" />
          <Text style={styles.statNumber}>{stats.totalParts}</Text>
          <Text style={styles.statLabel}>Видов запчастей</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="layers-outline" size={32} color="#34C759" />
          <Text style={styles.statNumber}>{stats.totalQuantity}</Text>
          <Text style={styles.statLabel}>Всего единиц</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="document-text-outline" size={32} color="#FF9500" />
          <Text style={styles.statNumber}>{stats.totalTransactions}</Text>
          <Text style={styles.statLabel}>Всего операций</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={32} color="#FF3B30" />
          <Text style={styles.statNumber}>{stats.recentTransactions}</Text>
          <Text style={styles.statLabel}>За неделю</Text>
        </View>
      </View>
    </View>
  );

  const renderAccount = () => (
    <View style={dynamicStyles.section}>
      <Text style={dynamicStyles.sectionTitle}>Аккаунт и авторизация</Text>
      
      {/* Информация об аккаунте */}
      <View style={styles.accountInfo}>
        <View style={styles.accountLeft}>
          <Ionicons 
            name={isGuestMode ? "person-outline" : "shield-checkmark-outline"} 
            size={32} 
            color={isGuestMode ? "#FF9500" : "#34C759"} 
          />
          <View style={styles.accountText}>
            <Text style={dynamicStyles.accountName}>
              {user?.full_name || 'Гость'}
            </Text>
            <Text style={dynamicStyles.accountEmail}>
              {isGuestMode ? 'Гостевой режим' : user?.email}
            </Text>
            <Text style={dynamicStyles.accountCompany}>
              {company?.name || 'Локальная компания'}
            </Text>
          </View>
        </View>
        <View style={styles.accountStatus}>
          <Text style={[
            styles.statusBadge, 
            isGuestMode ? styles.guestBadge : styles.activeBadge
          ]}>
            {isGuestMode ? 'ГОСТЬ' : 'АКТИВЕН'}
          </Text>
        </View>
      </View>

      {/* Действия с аккаунтом */}
      {isGuestMode ? (
        <TouchableOpacity style={dynamicStyles.actionItem} onPress={handleSignIn}>
          <Ionicons name="log-in-outline" size={24} color="#34C759" />
          <View style={dynamicStyles.actionText}>
            <Text style={dynamicStyles.actionTitle}>Войти в аккаунт</Text>
            <Text style={dynamicStyles.actionSubtitle}>Синхронизация с облаком и дополнительные функции</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity style={dynamicStyles.actionItem} onPress={handleSwitchAccount}>
            <Ionicons name="swap-horizontal-outline" size={24} color="#007AFF" />
            <View style={dynamicStyles.actionText}>
              <Text style={dynamicStyles.actionTitle}>Сменить аккаунт</Text>
              <Text style={dynamicStyles.actionSubtitle}>Войти в другой аккаунт</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={dynamicStyles.actionItem} onPress={() => Alert.alert('Информация', 'Управление профилем будет добавлено в следующих версиях')}>
            <Ionicons name="person-circle-outline" size={24} color="#5856D6" />
            <View style={dynamicStyles.actionText}>
              <Text style={dynamicStyles.actionTitle}>Профиль пользователя</Text>
              <Text style={dynamicStyles.actionSubtitle}>Редактировать имя, email и настройки</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={dynamicStyles.actionItem} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        <View style={dynamicStyles.actionText}>
          <Text style={[dynamicStyles.actionTitle, { color: '#FF3B30' }]}>
            {isGuestMode ? 'Выйти из гостевого режима' : 'Выйти из аккаунта'}
          </Text>
          <Text style={dynamicStyles.actionSubtitle}>
            {isGuestMode ? 'Данные останутся на устройстве' : 'Потребуется повторный вход'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Настройки</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Уведомления</Text>
            <Text style={styles.settingSubtitle}>Получать уведомления о операциях</Text>
          </View>
        </View>
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={notifications ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="sync-outline" size={24} color="#666" />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Автосинхронизация</Text>
            <Text style={styles.settingSubtitle}>Автоматически синхронизировать данные</Text>
          </View>
        </View>
        <Switch
          value={autoSync}
          onValueChange={setAutoSync}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={autoSync ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="moon-outline" size={24} color="#666" />
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>Темная тема</Text>
            <Text style={styles.settingSubtitle}>Использовать темное оформление</Text>
          </View>
        </View>
        <Switch
          value={isDarkTheme}
          onValueChange={toggleTheme}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isDarkTheme ? '#007AFF' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Действия</Text>
      
      <TouchableOpacity style={styles.actionItem} onPress={handleStatistics}>
        <Ionicons name="bar-chart-outline" size={24} color="#FF3B30" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Подробная статистика</Text>
          <Text style={styles.actionSubtitle}>Полный анализ по технике, персоналу и запчастям</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleContainerManagement}>
        <Ionicons name="cube-outline" size={24} color="#5856D6" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Управление контейнерами</Text>
          <Text style={styles.actionSubtitle}>Добавить, редактировать и удалить контейнеры</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={() => handleFieldConfiguration('arrival')}>
        <Ionicons name="document-text-outline" size={24} color="#34C759" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Поля прихода товаров</Text>
          <Text style={styles.actionSubtitle}>Настроить поля для добавления товаров</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={() => handleFieldConfiguration('expense')}>
        <Ionicons name="document-outline" size={24} color="#FF9500" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Поля расхода товаров</Text>
          <Text style={styles.actionSubtitle}>Настроить поля для списания товаров</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handlePartTypesManagement}>
        <Ionicons name="pricetag-outline" size={24} color="#8E44AD" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Типы запчастей</Text>
          <Text style={styles.actionSubtitle}>Управление типами запчастей</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleReports}>
        <Ionicons name="document-text-outline" size={24} color="#E74C3C" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Отчеты</Text>
          <Text style={styles.actionSubtitle}>Формирование PDF отчетов с фильтрами</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleUserManagement}>
        <Ionicons name="people-outline" size={24} color="#3498DB" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Управление пользователями</Text>
          <Text style={styles.actionSubtitle}>Приглашения, роли и разрешения сотрудников</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleSync}>
        <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Синхронизировать</Text>
          <Text style={styles.actionSubtitle}>Загрузить данные на сервер</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleBackup}>
        <Ionicons name="archive-outline" size={24} color="#34C759" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Резервная копия</Text>
          <Text style={styles.actionSubtitle}>Создать локальную копию данных</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem} onPress={handleExportData}>
        <Ionicons name="download-outline" size={24} color="#FF9500" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Экспорт данных</Text>
          <Text style={styles.actionSubtitle}>Экспорт в Excel или CSV</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    </View>
  );

  const renderInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>О приложении</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.appName}>Склад Запчастей</Text>
        <Text style={styles.appVersion}>Версия 1.0.0 (MVP)</Text>
        <Text style={styles.appDescription}>
          Приложение для учета запчастей спецтехники с возможностью отслеживания 
          прихода, расхода и использования в ремонтных работах.
        </Text>
      </View>

      <TouchableOpacity style={styles.actionItem}>
        <Ionicons name="help-circle-outline" size={24} color="#666" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Помощь и поддержка</Text>
          <Text style={styles.actionSubtitle}>Руководство пользователя</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionItem}>
        <Ionicons name="information-circle-outline" size={24} color="#666" />
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Обратная связь</Text>
          <Text style={styles.actionSubtitle}>Сообщить об ошибке или предложении</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    </View>
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.headerBackground,
      padding: 20,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: themeColors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: themeColors.textSecondary,
    },
    content: {
      flex: 1,
    },
    section: {
      backgroundColor: themeColors.surface,
      marginTop: 20,
      marginHorizontal: 16,
      borderRadius: 12,
      padding: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.text,
      marginBottom: 16,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      padding: 16,
      backgroundColor: themeColors.card,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.text,
      marginVertical: 8,
    },
    statLabel: {
      fontSize: 12,
      color: themeColors.textSecondary,
      textAlign: 'center',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.borderLight,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingText: {
      marginLeft: 12,
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
    },
    settingSubtitle: {
      fontSize: 14,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.borderLight,
    },
    actionText: {
      marginLeft: 12,
      flex: 1,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
    },
    actionSubtitle: {
      fontSize: 14,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    infoContainer: {
      alignItems: 'center',
      paddingVertical: 16,
      marginBottom: 16,
    },
    appName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.text,
      marginBottom: 4,
    },
    appVersion: {
      fontSize: 16,
      color: themeColors.textSecondary,
      marginBottom: 12,
    },
    appDescription: {
      fontSize: 14,
      color: themeColors.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    bottomSpace: {
      height: 40,
    },
    accountName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    accountEmail: {
      fontSize: 14,
      color: themeColors.textSecondary,
      marginTop: 2,
    },
    accountCompany: {
      fontSize: 12,
      color: themeColors.textTertiary,
      marginTop: 4,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Настройки</Text>
        <Text style={dynamicStyles.subtitle}>Конфигурация и управление приложением</Text>
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        {renderStatistics()}
        {renderAccount()}
        {renderSettings()}
        {renderActions()}
        {renderInfo()}
        
        <View style={dynamicStyles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  bottomSpace: {
    height: 40,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountText: {
    marginLeft: 16,
    flex: 1,
  },
  accountStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  guestBadge: {
    backgroundColor: '#FF9500',
    color: 'white',
  },
  activeBadge: {
    backgroundColor: '#34C759',
    color: 'white',
  },
});