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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useNavigation } from '@react-navigation/native';
import ImagePickerComponent from '../components/ImagePicker';

export default function RepairScreen() {
  const navigation = useNavigation();
  const { 
    equipment, 
    parts,
    staff,
    workSessions,
    repairProcesses,
    addEquipment, 
    updateEquipment,
    startRepairProcess,
    addPartToRepair,
    removePartFromRepair,
    completeRepairProcess,
    getActiveRepairs,
    getCompletedRepairs,
    getActiveStaff,
    addStaff,
    updateStaff,
    deleteStaff,
    addWorkSession,
    addStaffToRepair,
    removeStaffFromRepair,
  } = useData();
  
  const [activeTab, setActiveTab] = useState('processes');
  const [modalVisible, setModalVisible] = useState(false);
  const [partsModalVisible, setPartsModalVisible] = useState(false);
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [peopleStaffModalVisible, setPeopleStaffModalVisible] = useState(false);
  const [workSessionModalVisible, setWorkSessionModalVisible] = useState(false);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  
  const [newEquipment, setNewEquipment] = useState({
    type: '',
    model: '',
    serialNumber: '',
    licensePlate: '',
    year: '',
    engineHours: '',
    mileage: '',
    photos: [],
  });

  const [newRepair, setNewRepair] = useState({
    equipmentId: '',
    description: '',
    priority: 'Средний',
    estimatedCost: '',
  });

  const [partSelection, setPartSelection] = useState({
    partId: '',
    quantity: '1',
    description: '',
  });

  const [staffSelection, setStaffSelection] = useState({
    staffId: '',
    hours: '1',
    description: '',
  });

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

  const [completionData, setCompletionData] = useState({
    notes: '',
    finalCost: '',
    engineHours: '',
    mileage: '',
  });

  const activeRepairs = getActiveRepairs();
  const completedRepairs = getCompletedRepairs();
  const availableParts = parts.filter(part => part.quantity > 0);
  const activeStaff = getActiveStaff();

  const priorities = ['Низкий', 'Средний', 'Высокий', 'Критический'];

  const handleAddEquipment = () => {
    if (!newEquipment.type || !newEquipment.model || !newEquipment.serialNumber) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }

    const equipmentToAdd = {
      ...newEquipment,
      photos: newEquipment.photos?.map(photo => typeof photo === 'string' ? photo : photo.uri) || [],
    };

    addEquipment(equipmentToAdd);
    setNewEquipment({
      type: '',
      model: '',
      serialNumber: '',
      licensePlate: '',
      year: '',
      engineHours: '',
      mileage: '',
      photos: [],
    });
    Alert.alert('Успешно', 'Техника добавлена');
  };

  const handleStartRepair = () => {
    if (!newRepair.equipmentId || !newRepair.description) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }

    const estimatedCost = newRepair.estimatedCost ? parseFloat(newRepair.estimatedCost) : 0;
    
    startRepairProcess({
      ...newRepair,
      estimatedCost,
    });

    setNewRepair({
      equipmentId: '',
      description: '',
      priority: 'Средний',
      estimatedCost: '',
    });
    
    setModalVisible(false);
    Alert.alert('Успешно', 'Процесс ремонта начат');
  };

  const handleAddPartToRepair = () => {
    if (!partSelection.partId || !partSelection.quantity) {
      Alert.alert('Ошибка', 'Выберите запчасть и количество');
      return;
    }

    const quantity = parseInt(partSelection.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Ошибка', 'Количество должно быть положительным числом');
      return;
    }

    const success = addPartToRepair(
      selectedRepair.id,
      partSelection.partId,
      quantity,
      partSelection.description
    );

    if (success) {
      setPartSelection({
        partId: '',
        quantity: '1',
        description: '',
      });
      setPartsModalVisible(false);
      Alert.alert('Успешно', 'Запчасть добавлена к ремонту');
    } else {
      Alert.alert('Ошибка', 'Недостаточно запчастей на складе');
    }
  };

  const handleRemovePartFromRepair = (repairPartId) => {
    Alert.alert(
      'Удаление запчасти',
      'Вы уверены? Запчасть будет возвращена на склад.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => {
            removePartFromRepair(selectedRepair.id, repairPartId);
            Alert.alert('Успешно', 'Запчасть возвращена на склад');
          }
        }
      ]
    );
  };

  const handleAddStaffToRepair = () => {
    if (!staffSelection.staffId || !staffSelection.hours) {
      Alert.alert('Ошибка', 'Выберите сотрудника и укажите часы');
      return;
    }

    const hours = parseFloat(staffSelection.hours);
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Ошибка', 'Часы должны быть положительным числом');
      return;
    }

    const success = addStaffToRepair(
      selectedRepair.id,
      staffSelection.staffId,
      hours,
      staffSelection.description
    );

    if (success) {
      setStaffSelection({
        staffId: '',
        hours: '1',
        description: '',
      });
      setStaffModalVisible(false);
      Alert.alert('Успешно', 'Сотрудник добавлен к ремонту');
    } else {
      Alert.alert('Ошибка', 'Не удалось добавить сотрудника');
    }
  };

  const handleRemoveStaffFromRepair = (repairStaffId) => {
    Alert.alert(
      'Удаление сотрудника',
      'Вы уверены? Время работы будет убрано из ремонта.',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => {
            removeStaffFromRepair(selectedRepair.id, repairStaffId);
            Alert.alert('Успешно', 'Сотрудник удален из ремонта');
          }
        }
      ]
    );
  };

  const handleAddStaffFromPeople = () => {
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
    setPeopleStaffModalVisible(false);
  };

  const handleEditStaffFromPeople = (staffMember) => {
    setEditingStaff(staffMember);
    setNewStaff({
      name: staffMember.name,
      position: staffMember.position,
      hourlyRate: staffMember.hourlyRate.toString(),
      phone: staffMember.phone || '',
    });
    setPeopleStaffModalVisible(true);
  };

  const handleDeleteStaffFromPeople = (staffId) => {
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

  const handleAddWorkSessionFromPeople = () => {
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

  const handleCompleteRepair = () => {
    const finalCost = completionData.finalCost ? parseFloat(completionData.finalCost) : selectedRepair.totalCost;
    const engineHours = completionData.engineHours && completionData.engineHours.trim() !== '' ? parseFloat(completionData.engineHours) : null;
    const mileage = completionData.mileage && completionData.mileage.trim() !== '' ? parseFloat(completionData.mileage) : null;
    
    completeRepairProcess(selectedRepair.id, {
      notes: completionData.notes,
      finalCost,
      engineHours,
      mileage,
    });

    setCompletionData({
      notes: '',
      finalCost: '',
      engineHours: '',
      mileage: '',
    });
    setCompletionModalVisible(false);
    setSelectedRepair(null);
    Alert.alert('Успешно', 'Ремонт завершен');
  };

  const renderEquipmentTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Список техники</Text>
          <TouchableOpacity 
            style={styles.addProcessButton}
            onPress={() => setEquipmentModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        {equipment.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.equipmentItem}
            onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
          >
            <View style={styles.equipmentHeader}>
              <Text style={styles.equipmentName}>{item.type} {item.model}</Text>
              <View style={[styles.statusBadge, 
                item.status === 'Исправен' ? styles.statusGood : 
                item.status === 'В ремонте' ? styles.statusRepair : styles.statusBad
              ]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.equipmentSerial}>Серийный номер: {item.serialNumber}</Text>
            {item.licensePlate && <Text style={styles.equipmentYear}>Гос номер: {item.licensePlate}</Text>}
            {item.year && <Text style={styles.equipmentYear}>Год: {item.year}</Text>}
            {item.engineHours !== undefined && <Text style={styles.equipmentYear}>Моточасы: {item.engineHours}</Text>}
            {item.mileage !== undefined && <Text style={styles.equipmentYear}>Пробег: {item.mileage} км</Text>}
            
            <View style={styles.equipmentFooter}>
              <Ionicons name="chevron-forward" size={20} color="#007AFF" />
              <Text style={styles.detailsText}>Подробная информация</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderProcessesTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Активные ремонты</Text>
          <TouchableOpacity 
            style={styles.addProcessButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {activeRepairs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет активных ремонтов</Text>
          </View>
        ) : (
          activeRepairs.map(repair => (
            <View key={repair.id} style={styles.repairItem}>
              <View style={styles.repairHeader}>
                <Text style={styles.repairDescription}>{repair.description}</Text>
                <View style={styles.repairActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedRepair(repair);
                      setPartsModalVisible(true);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedRepair(repair);
                      setStaffModalVisible(true);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={20} color="#FF9500" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedRepair(repair);
                      setCompletionModalVisible(true);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color="#34C759" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.repairEquipment}>
                {equipment.find(eq => eq.id === repair.equipmentId)?.type} {equipment.find(eq => eq.id === repair.equipmentId)?.model}
                {equipment.find(eq => eq.id === repair.equipmentId)?.licensePlate && ` (${equipment.find(eq => eq.id === repair.equipmentId)?.licensePlate})`}
              </Text>
              
              <Text style={styles.repairDate}>
                Начат: {new Date(repair.startDate).toLocaleDateString()}
              </Text>
              
              <Text style={styles.repairPriority}>Приоритет: {repair.priority}</Text>
              
              {repair.parts.length > 0 && (
                <View style={styles.repairParts}>
                  <Text style={styles.repairPartsTitle}>Использованные запчасти:</Text>
                  {repair.parts.map(part => (
                    <View key={part.id} style={styles.repairPartItem}>
                      <Text style={styles.repairPartName}>
                        {part.partName} ({part.quantity} шт.)
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemovePartFromRepair(part.id)}
                      >
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {repair.staff?.length > 0 && (
                <View style={styles.repairParts}>
                  <Text style={styles.repairPartsTitle}>Задействованный персонал:</Text>
                  {repair.staff.map(staffMember => (
                    <View key={staffMember.id} style={styles.repairPartItem}>
                      <Text style={styles.repairPartName}>
                        {staffMember.staffName} ({staffMember.staffPosition}) - {staffMember.hours} ч. × {staffMember.hourlyRate} руб/ч
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveStaffFromRepair(staffMember.id)}
                      >
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.costBreakdown}>
                <Text style={styles.repairCost}>
                  Запчасти: {((repair.parts?.reduce((sum, p) => sum + p.totalPrice, 0)) || 0).toFixed(2)} руб.
                </Text>
                <Text style={styles.repairCost}>
                  Работа: {(repair.laborCost || 0).toFixed(2)} руб.
                </Text>
                <Text style={styles.repairCostTotal}>
                  Общая стоимость: {repair.totalCost.toFixed(2)} руб.
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>История завершенных ремонтов</Text>
        
        {completedRepairs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет завершенных ремонтов</Text>
          </View>
        ) : (
          completedRepairs
            .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
            .map(repair => (
            <View key={repair.id} style={styles.historyItem}>
              <View style={styles.repairHeader}>
                <Text style={styles.repairDescription}>{repair.description}</Text>
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>Завершен</Text>
                </View>
              </View>
              
              <Text style={styles.repairEquipment}>
                {equipment.find(eq => eq.id === repair.equipmentId)?.type} {equipment.find(eq => eq.id === repair.equipmentId)?.model}
                {equipment.find(eq => eq.id === repair.equipmentId)?.licensePlate && ` (${equipment.find(eq => eq.id === repair.equipmentId)?.licensePlate})`}
              </Text>
              
              <Text style={styles.repairDate}>
                Начат: {new Date(repair.startDate).toLocaleDateString()}
              </Text>
              <Text style={styles.repairDate}>
                Завершен: {new Date(repair.endDate).toLocaleDateString()}
              </Text>
              
              <Text style={styles.repairPriority}>Приоритет: {repair.priority}</Text>
              
              {repair.parts.length > 0 && (
                <View style={styles.repairParts}>
                  <Text style={styles.repairPartsTitle}>Использованные запчасти:</Text>
                  {repair.parts.map(part => (
                    <View key={part.id} style={styles.historyPartItem}>
                      <Text style={styles.repairPartName}>
                        {part.partName} ({part.quantity} шт.) - {part.totalPrice.toFixed(2)} руб.
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {repair.staff?.length > 0 && (
                <View style={styles.repairParts}>
                  <Text style={styles.repairPartsTitle}>Задействованный персонал:</Text>
                  {repair.staff.map(staffMember => (
                    <View key={staffMember.id} style={styles.historyPartItem}>
                      <Text style={styles.repairPartName}>
                        {staffMember.staffName} ({staffMember.staffPosition}) - {staffMember.hours} ч. × {staffMember.hourlyRate} руб/ч = {staffMember.laborCost.toFixed(2)} руб.
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              <View style={styles.costBreakdown}>
                <Text style={styles.repairCost}>
                  Запчасти: {((repair.parts?.reduce((sum, p) => sum + p.totalPrice, 0)) || 0).toFixed(2)} руб.
                </Text>
                <Text style={styles.repairCost}>
                  Работа: {(repair.laborCost || 0).toFixed(2)} руб.
                </Text>
                <Text style={styles.repairCostTotal}>
                  Финальная стоимость: {repair.finalCost.toFixed(2)} руб.
                </Text>
              </View>
              
              {repair.completionEngineHours && (
                <Text style={styles.repairDetails}>
                  Моточасы при завершении: {repair.completionEngineHours}
                </Text>
              )}
              
              {repair.completionMileage && (
                <Text style={styles.repairDetails}>
                  Пробег при завершении: {repair.completionMileage} км
                </Text>
              )}
              
              {repair.completionNotes && (
                <View style={styles.completionNotes}>
                  <Text style={styles.repairPartsTitle}>Примечания:</Text>
                  <Text style={styles.notesText}>{repair.completionNotes}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderPeopleTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Персонал</Text>
          <TouchableOpacity 
            style={styles.addProcessButton}
            onPress={() => {
              setEditingStaff(null);
              setNewStaff({
                name: '',
                position: '',
                hourlyRate: '',
                phone: '',
              });
              setPeopleStaffModalVisible(true);
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
                    onPress={() => handleEditStaffFromPeople(member)}
                  >
                    <Ionicons name="create-outline" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteStaffFromPeople(member.id)}
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

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Рабочие сессии</Text>
          <TouchableOpacity 
            style={styles.addProcessButton}
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

  const renderNewRepairModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Начать ремонт</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Техника *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {equipment.map(eq => (
                  <TouchableOpacity
                    key={eq.id}
                    style={[
                      styles.equipmentSelector,
                      newRepair.equipmentId === eq.id && styles.equipmentSelectorActive
                    ]}
                    onPress={() => setNewRepair(prev => ({ ...prev, equipmentId: eq.id }))}
                  >
                    <Text style={[
                      styles.equipmentSelectorText,
                      newRepair.equipmentId === eq.id && styles.equipmentSelectorTextActive
                    ]}>
                      {eq.type} {eq.model}
                      {eq.licensePlate && ` (${eq.licensePlate})`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Описание ремонта *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Опишите проблему и планируемые работы"
                value={newRepair.description}
                onChangeText={value => setNewRepair(prev => ({ ...prev, description: value }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Приоритет</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {priorities.map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.prioritySelector,
                      newRepair.priority === priority && styles.prioritySelectorActive
                    ]}
                    onPress={() => setNewRepair(prev => ({ ...prev, priority }))}
                  >
                    <Text style={[
                      styles.prioritySelectorText,
                      newRepair.priority === priority && styles.prioritySelectorTextActive
                    ]}>
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Предполагаемая стоимость (руб.)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={newRepair.estimatedCost}
                onChangeText={value => setNewRepair(prev => ({ ...prev, estimatedCost: value }))}
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleStartRepair}
            >
              <Text style={styles.saveButtonText}>Начать ремонт</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPartsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={partsModalVisible}
      onRequestClose={() => setPartsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Добавить запчасть</Text>
            <TouchableOpacity onPress={() => setPartsModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Запчасть *</Text>
              <View style={styles.partsList}>
                {availableParts.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.partSelector,
                      partSelection.partId === item.id && styles.partSelectorActive
                    ]}
                    onPress={() => setPartSelection(prev => ({ ...prev, partId: item.id }))}
                  >
                    <Text style={styles.partName}>{item.name}</Text>
                    <Text style={styles.partDetails}>
                      {item.article} • Доступно: {item.quantity} шт.
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Количество *</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={partSelection.quantity}
                onChangeText={value => setPartSelection(prev => ({ ...prev, quantity: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Примечание</Text>
              <TextInput
                style={styles.input}
                placeholder="Примечание к использованию"
                value={partSelection.description}
                onChangeText={value => setPartSelection(prev => ({ ...prev, description: value }))}
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPartsModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddPartToRepair}
            >
              <Text style={styles.saveButtonText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
            <Text style={styles.modalTitle}>Добавить персонал</Text>
            <TouchableOpacity onPress={() => setStaffModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Сотрудник *</Text>
              <View style={styles.partsList}>
                {activeStaff.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.partSelector,
                      staffSelection.staffId === member.id && styles.partSelectorActive
                    ]}
                    onPress={() => setStaffSelection(prev => ({ ...prev, staffId: member.id }))}
                  >
                    <Text style={styles.partName}>{member.name}</Text>
                    <Text style={styles.partDetails}>
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
                placeholder="1"
                value={staffSelection.hours}
                onChangeText={value => setStaffSelection(prev => ({ ...prev, hours: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Описание работы</Text>
              <TextInput
                style={styles.input}
                placeholder="Описание выполненной работы"
                value={staffSelection.description}
                onChangeText={value => setStaffSelection(prev => ({ ...prev, description: value }))}
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
              onPress={handleAddStaffToRepair}
            >
              <Text style={styles.saveButtonText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPeopleStaffModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={peopleStaffModalVisible}
      onRequestClose={() => setPeopleStaffModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingStaff ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
            </Text>
            <TouchableOpacity onPress={() => setPeopleStaffModalVisible(false)}>
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
              onPress={() => setPeopleStaffModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddStaffFromPeople}
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
              <View style={styles.partsList}>
                {activeStaff.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.partSelector,
                      newWorkSession.staffId === member.id && styles.partSelectorActive
                    ]}
                    onPress={() => setNewWorkSession(prev => ({ ...prev, staffId: member.id }))}
                  >
                    <Text style={styles.partName}>{member.name}</Text>
                    <Text style={styles.partDetails}>
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
              onPress={handleAddWorkSessionFromPeople}
            >
              <Text style={styles.saveButtonText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCompletionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={completionModalVisible}
      onRequestClose={() => setCompletionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Завершить ремонт</Text>
            <TouchableOpacity onPress={() => setCompletionModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Финальная стоимость (руб.)</Text>
              <TextInput
                style={styles.input}
                placeholder={selectedRepair?.totalCost?.toString() || '0'}
                value={completionData.finalCost}
                onChangeText={value => setCompletionData(prev => ({ ...prev, finalCost: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Текущие моточасы</Text>
              <TextInput
                style={styles.input}
                placeholder={equipment.find(eq => eq.id === selectedRepair?.equipmentId)?.engineHours?.toString() || '0'}
                value={completionData.engineHours}
                onChangeText={value => setCompletionData(prev => ({ ...prev, engineHours: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Текущий пробег (км)</Text>
              <TextInput
                style={styles.input}
                placeholder={equipment.find(eq => eq.id === selectedRepair?.equipmentId)?.mileage?.toString() || '0'}
                value={completionData.mileage}
                onChangeText={value => setCompletionData(prev => ({ ...prev, mileage: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Примечания по завершению</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Результаты ремонта, рекомендации"
                value={completionData.notes}
                onChangeText={value => setCompletionData(prev => ({ ...prev, notes: value }))}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCompletionModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCompleteRepair}
            >
              <Text style={styles.saveButtonText}>Завершить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEquipmentModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={equipmentModalVisible}
      onRequestClose={() => setEquipmentModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Добавить технику</Text>
            <TouchableOpacity onPress={() => setEquipmentModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Тип техники *</Text>
              <TextInput
                style={styles.input}
                placeholder="Трактор, КамАЗ, Экскаватор..."
                value={newEquipment.type}
                onChangeText={value => setNewEquipment(prev => ({ ...prev, type: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Модель *</Text>
              <TextInput
                style={styles.input}
                placeholder="МТЗ-82, КамАЗ-5320..."
                value={newEquipment.model}
                onChangeText={value => setNewEquipment(prev => ({ ...prev, model: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Серийный номер *</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите серийный номер"
                value={newEquipment.serialNumber}
                onChangeText={value => setNewEquipment(prev => ({ ...prev, serialNumber: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Гос номер</Text>
              <TextInput
                style={styles.input}
                placeholder="A123BC77"
                value={newEquipment.licensePlate}
                onChangeText={value => setNewEquipment(prev => ({ ...prev, licensePlate: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Год выпуска</Text>
              <TextInput
                style={styles.input}
                placeholder="2023"
                value={newEquipment.year}
                onChangeText={value => setNewEquipment(prev => ({ ...prev, year: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Моточасы</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={newEquipment.engineHours}
                onChangeText={value => setNewEquipment(prev => ({ ...prev, engineHours: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Пробег (км)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={newEquipment.mileage}
                onChangeText={value => setNewEquipment(prev => ({ ...prev, mileage: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Фотографии</Text>
              <ImagePickerComponent
                photos={newEquipment.photos}
                onPhotosChange={photos => setNewEquipment(prev => ({ ...prev, photos }))}
                maxPhotos={5}
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEquipmentModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                handleAddEquipment();
                setEquipmentModalVisible(false);
              }}
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
        <Text style={styles.title}>Ремонт</Text>
        <Text style={styles.subtitle}>Управление техникой и ремонтом</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'processes' && styles.activeTab]}
          onPress={() => setActiveTab('processes')}
        >
          <Text style={[styles.tabText, activeTab === 'processes' && styles.activeTabText]}>
            Активные
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            История
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'people' && styles.activeTab]}
          onPress={() => setActiveTab('people')}
        >
          <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
            Люди
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'equipment' && styles.activeTab]}
          onPress={() => setActiveTab('equipment')}
        >
          <Text style={[styles.tabText, activeTab === 'equipment' && styles.activeTabText]}>
            Техника
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'equipment' ? renderEquipmentTab() : 
       activeTab === 'history' ? renderHistoryTab() : 
       activeTab === 'people' ? renderPeopleTab() : renderProcessesTab()}

      {renderNewRepairModal()}
      {renderPartsModal()}
      {renderStaffModal()}
      {renderPeopleStaffModal()}
      {renderWorkSessionModal()}
      {renderCompletionModal()}
      {renderEquipmentModal()}
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
    marginBottom: 16,
  },
  addProcessButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  equipmentItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusGood: {
    backgroundColor: '#D4F6D4',
  },
  statusRepair: {
    backgroundColor: '#FFE4B5',
  },
  statusBad: {
    backgroundColor: '#FFD4D4',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  equipmentSerial: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  equipmentYear: {
    fontSize: 14,
    color: '#666',
  },
  equipmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailsText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  repairItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  repairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repairDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  repairActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  repairEquipment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  repairDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  repairPriority: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  repairParts: {
    marginTop: 8,
    marginBottom: 8,
  },
  repairPartsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  repairPartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  repairPartName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  repairCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
  equipmentSelector: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  equipmentSelectorActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  equipmentSelectorText: {
    fontSize: 14,
    color: '#666',
  },
  equipmentSelectorTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  prioritySelector: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  prioritySelectorActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  prioritySelectorText: {
    fontSize: 14,
    color: '#666',
  },
  prioritySelectorTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  partsList: {
    maxHeight: 200,
  },
  partSelector: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  partSelectorActive: {
    backgroundColor: '#E6F3FF',
    borderColor: '#007AFF',
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  partDetails: {
    fontSize: 14,
    color: '#666',
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  completedBadge: {
    backgroundColor: '#D4F6D4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  historyPartItem: {
    backgroundColor: '#fff',
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
  },
  repairDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  completionNotes: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  costBreakdown: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  repairCostTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 4,
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
});