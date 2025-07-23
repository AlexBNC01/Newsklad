import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function StaffScreen() {
  const { 
    staff,
    workSessions,
    addStaff,
    updateStaff,
    deleteStaff,
    getActiveStaff,
    addWorkSession,
  } = useData();
  
  const [activeTab, setActiveTab] = useState('staff');
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [workSessionModalVisible, setWorkSessionModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  
  const [newStaff, setNewStaff] = useState({
    name: '',
    position: '',
    hourlyRate: '',
    phone: '',
  });

  const [newWorkSession, setNewWorkSession] = useState({
    staffId: '',
    hours: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const activeStaff = getActiveStaff();

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.position || !newStaff.hourlyRate) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }

    const hourlyRate = parseFloat(newStaff.hourlyRate);
    if (isNaN(hourlyRate) || hourlyRate <= 0) {
      Alert.alert('Ошибка', 'Ставка должна быть положительным числом');
      return;
    }

    const staffData = {
      ...newStaff,
      hourlyRate,
    };

    if (editingStaff) {
      updateStaff(editingStaff.id, staffData);
      setEditingStaff(null);
      Alert.alert('Успешно', 'Данные сотрудника обновлены');
    } else {
      addStaff(staffData);
      Alert.alert('Успешно', 'Сотрудник добавлен');
    }
    
    setNewStaff({
      name: '',
      position: '',
      hourlyRate: '',
      phone: '',
    });
    setStaffModalVisible(false);
  };

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setNewStaff({
      name: staffMember.name,
      position: staffMember.position,
      hourlyRate: staffMember.hourlyRate.toString(),
      phone: staffMember.phone || '',
    });
    setStaffModalVisible(true);
  };

  const handleDeleteStaff = (staffId) => {
    Alert.alert(
      'Удаление сотрудника',
      'Вы уверены? Сотрудник будет деактивирован.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => {
            deleteStaff(staffId);
            Alert.alert('Успешно', 'Сотрудник деактивирован');
          }
        }
      ]
    );
  };

  const handleAddWorkSession = () => {
    if (!newWorkSession.staffId || !newWorkSession.hours || !newWorkSession.description) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    const hours = parseFloat(newWorkSession.hours);
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Ошибка', 'Часы должны быть положительным числом');
      return;
    }

    const staffMember = staff.find(s => s.id === newWorkSession.staffId);
    const totalCost = hours * staffMember.hourlyRate;

    const sessionData = {
      ...newWorkSession,
      hours,
      totalCost,
      staffName: staffMember.name,
      staffPosition: staffMember.position,
      hourlyRate: staffMember.hourlyRate,
    };

    addWorkSession(sessionData);
    
    setNewWorkSession({
      staffId: '',
      hours: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setWorkSessionModalVisible(false);
    Alert.alert('Успешно', 'Рабочая сессия добавлена');
  };

  const renderStaffTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Персонал</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              setEditingStaff(null);
              setNewStaff({
                name: '',
                position: '',
                hourlyRate: '',
                phone: '',
              });
              setStaffModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {activeStaff.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет активного персонала</Text>
          </View>
        ) : (
          activeStaff.map(member => (
            <View key={member.id} style={styles.staffItem}>
              <View style={styles.staffHeader}>
                <Text style={styles.staffName}>{member.name}</Text>
                <View style={styles.staffActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditStaff(member)}
                  >
                    <Ionicons name="create-outline" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteStaff(member.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.staffPosition}>Должность: {member.position}</Text>
              <Text style={styles.staffRate}>Ставка: {member.hourlyRate} руб/ч</Text>
              {member.phone && <Text style={styles.staffPhone}>Телефон: {member.phone}</Text>}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderWorkSessionsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Рабочие сессии</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              setNewWorkSession({
                staffId: '',
                hours: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
              });
              setWorkSessionModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {workSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет рабочих сессий</Text>
          </View>
        ) : (
          workSessions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(session => (
              <View key={session.id} style={styles.sessionItem}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionStaff}>{session.staffName}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(session.date).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text style={styles.sessionPosition}>{session.staffPosition}</Text>
                <Text style={styles.sessionDescription}>{session.description}</Text>
                
                <View style={styles.sessionCost}>
                  <Text style={styles.sessionHours}>
                    {session.hours} ч. × {session.hourlyRate} руб/ч = {session.totalCost.toFixed(2)} руб.
                  </Text>
                </View>
              </View>
            ))
        )}
      </View>
    </ScrollView>
  );

  const renderStaffModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={staffModalVisible}
      onRequestClose={() => setStaffModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingStaff ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
            </Text>
            <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Имя *</Text>
              <TextInput
                style={styles.input}
                placeholder="Иван Иванов"
                value={newStaff.name}
                onChangeText={value => setNewStaff(prev => ({ ...prev, name: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Должность *</Text>
              <TextInput
                style={styles.input}
                placeholder="Слесарь"
                value={newStaff.position}
                onChangeText={value => setNewStaff(prev => ({ ...prev, position: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Ставка (руб/ч) *</Text>
              <TextInput
                style={styles.input}
                placeholder="500"
                value={newStaff.hourlyRate}
                onChangeText={value => setNewStaff(prev => ({ ...prev, hourlyRate: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Телефон</Text>
              <TextInput
                style={styles.input}
                placeholder="+7 (999) 123-45-67"
                value={newStaff.phone}
                onChangeText={value => setNewStaff(prev => ({ ...prev, phone: value }))}
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setStaffModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddStaff}
            >
              <Text style={styles.saveButtonText}>
                {editingStaff ? 'Сохранить' : 'Добавить'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderWorkSessionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={workSessionModalVisible}
      onRequestClose={() => setWorkSessionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Добавить рабочую сессию</Text>
            <TouchableOpacity onPress={() => setWorkSessionModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Сотрудник *</Text>
              <View style={styles.staffList}>
                {activeStaff.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.staffSelector,
                      newWorkSession.staffId === member.id && styles.staffSelectorActive
                    ]}
                    onPress={() => setNewWorkSession(prev => ({ ...prev, staffId: member.id }))}
                  >
                    <Text style={styles.staffSelectorName}>{member.name}</Text>
                    <Text style={styles.staffSelectorDetails}>
                      {member.position} • {member.hourlyRate} руб/ч
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Количество часов *</Text>
              <TextInput
                style={styles.input}
                placeholder="8"
                value={newWorkSession.hours}
                onChangeText={value => setNewWorkSession(prev => ({ ...prev, hours: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Дата</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-01-01"
                value={newWorkSession.date}
                onChangeText={value => setNewWorkSession(prev => ({ ...prev, date: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Описание работы *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Описание выполненной работы"
                value={newWorkSession.description}
                onChangeText={value => setNewWorkSession(prev => ({ ...prev, description: value }))}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setWorkSessionModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddWorkSession}
            >
              <Text style={styles.saveButtonText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Персонал</Text>
        <Text style={styles.subtitle}>Управление сотрудниками и рабочими сессиями</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'staff' && styles.activeTab]}
          onPress={() => setActiveTab('staff')}
        >
          <Text style={[styles.tabText, activeTab === 'staff' && styles.activeTabText]}>
            Сотрудники
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.activeTab]}
          onPress={() => setActiveTab('sessions')}
        >
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.activeTabText]}>
            Рабочие сессии
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'staff' ? renderStaffTab() : renderWorkSessionsTab()}

      {renderStaffModal()}
      {renderWorkSessionModal()}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  staffItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  staffActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  staffPosition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  staffRate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  staffPhone: {
    fontSize: 14,
    color: '#666',
  },
  sessionItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionStaff: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  sessionPosition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  sessionCost: {
    backgroundColor: '#e8f4f8',
    padding: 8,
    borderRadius: 4,
  },
  sessionHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  staffList: {
    maxHeight: 200,
  },
  staffSelector: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  staffSelectorActive: {
    backgroundColor: '#E6F3FF',
    borderColor: '#007AFF',
  },
  staffSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  staffSelectorDetails: {
    fontSize: 14,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});