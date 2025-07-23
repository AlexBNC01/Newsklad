import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import BarcodeScanner from '../components/BarcodeScanner';
import { useNavigation } from '@react-navigation/native';

export default function ExpenseScreen() {
  const navigation = useNavigation();
  const { 
    parts, 
    updatePartQuantity, 
    containers, 
    equipment, 
    partBatches,
    getPartBatchesByBarcode,
    updatePartBatchQuantity,
    transactions,
    getThemeColors
  } = useData();
  
  const themeColors = getThemeColors();
  const [activeTab, setActiveTab] = useState('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPart, setSelectedPart] = useState(null);
  const [expenseQuantity, setExpenseQuantity] = useState('');
  const [expenseReason, setExpenseReason] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const availableParts = parts.filter(part => part.quantity > 0);
  const filteredParts = availableParts.filter(part =>
    part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.article.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Получаем все транзакции типа "expense" (списание)
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const sortedExpenseTransactions = expenseTransactions.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const expenseReasons = [
    'Ремонт техники',
    'Продажа',
    'Списание (брак)',
    'Внутреннее использование',
    'Возврат поставщику',
    'Другое',
  ];

  const handleBarcodeScanned = (barcode) => {
    const batches = getPartBatchesByBarcode(barcode);
    
    if (batches.length === 0) {
      Alert.alert('Товар не найден', 'Товар с таким штрих-кодом не найден на складе');
      return;
    }
    
    if (batches.length === 1) {
      const batch = batches[0];
      const relatedPart = parts.find(p => p.barcode === barcode);
      if (relatedPart) {
        setSelectedPart(relatedPart);
        setSelectedBatch(batch);
        setModalVisible(true);
      }
    } else {
      setAvailableBatches(batches);
      setBatchModalVisible(true);
    }
  };

  const handleBatchSelected = (batch) => {
    const relatedPart = parts.find(p => p.barcode === batch.barcode);
    if (relatedPart) {
      setSelectedPart(relatedPart);
      setSelectedBatch(batch);
      setBatchModalVisible(false);
      setModalVisible(true);
    }
  };

  const handleExpense = () => {
    if (!selectedPart || !expenseQuantity || !expenseReason) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (expenseReason === 'Ремонт техники' && !selectedEquipment) {
      Alert.alert('Ошибка', 'Выберите технику для ремонта');
      return;
    }

    const quantity = parseInt(expenseQuantity);
    const maxQuantity = selectedBatch ? selectedBatch.remainingQuantity : selectedPart.quantity;
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Ошибка', 'Количество должно быть положительным числом');
      return;
    }

    if (quantity > maxQuantity) {
      Alert.alert('Ошибка', `Недостаточно товара в выбранной партии. Доступно: ${maxQuantity} шт.`);
      return;
    }

    if (selectedBatch) {
      const newBatchQuantity = selectedBatch.remainingQuantity - quantity;
      updatePartBatchQuantity(selectedBatch.id, newBatchQuantity);
    }

    const newQuantity = selectedPart.quantity - quantity;
    const equipmentInfo = selectedEquipment ? equipment.find(eq => eq.id === selectedEquipment) : null;
    const batchInfo = selectedBatch ? ` (партия: ${selectedBatch.supplier || 'без поставщика'})` : '';
    const description = equipmentInfo 
      ? `${expenseReason}: ${selectedPart.name}${batchInfo} для ${equipmentInfo.type} ${equipmentInfo.model} (${quantity} шт.)`
      : `${expenseReason}: ${selectedPart.name}${batchInfo} (${quantity} шт.)`;

    updatePartQuantity(
      selectedPart.id,
      newQuantity,
      'expense',
      description,
      selectedEquipment || null
    );

    Alert.alert(
      'Успешно',
      `Списано ${quantity} шт. "${selectedPart.name}"\nОстаток: ${newQuantity} шт.`,
      [
        {
          text: 'Продолжить',
          onPress: () => {
            setModalVisible(false);
            setSelectedPart(null);
            setSelectedBatch(null);
            setExpenseQuantity('');
            setExpenseReason('');
            setSelectedEquipment('');
          },
        },
      ]
    );
  };

  const renderPartItem = ({ item }) => (
    <TouchableOpacity
      style={styles.partItem}
      onPress={() => {
        setSelectedPart(item);
        setSelectedBatch(null);
        setModalVisible(true);
      }}
    >
      <View style={styles.partHeader}>
        <Text style={styles.partName}>{item.name}</Text>
        <Text style={styles.partQuantity}>{item.quantity} шт.</Text>
      </View>
      <Text style={styles.partArticle}>Артикул: {item.article}</Text>
      <Text style={styles.partType}>Тип: {item.type}</Text>
      <Text style={styles.partContainer}>
        Контейнер: {containers.find(c => c.id === item.containerId)?.name || 'Не указан'}
      </Text>
    </TouchableOpacity>
  );

  const renderBatchSelectionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={batchModalVisible}
      onRequestClose={() => setBatchModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Выберите партию товара</Text>
            <TouchableOpacity onPress={() => setBatchModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.batchList}>
            {availableBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={styles.batchItem}
                onPress={() => handleBatchSelected(batch)}
              >
                <View style={styles.batchHeader}>
                  <Text style={styles.batchSupplier}>{batch.supplier || 'Поставщик не указан'}</Text>
                  <Text style={styles.batchQuantity}>{batch.remainingQuantity} шт.</Text>
                </View>
                <Text style={styles.batchPrice}>
                  Цена: {batch.price ? `${batch.price} руб.` : 'Не указана'}
                </Text>
                <Text style={styles.batchDate}>
                  Дата поставки: {new Date(batch.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderExpenseModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Списание запчасти</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedPart && (
            <View style={styles.selectedPartInfo}>
              <Text style={styles.selectedPartName}>{selectedPart.name}</Text>
              <Text style={styles.selectedPartDetails}>
                Артикул: {selectedPart.article} • Доступно: {selectedPart.quantity} шт.
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Количество для списания</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите количество"
              value={expenseQuantity}
              onChangeText={setExpenseQuantity}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Причина списания</Text>
            <View style={styles.reasonContainer}>
              {expenseReasons.map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonButton,
                    expenseReason === reason && styles.reasonButtonActive,
                  ]}
                  onPress={() => {
                    setExpenseReason(reason);
                    if (reason !== 'Ремонт техники') {
                      setSelectedEquipment('');
                    }
                  }}
                >
                  <Text style={[
                    styles.reasonButtonText,
                    expenseReason === reason && styles.reasonButtonTextActive,
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {expenseReason === 'Ремонт техники' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Выберите технику *</Text>
              <View style={styles.equipmentContainer}>
                {equipment.map(eq => (
                  <TouchableOpacity
                    key={eq.id}
                    style={[
                      styles.equipmentButton,
                      selectedEquipment === eq.id && styles.equipmentButtonActive,
                    ]}
                    onPress={() => setSelectedEquipment(eq.id)}
                  >
                    <Text style={[
                      styles.equipmentButtonText,
                      selectedEquipment === eq.id && styles.equipmentButtonTextActive,
                    ]}>
                      {eq.type} {eq.model}
                    </Text>
                    <Text style={[
                      styles.equipmentSerial,
                      selectedEquipment === eq.id && styles.equipmentSerialActive,
                    ]}>
                      {eq.serialNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {equipment.length === 0 && (
                <Text style={styles.noEquipmentText}>
                  Техника не добавлена. Перейдите в раздел "Ремонт" для добавления техники.
                </Text>
              )}
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleExpense}
            >
              <Text style={styles.confirmButtonText}>Списать</Text>
            </TouchableOpacity>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderExpenseTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск запчастей для списания..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredParts}
        renderItem={renderPartItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет доступных запчастей</Text>
            <Text style={styles.emptySubtext}>
              {parts.length === 0 
                ? 'Добавьте запчасти через раздел "Приход"'
                : 'Все запчасти закончились или не найдены по запросу'
              }
            </Text>
          </View>
        }
      />
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>История списаний</Text>
        <Text style={styles.historySubtitle}>Всего операций: {expenseTransactions.length}</Text>
      </View>

      {sortedExpenseTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Нет истории списаний</Text>
          <Text style={styles.emptySubtext}>
            История операций появится после первого списания
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedExpenseTransactions}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderHistoryItem = ({ item }) => {
    const part = parts.find(p => p.id === item.partId);
    const equipmentInfo = item.equipmentId ? equipment.find(eq => eq.id === item.equipmentId) : null;
    const partCost = part && part.price ? part.price * item.quantity : 0;

    return (
      <TouchableOpacity 
        style={styles.historyItem}
        onPress={() => {
          if (part) {
            navigation.navigate('PartDetail', { partId: part.id });
          }
        }}
      >
        <View style={styles.historyItemHeader}>
          <Text style={styles.historyPartName}>{item.partName}</Text>
          <Text style={styles.historyDate}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.historyItemBody}>
          <View style={styles.historyDetail}>
            <Ionicons name="layers-outline" size={16} color="#666" />
            <Text style={styles.historyDetailText}>
              Количество: {item.quantity} шт.
            </Text>
          </View>
          
          {partCost > 0 && (
            <View style={styles.historyDetail}>
              <Ionicons name="card-outline" size={16} color="#666" />
              <Text style={styles.historyDetailText}>
                Стоимость: {partCost.toFixed(2)} руб.
              </Text>
            </View>
          )}
          
          {equipmentInfo && (
            <View style={styles.historyDetail}>
              <Ionicons name="construct-outline" size={16} color="#666" />
              <Text style={styles.historyDetailText}>
                Техника: {equipmentInfo.type} {equipmentInfo.model}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.historyDescription}>{item.description}</Text>
        
        <View style={styles.historyFooter}>
          <Text style={styles.historyTime}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
          <Text style={styles.historyDevice}>{item.device}</Text>
        </View>
        
        {part && (
          <View style={styles.partFooter}>
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
            <Text style={styles.detailsText}>Подробная информация</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerLeft: {
      flex: 1,
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
    scanButton: {
      backgroundColor: themeColors.primary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerLeft}>
          <Text style={dynamicStyles.title}>Расход</Text>
          <Text style={dynamicStyles.subtitle}>Списание запчастей со склада</Text>
        </View>
        <TouchableOpacity 
          style={dynamicStyles.scanButton}
          onPress={() => setScannerVisible(true)}
        >
          <Ionicons name="scan" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[styles.tabText, activeTab === 'expense' && styles.activeTabText]}>
            Списание
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
      </View>

      {activeTab === 'expense' ? renderExpenseTab() : renderHistoryTab()}

      {renderExpenseModal()}
      {renderBatchSelectionModal()}
      
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleBarcodeScanned}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  partItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  partQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34C759',
  },
  partArticle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  partType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  partContainer: {
    fontSize: 14,
    color: '#666',
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedPartInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectedPartName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  selectedPartDetails: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  reasonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reasonButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reasonButtonText: {
    fontSize: 14,
    color: '#666',
  },
  reasonButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    marginLeft: 8,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  equipmentContainer: {
    gap: 8,
  },
  equipmentButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  equipmentButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  equipmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  equipmentButtonTextActive: {
    color: '#fff',
  },
  equipmentSerial: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  equipmentSerialActive: {
    color: '#E6F3FF',
  },
  noEquipmentText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  headerLeft: {
    flex: 1,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchList: {
    maxHeight: 400,
  },
  batchItem: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchSupplier: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  batchQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  batchPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  batchDate: {
    fontSize: 12,
    color: '#888',
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
  historyHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  historySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  historyItem: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyPartName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  historyItemBody: {
    marginBottom: 12,
  },
  historyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  historyDescription: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  historyDevice: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  partFooter: {
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
});