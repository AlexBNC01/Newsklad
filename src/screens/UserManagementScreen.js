import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

export default function UserManagementScreen({ navigation }) {
  const { getThemeColors } = useData();
  const { user, company, hasPermission, getCompanyUsers, inviteUser } = useAuth();
  const themeColors = getThemeColors();

  const [users, setUsers] = useState([]);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('worker');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!hasPermission('canManageUsers')) {
      Alert.alert('Ошибка', 'У вас нет прав для управления пользователями');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const companyUsers = await getCompanyUsers();
      setUsers(companyUsers);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }

    setLoading(true);
    try {
      const result = await inviteUser(inviteEmail, inviteRole);
      if (result.success) {
        Alert.alert('Успешно', result.message);
        setInviteModalVisible(false);
        setInviteEmail('');
        setInviteRole('worker');
      } else {
        Alert.alert('Ошибка', result.error);
      }
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить приглашение');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'worker': return 'Сотрудник';
      default: return 'Неизвестная роль';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#E74C3C';
      case 'manager': return '#F39C12';
      case 'worker': return '#2ECC71';
      default: return '#95A5A6';
    }
  };

  const renderUserItem = (userData) => (
    <View key={userData.uid} style={[styles.userCard, { backgroundColor: themeColors.surface }]}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={24} color={themeColors.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: themeColors.text }]}>
              {userData.displayName}
            </Text>
            <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>
              {userData.email}
            </Text>
            <View style={styles.userMeta}>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userData.role) }]}>
                <Text style={styles.roleText}>{getRoleDisplayName(userData.role)}</Text>
              </View>
              {userData.uid === user.uid && (
                <View style={[styles.currentUserBadge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.currentUserText}>Вы</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.userActions}>
          <View style={[styles.statusIndicator, { 
            backgroundColor: userData.lastActive && 
              (Date.now() - new Date(userData.lastActive).getTime() < 5 * 60 * 1000) 
              ? '#2ECC71' : '#95A5A6' 
          }]} />
        </View>
      </View>
      
      <View style={styles.userStats}>
        <Text style={[styles.lastActive, { color: themeColors.textTertiary }]}>
          Последняя активность: {userData.lastActive ? 
            new Date(userData.lastActive).toLocaleString() : 
            'Не известно'
          }
        </Text>
      </View>
    </View>
  );

  const renderInviteModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={inviteModalVisible}
      onRequestClose={() => setInviteModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Пригласить сотрудника
            </Text>
            <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: themeColors.text }]}>Email сотрудника</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: themeColors.inputBackground,
                  borderColor: themeColors.border,
                  color: themeColors.text
                }]}
                placeholder="colleague@company.com"
                placeholderTextColor={themeColors.textTertiary}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: themeColors.text }]}>Роль</Text>
              <View style={styles.roleSelector}>
                {[
                  { key: 'worker', name: 'Сотрудник', desc: 'Может работать со складом и техникой' },
                  { key: 'manager', name: 'Менеджер', desc: 'Может просматривать отчеты и управлять операциями' },
                  { key: 'admin', name: 'Администратор', desc: 'Полный доступ ко всем функциям' },
                ].map(role => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      { borderColor: themeColors.border },
                      inviteRole === role.key && { 
                        borderColor: themeColors.primary,
                        backgroundColor: themeColors.primary + '20'
                      }
                    ]}
                    onPress={() => setInviteRole(role.key)}
                  >
                    <View style={styles.roleOptionHeader}>
                      <Text style={[styles.roleOptionName, { color: themeColors.text }]}>
                        {role.name}
                      </Text>
                      <View style={styles.radioButton}>
                        {inviteRole === role.key && (
                          <View style={[styles.radioButtonInner, { backgroundColor: themeColors.primary }]} />
                        )}
                      </View>
                    </View>
                    <Text style={[styles.roleOptionDesc, { color: themeColors.textSecondary }]}>
                      {role.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: themeColors.card }]}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: themeColors.textSecondary }]}>
                Отмена
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inviteButton, { backgroundColor: themeColors.primary }]}
              onPress={handleInviteUser}
              disabled={loading}
            >
              <Text style={styles.inviteButtonText}>
                {loading ? 'Отправка...' : 'Пригласить'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.surface,
      padding: 16,
      paddingTop: 44,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    inviteButton: {
      backgroundColor: themeColors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    inviteButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    subscriptionInfo: {
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: themeColors.primary,
    },
    subscriptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: 8,
    },
    subscriptionText: {
      fontSize: 14,
      color: themeColors.textSecondary,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
      marginBottom: 16,
    },
    userCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    userHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: themeColors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 14,
      marginBottom: 8,
    },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    roleText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    currentUserBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    currentUserText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    userActions: {
      alignItems: 'center',
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    userStats: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: themeColors.borderLight,
    },
    lastActive: {
      fontSize: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      borderRadius: 12,
      width: '90%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    modalBody: {
      padding: 20,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    roleSelector: {
      gap: 12,
    },
    roleOption: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
    },
    roleOptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    roleOptionName: {
      fontSize: 16,
      fontWeight: '600',
    },
    roleOptionDesc: {
      fontSize: 14,
      lineHeight: 18,
    },
    radioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: themeColors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    modalButtons: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Сотрудники</Text>
        </View>
        <TouchableOpacity 
          style={styles.inviteButton}
          onPress={() => setInviteModalVisible(true)}
        >
          <Text style={styles.inviteButtonText}>Пригласить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.subscriptionInfo}>
          <Text style={styles.subscriptionTitle}>
            План "{company?.subscription?.plan === 'trial' ? 'Пробный' : 'Премиум'}"
          </Text>
          <Text style={styles.subscriptionText}>
            Пользователи: {users.length} из {company?.subscription?.usersLimit || 'неограничено'}{'\n'}
            Хранилище: {company?.subscription?.storageLimit || 'неограничено'}{'\n'}
            Активен до: {company?.subscription?.expiresAt ? 
              new Date(company.subscription.expiresAt).toLocaleDateString() : 
              'неограничено'
            }
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Активные сотрудники ({users.length})
        </Text>

        {users.map(renderUserItem)}
      </ScrollView>

      {renderInviteModal()}
    </View>
  );
}