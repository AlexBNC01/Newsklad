import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function EquipmentDetailScreen({ route, navigation }) {
  const { equipmentId } = route.params;
  const { 
    equipment, 
    getRepairsByEquipment, 
    getCompletedRepairs,
    transactions,
    parts,
    staff,
    updateEquipment,
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({});
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const equipmentItem = equipment.find(eq => eq.id === equipmentId);
  const allRepairs = getRepairsByEquipment(equipmentId);
  const completedRepairs = allRepairs.filter(repair => repair.status === 'Завершен');
  const activeRepairs = allRepairs.filter(repair => repair.status === 'В процессе');
  
  // Получаем все транзакции связанные с этой техникой
  const equipmentTransactions = transactions.filter(t => t.equipmentId === equipmentId);

  if (!equipmentItem) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Техника не найдена</Text>
      </View>
    );
  }

  const handleEdit = () => {
    setEditData({
      engineHours: equipmentItem.engineHours?.toString() || '',
      mileage: equipmentItem.mileage?.toString() || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    const engineHours = editData.engineHours ? parseFloat(editData.engineHours) : equipmentItem.engineHours;
    const mileage = editData.mileage ? parseFloat(editData.mileage) : equipmentItem.mileage;
    
    updateEquipment(equipmentId, {
      engineHours,
      mileage,
    });
    
    setEditModalVisible(false);
    Alert.alert('Успешно', 'Данные техники обновлены');
  };

  const getFinancialStats = () => {
    const startDate = new Date(selectedPeriod.startDate);
    const endDate = new Date(selectedPeriod.endDate);
    endDate.setHours(23, 59, 59, 999); // Включаем весь последний день

    // Фильтруем ремонты по периоду
    const periodCompletedRepairs = completedRepairs.filter(repair => {
      const repairEndDate = new Date(repair.endDate);
      return repairEndDate >= startDate && repairEndDate <= endDate;
    });

    // Фильтруем транзакции по периоду
    const periodEquipmentTransactions = equipmentTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Статистика по завершенным ремонтам
    const totalRepairCost = periodCompletedRepairs.reduce((sum, repair) => sum + (repair.finalCost || 0), 0);
    const totalPartsUsedInRepairs = periodCompletedRepairs.reduce((sum, repair) => 
      sum + (repair.parts?.reduce((partSum, part) => partSum + part.totalPrice, 0) || 0), 0
    );
    const totalLaborCost = periodCompletedRepairs.reduce((sum, repair) => sum + (repair.laborCost || 0), 0);
    const totalRepairs = periodCompletedRepairs.length;
    const totalLaborHours = periodCompletedRepairs.reduce((sum, repair) => 
      sum + (repair.staff?.reduce((staffSum, staff) => staffSum + staff.hours, 0) || 0), 0
    );
    const totalPartsQuantity = periodCompletedRepairs.reduce((sum, repair) => 
      sum + (repair.parts?.reduce((partSum, part) => partSum + part.quantity, 0) || 0), 0
    );

    // Статистика по операциям списания через систему расходов (ИСКЛЮЧАЯ те, что были списаны в ремонтах)
    const directExpenseTransactions = periodEquipmentTransactions.filter(t => 
      t.type === 'expense' && !t.description.includes('Использовано в ремонте')
    );
    
    const totalExpenseTransactions = directExpenseTransactions.length;
    const totalExpenseCost = directExpenseTransactions
      .reduce((sum, transaction) => {
        // Ищем запчасть для получения её цены
        const part = parts.find(p => p.id === transaction.partId);
        if (part && part.price) {
          return sum + (part.price * transaction.quantity);
        }
        return sum;
      }, 0);

    const totalExpenseQuantity = directExpenseTransactions
      .reduce((sum, transaction) => sum + transaction.quantity, 0);

    // Общая стоимость всех операций с запчастями для этой техники (без дублирования)
    const totalPartsCost = totalPartsUsedInRepairs + totalExpenseCost;

    return {
      totalRepairCost,
      totalPartsUsedInRepairs,
      totalLaborCost,
      totalRepairs,
      totalLaborHours,
      totalPartsQuantity,
      totalExpenseTransactions,
      totalExpenseCost,
      totalExpenseQuantity,
      totalPartsCost,
      periodEquipmentTransactions,
      periodCompletedRepairs,
    };
  };

  const stats = getFinancialStats();

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Основная информация</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Тип техники</Text>
            <Text style={styles.infoValue}>{equipmentItem.type}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Модель</Text>
            <Text style={styles.infoValue}>{equipmentItem.model}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Серийный номер</Text>
            <Text style={styles.infoValue}>{equipmentItem.serialNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Гос номер</Text>
            <Text style={styles.infoValue}>{equipmentItem.licensePlate || 'Не указан'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Год выпуска</Text>
            <Text style={styles.infoValue}>{equipmentItem.year || 'Не указан'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Статус</Text>
            <View style={[styles.statusBadge, 
              equipmentItem.status === 'Исправен' ? styles.statusGood : 
              equipmentItem.status === 'В ремонте' ? styles.statusRepair : styles.statusBad
            ]}>
              <Text style={styles.statusText}>{equipmentItem.status}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Показатели эксплуатации</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="speedometer-outline" size={32} color="#007AFF" />
            <Text style={styles.metricValue}>{equipmentItem.engineHours || 0}</Text>
            <Text style={styles.metricLabel}>Моточасы</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="car-outline" size={32} color="#34C759" />
            <Text style={styles.metricValue}>{equipmentItem.mileage || 0}</Text>
            <Text style={styles.metricLabel}>Пробег (км)</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Статистика ремонтов</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="construct" size={24} color="#FF9500" />
            <Text style={styles.statValue}>{stats.totalRepairs}</Text>
            <Text style={styles.statLabel}>Завершено ремонтов</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#007AFF" />
            <Text style={styles.statValue}>{stats.totalLaborHours.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Часов работы</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cube" size={24} color="#34C759" />
            <Text style={styles.statValue}>{stats.totalPartsQuantity}</Text>
            <Text style={styles.statLabel}>Запчастей в ремонтах</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="card" size={24} color="#FF3B30" />
            <Text style={styles.statValue}>{stats.totalRepairCost.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Стоимость ремонтов (руб)</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Статистика по запчастям</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="remove-circle" size={24} color="#FF9500" />
            <Text style={styles.statValue}>{stats.totalExpenseTransactions}</Text>
            <Text style={styles.statLabel}>Операций списания</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="layers" size={24} color="#007AFF" />
            <Text style={styles.statValue}>{stats.totalExpenseQuantity}</Text>
            <Text style={styles.statLabel}>Запчастей списано</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color="#34C759" />
            <Text style={styles.statValue}>{stats.totalExpenseCost.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Стоимость списаний (руб)</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calculator" size={24} color="#5856D6" />
            <Text style={styles.statValue}>{stats.totalPartsCost.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Общая стоимость запчастей (руб)</Text>
          </View>
        </View>
      </View>

      {equipmentItem.photos && equipmentItem.photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Фотографии</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {equipmentItem.photos.map((photo, index) => (
              <Image 
                key={index} 
                source={{ uri: typeof photo === 'string' ? photo : photo.uri }} 
                style={styles.photo} />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderRepairsTab = () => (
    <View style={styles.tabContent}>
      {activeRepairs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Активные ремонты</Text>
          {activeRepairs.map(repair => (
            <View key={repair.id} style={styles.repairItem}>
              <View style={styles.repairHeader}>
                <Text style={styles.repairDescription}>{repair.description}</Text>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityText}>{repair.priority}</Text>
                </View>
              </View>
              <Text style={styles.repairDate}>
                Начат: {new Date(repair.startDate).toLocaleDateString()}
              </Text>
              <Text style={styles.repairCost}>
                Текущая стоимость: {repair.totalCost.toFixed(2)} руб.
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>История ремонтов</Text>
        {stats.periodCompletedRepairs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет завершенных ремонтов за выбранный период</Text>
          </View>
        ) : (
          stats.periodCompletedRepairs
            .sort((a, b) => new Date(b.endDate) - new Date(a.endDate))
            .map(repair => (
              <View key={repair.id} style={styles.historyItem}>
                <View style={styles.repairHeader}>
                  <Text style={styles.repairDescription}>{repair.description}</Text>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>Завершен</Text>
                  </View>
                </View>
                
                <Text style={styles.repairDate}>
                  {new Date(repair.startDate).toLocaleDateString()} - {new Date(repair.endDate).toLocaleDateString()}
                </Text>
                
                <Text style={styles.repairPriority}>Приоритет: {repair.priority}</Text>
                
                {repair.parts && repair.parts.length > 0 && (
                  <View style={styles.repairDetails}>
                    <Text style={styles.detailsTitle}>Использованные запчасти:</Text>
                    {repair.parts.map(part => (
                      <View key={part.id} style={styles.partItem}>
                        <Text style={styles.partName}>
                          {part.partName} ({part.quantity} шт.)
                        </Text>
                        <Text style={styles.partPrice}>
                          {part.totalPrice.toFixed(2)} руб.
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {repair.staff && repair.staff.length > 0 && (
                  <View style={styles.repairDetails}>
                    <Text style={styles.detailsTitle}>Задействованный персонал:</Text>
                    {repair.staff.map(staffMember => (
                      <View key={staffMember.id} style={styles.staffItem}>
                        <Text style={styles.staffName}>
                          {staffMember.staffName} ({staffMember.staffPosition})
                        </Text>
                        <Text style={styles.staffHours}>
                          {staffMember.hours} ч. × {staffMember.hourlyRate} руб/ч = {staffMember.laborCost.toFixed(2)} руб.
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={styles.costSummary}>
                  <Text style={styles.costBreakdown}>
                    Запчасти: {((repair.parts?.reduce((sum, p) => sum + p.totalPrice, 0)) || 0).toFixed(2)} руб.
                  </Text>
                  <Text style={styles.costBreakdown}>
                    Работа: {(repair.laborCost || 0).toFixed(2)} руб.
                  </Text>
                  <Text style={styles.costTotal}>
                    Итого: {repair.finalCost.toFixed(2)} руб.
                  </Text>
                </View>
                
                {repair.completionEngineHours && (
                  <Text style={styles.completionData}>
                    Моточасы при завершении: {repair.completionEngineHours}
                  </Text>
                )}
                
                {repair.completionMileage && (
                  <Text style={styles.completionData}>
                    Пробег при завершении: {repair.completionMileage} км
                  </Text>
                )}
                
                {repair.completionNotes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.detailsTitle}>Примечания:</Text>
                    <Text style={styles.notesText}>{repair.completionNotes}</Text>
                  </View>
                )}
              </View>
            ))
        )}
      </View>
    </View>
  );

  const renderTransactionsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>История операций с запчастями</Text>
        {stats.periodEquipmentTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет операций с запчастями за выбранный период</Text>
          </View>
        ) : (
          stats.periodEquipmentTransactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map(transaction => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionName}>{transaction.partName}</Text>
                  <View style={[styles.transactionTypeBadge, 
                    transaction.type === 'expense' ? styles.expenseType : styles.arrivalType
                  ]}>
                    <Text style={styles.transactionTypeText}>
                      {transaction.type === 'expense' ? 'Списание' : 'Поступление'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.transactionQuantity}>
                  Количество: {transaction.quantity} шт.
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.timestamp).toLocaleDateString()} {new Date(transaction.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                {transaction.type === 'expense' && (
                  <View style={styles.transactionCostContainer}>
                    <Text style={styles.transactionCost}>
                      Стоимость: {(() => {
                        const part = parts.find(p => p.id === transaction.partId);
                        if (part && part.price) {
                          return `${(part.price * transaction.quantity).toFixed(2)} руб. (${part.price} руб/шт)`;
                        }
                        return 'Не указана';
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            ))
        )}
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={editModalVisible}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Редактировать показатели</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Моточасы</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={editData.engineHours}
                onChangeText={value => setEditData(prev => ({ ...prev, engineHours: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Пробег (км)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={editData.mileage}
                onChangeText={value => setEditData(prev => ({ ...prev, mileage: value }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEdit}
            >
              <Text style={styles.saveButtonText}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPeriodModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={periodModalVisible}
      onRequestClose={() => setPeriodModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Выбор периода</Text>
            <TouchableOpacity onPress={() => setPeriodModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Дата начала</Text>
              <TextInput
                style={styles.input}
                placeholder="ГГГГ-ММ-ДД"
                value={selectedPeriod.startDate}
                onChangeText={value => setSelectedPeriod(prev => ({ ...prev, startDate: value }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Дата окончания</Text>
              <TextInput
                style={styles.input}
                placeholder="ГГГГ-ММ-ДД"
                value={selectedPeriod.endDate}
                onChangeText={value => setSelectedPeriod(prev => ({ ...prev, endDate: value }))}
              />
            </View>

            <View style={styles.periodPresets}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => {
                  const now = new Date();
                  setSelectedPeriod({
                    startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
                    endDate: now.toISOString().split('T')[0]
                  });
                }}
              >
                <Text style={styles.presetButtonText}>Текущий месяц</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => {
                  const now = new Date();
                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                  setSelectedPeriod({
                    startDate: lastMonth.toISOString().split('T')[0],
                    endDate: lastMonthEnd.toISOString().split('T')[0]
                  });
                }}
              >
                <Text style={styles.presetButtonText}>Прошлый месяц</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => {
                  const now = new Date();
                  setSelectedPeriod({
                    startDate: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
                    endDate: now.toISOString().split('T')[0]
                  });
                }}
              >
                <Text style={styles.presetButtonText}>Весь год</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPeriodModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setPeriodModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Применить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{equipmentItem.type} {equipmentItem.model}</Text>
            <TouchableOpacity 
              style={styles.periodButton} 
              onPress={() => setPeriodModalVisible(true)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Ionicons name="calendar-outline" size={14} color="#007AFF" />
              <Text style={styles.periodButtonText}>Период</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {equipmentItem.licensePlate && `${equipmentItem.licensePlate} • `}
            {equipmentItem.serialNumber}
          </Text>
          <Text style={styles.periodInfo}>
            {new Date(selectedPeriod.startDate).toLocaleDateString()} - {new Date(selectedPeriod.endDate).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Обзор
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'repairs' && styles.activeTab]}
          onPress={() => setActiveTab('repairs')}
        >
          <Text style={[styles.tabText, activeTab === 'repairs' && styles.activeTabText]}>
            Ремонты
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            История
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'repairs' && renderRepairsTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
      </ScrollView>

      {renderEditModal()}
      {renderPeriodModal()}
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
    padding: 16,
    paddingTop: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
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
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  editButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricCard: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  repairItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
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
  priorityBadge: {
    backgroundColor: '#FFE4B5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9500',
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
  repairCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  repairDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  partName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  partPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  staffItem: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  staffHours: {
    fontSize: 12,
    color: '#666',
  },
  costSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  costBreakdown: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  costTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 4,
  },
  completionData: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
  },
  transactionItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  transactionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expenseType: {
    backgroundColor: '#FFD4D4',
  },
  arrivalType: {
    backgroundColor: '#D4F6D4',
  },
  transactionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  transactionQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  transactionCostContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  transactionCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 100,
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
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
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: '#f0f8ff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 11,
    color: '#007AFF',
    marginLeft: 3,
    fontWeight: '500',
  },
  periodInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  periodPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  presetButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  presetButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});