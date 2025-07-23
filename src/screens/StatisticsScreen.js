import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function StatisticsScreen() {
  const { 
    equipment,
    parts,
    staff,
    workSessions,
    repairProcesses,
    transactions,
    getActiveStaff,
    getCompletedRepairs,
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('custom');
  const [customDateModal, setCustomDateModal] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const completedRepairs = getCompletedRepairs();
  const activeStaff = getActiveStaff();

  // Функция для фильтрации по периодам
  const filterByPeriod = (items, dateField) => {
    if (!dateFrom || !dateTo) return items;
    
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999); // Включаем весь день
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filteredRepairs = filterByPeriod(completedRepairs, 'endDate');
  const filteredWorkSessions = filterByPeriod(workSessions, 'date');

  // Общая статистика
  const getTotalStats = () => {
    const totalParts = parts.reduce((sum, part) => sum + part.quantity, 0);
    const totalPartsValue = parts.reduce((sum, part) => sum + (part.quantity * (part.price || 0)), 0);
    
    const totalRepairCost = filteredRepairs.reduce((sum, repair) => sum + (repair.finalCost || 0), 0);
    const totalRepairLabor = filteredRepairs.reduce((sum, repair) => sum + (repair.laborCost || 0), 0);
    const totalRepairParts = filteredRepairs.reduce((sum, repair) => 
      sum + (repair.parts?.reduce((partSum, part) => partSum + part.totalPrice, 0) || 0), 0
    );
    
    const totalWorkSessions = filteredWorkSessions.reduce((sum, session) => sum + session.totalCost, 0);
    const totalLaborHours = filteredWorkSessions.reduce((sum, session) => sum + session.hours, 0) +
                           filteredRepairs.reduce((sum, repair) => 
                             sum + (repair.staff?.reduce((staffSum, staff) => staffSum + staff.hours, 0) || 0), 0
                           );

    return {
      totalParts,
      totalPartsValue,
      totalRepairCost,
      totalRepairLabor,
      totalRepairParts,
      totalWorkSessions,
      totalLaborHours,
      totalEquipment: equipment.length,
      totalStaff: activeStaff.length,
      totalRepairs: filteredRepairs.length,
      activeRepairs: repairProcesses.filter(r => r.status === 'В процессе').length,
    };
  };

  // Статистика по технике
  const getEquipmentStats = () => {
    return equipment.map(eq => {
      const equipmentRepairs = filteredRepairs.filter(repair => repair.equipmentId === eq.id);
      const totalCost = equipmentRepairs.reduce((sum, repair) => sum + (repair.finalCost || 0), 0);
      const totalRepairs = equipmentRepairs.length;
      const totalLaborHours = equipmentRepairs.reduce((sum, repair) => 
        sum + (repair.staff?.reduce((staffSum, staff) => staffSum + staff.hours, 0) || 0), 0
      );
      const totalPartsUsed = equipmentRepairs.reduce((sum, repair) => 
        sum + (repair.parts?.reduce((partSum, part) => partSum + part.quantity, 0) || 0), 0
      );

      return {
        ...eq,
        totalCost,
        totalRepairs,
        totalLaborHours,
        totalPartsUsed,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);
  };

  // Статистика по персоналу
  const getStaffStats = () => {
    return activeStaff.map(member => {
      const staffWorkSessions = filteredWorkSessions.filter(session => session.staffId === member.id);
      const sessionHours = staffWorkSessions.reduce((sum, session) => sum + session.hours, 0);
      const sessionCost = staffWorkSessions.reduce((sum, session) => sum + session.totalCost, 0);

      const repairWork = filteredRepairs.reduce((acc, repair) => {
        const staffWork = repair.staff?.filter(s => s.staffId === member.id) || [];
        const hours = staffWork.reduce((sum, work) => sum + work.hours, 0);
        const cost = staffWork.reduce((sum, work) => sum + work.laborCost, 0);
        return { hours: acc.hours + hours, cost: acc.cost + cost };
      }, { hours: 0, cost: 0 });

      return {
        ...member,
        totalHours: sessionHours + repairWork.hours,
        totalCost: sessionCost + repairWork.cost,
        sessionHours,
        sessionCost,
        repairHours: repairWork.hours,
        repairCost: repairWork.cost,
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  };


  const stats = getTotalStats();

  const handleCustomDateApply = () => {
    if (!dateFrom || !dateTo) {
      Alert.alert('Ошибка', 'Заполните обе даты');
      return;
    }
    
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    if (startDate > endDate) {
      Alert.alert('Ошибка', 'Дата начала не может быть позже даты окончания');
      return;
    }
    
    setCustomDateModal(false);
  };

  const renderCustomDateModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={customDateModal}
      onRequestClose={() => setCustomDateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Выбор периода</Text>
            <TouchableOpacity onPress={() => setCustomDateModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Дата с:</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-01-01"
                value={dateFrom}
                onChangeText={setDateFrom}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Дата по:</Text>
              <TextInput
                style={styles.input}
                placeholder="2024-12-31"
                value={dateTo}
                onChangeText={setDateTo}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCustomDateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCustomDateApply}
            >
              <Text style={styles.saveButtonText}>Применить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Общая статистика</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="construct" size={32} color="#007AFF" />
            <Text style={styles.statValue}>{stats.totalEquipment}</Text>
            <Text style={styles.statLabel}>Единиц техники</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="people" size={32} color="#34C759" />
            <Text style={styles.statValue}>{stats.totalStaff}</Text>
            <Text style={styles.statLabel}>Сотрудников</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cube" size={32} color="#FF9500" />
            <Text style={styles.statValue}>{stats.totalParts}</Text>
            <Text style={styles.statLabel}>Запчастей на складе</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#32D74B" />
            <Text style={styles.statValue}>{stats.totalRepairs}</Text>
            <Text style={styles.statLabel}>Завершено ремонтов</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Финансовая статистика</Text>
        
        <View style={styles.financeCard}>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Общая стоимость ремонтов:</Text>
            <Text style={styles.financeValue}>{stats.totalRepairCost.toFixed(2)} руб.</Text>
          </View>
          
          <View style={styles.financeBreakdown}>
            <View style={styles.financeRow}>
              <Text style={styles.financeSubLabel}>• Запчасти:</Text>
              <Text style={styles.financeSubValue}>{stats.totalRepairParts.toFixed(2)} руб.</Text>
            </View>
            <View style={styles.financeRow}>
              <Text style={styles.financeSubLabel}>• Работа:</Text>
              <Text style={styles.financeSubValue}>{stats.totalRepairLabor.toFixed(2)} руб.</Text>
            </View>
          </View>
        </View>

        <View style={styles.financeCard}>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Отдельные работы:</Text>
            <Text style={styles.financeValue}>{stats.totalWorkSessions.toFixed(2)} руб.</Text>
          </View>
        </View>

        <View style={styles.financeCard}>
          <View style={styles.financeRow}>
            <Text style={styles.financeLabel}>Стоимость складских запасов:</Text>
            <Text style={styles.financeValue}>{stats.totalPartsValue.toFixed(2)} руб.</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.financeRow}>
            <Text style={styles.totalLabel}>Общие трудозатраты:</Text>
            <Text style={styles.totalValue}>{stats.totalLaborHours.toFixed(1)} часов</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEquipmentTab = () => {
    const equipmentStats = getEquipmentStats();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Статистика по технике</Text>
          
          {equipmentStats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Нет данных по технике</Text>
            </View>
          ) : (
            equipmentStats.map(eq => (
              <View key={eq.id} style={styles.equipmentStatCard}>
                <View style={styles.equipmentHeader}>
                  <Text style={styles.equipmentName}>{eq.type} {eq.model}</Text>
                  {eq.licensePlate && <Text style={styles.equipmentPlate}>({eq.licensePlate})</Text>}
                </View>
                
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemValue}>{eq.totalRepairs}</Text>
                    <Text style={styles.statItemLabel}>Ремонтов</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemValue}>{eq.totalLaborHours.toFixed(1)}</Text>
                    <Text style={styles.statItemLabel}>Часов работы</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemValue}>{eq.totalPartsUsed}</Text>
                    <Text style={styles.statItemLabel}>Запчастей</Text>
                  </View>
                </View>
                
                <View style={styles.costRow}>
                  <Text style={styles.totalCostLabel}>Общая стоимость ремонтов:</Text>
                  <Text style={styles.totalCostValue}>{eq.totalCost.toFixed(2)} руб.</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  const renderStaffTab = () => {
    const staffStats = getStaffStats();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Статистика по персоналу</Text>
          
          {staffStats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Нет данных по персоналу</Text>
            </View>
          ) : (
            staffStats.map(member => (
              <View key={member.id} style={styles.staffStatCard}>
                <View style={styles.staffHeader}>
                  <Text style={styles.staffName}>{member.name}</Text>
                  <Text style={styles.staffPosition}>{member.position}</Text>
                </View>
                
                <View style={styles.staffStats}>
                  <View style={styles.staffStatRow}>
                    <Text style={styles.staffStatLabel}>Общее время:</Text>
                    <Text style={styles.staffStatValue}>{member.totalHours.toFixed(1)} ч.</Text>
                  </View>
                  
                  <View style={styles.staffStatBreakdown}>
                    <View style={styles.staffStatRow}>
                      <Text style={styles.staffStatSubLabel}>• Ремонты:</Text>
                      <Text style={styles.staffStatSubValue}>{member.repairHours.toFixed(1)} ч.</Text>
                    </View>
                    <View style={styles.staffStatRow}>
                      <Text style={styles.staffStatSubLabel}>• Отдельные работы:</Text>
                      <Text style={styles.staffStatSubValue}>{member.sessionHours.toFixed(1)} ч.</Text>
                    </View>
                  </View>
                  
                  <View style={styles.staffTotalRow}>
                    <Text style={styles.staffTotalLabel}>Общая стоимость работ:</Text>
                    <Text style={styles.staffTotalValue}>{member.totalCost.toFixed(2)} руб.</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.safeArea} />
      
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
          style={[styles.tab, activeTab === 'equipment' && styles.activeTab]}
          onPress={() => setActiveTab('equipment')}
        >
          <Text style={[styles.tabText, activeTab === 'equipment' && styles.activeTabText]}>
            Техника
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'staff' && styles.activeTab]}
          onPress={() => setActiveTab('staff')}
        >
          <Text style={[styles.tabText, activeTab === 'staff' && styles.activeTabText]}>
            Персонал
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={styles.dateRangeButton}
            onPress={() => setCustomDateModal(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateRangeButtonText}>
              {dateFrom && dateTo 
                ? `${new Date(dateFrom).toLocaleDateString()} - ${new Date(dateTo).toLocaleDateString()}`
                : 'Выберите период'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'equipment' && renderEquipmentTab()}
        {activeTab === 'staff' && renderStaffTab()}
      </ScrollView>

      {renderCustomDateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  safeArea: {
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
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
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minHeight: 100,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  financeCard: {
    backgroundColor: '#f8f9fa',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 24,
  },
  financeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  financeValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  financeBreakdown: {
    marginLeft: 16,
    marginTop: 8,
  },
  financeSubLabel: {
    fontSize: 14,
    color: '#666',
  },
  financeSubValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  totalCard: {
    backgroundColor: '#e8f4f8',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  equipmentStatCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  equipmentPlate: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  statItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statItemLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
    marginTop: 8,
  },
  totalCostLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  totalCostValue: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: 'bold',
  },
  staffStatCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  staffPosition: {
    fontSize: 14,
    color: '#666',
  },
  staffStats: {},
  staffStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 24,
  },
  staffStatLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  staffStatValue: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  staffStatBreakdown: {
    marginLeft: 20,
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  staffStatSubLabel: {
    fontSize: 12,
    color: '#666',
  },
  staffStatSubValue: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  staffTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
    marginTop: 8,
  },
  staffTotalLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  staffTotalValue: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: 'bold',
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
  content: {
    flex: 1,
  },
  periodSelector: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    minHeight: 52,
  },
  dateRangeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
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
    backgroundColor: '#fff',
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
});