import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function PartDetailScreen({ route, navigation }) {
  const { partId } = route.params;
  const { 
    parts, 
    containers, 
    transactions, 
    partBatches, 
    updatePartQuantity,
    parts: allParts 
  } = useData();

  const [activeTab, setActiveTab] = useState('overview');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({});

  const part = parts.find(p => p.id === partId);
  const container = containers.find(c => c.id === part?.containerId);
  
  // Получаем все транзакции связанные с этой запчастью
  const partTransactions = transactions.filter(t => t.partId === partId);
  const sortedTransactions = partTransactions.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Получаем все партии этой запчасти (если есть штрих-код)
  const relatedBatches = part?.barcode 
    ? partBatches.filter(batch => batch.barcode === part.barcode)
    : [];

  if (!part) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Товар не найден</Text>
        </View>
      </View>
    );
  }

  const handleEdit = () => {
    setEditData({
      quantity: part.quantity?.toString() || '',
      price: part.price?.toString() || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    const newQuantity = editData.quantity ? parseFloat(editData.quantity) : part.quantity;
    const newPrice = editData.price ? parseFloat(editData.price) : part.price;
    
    // Обновляем количество через систему транзакций
    if (newQuantity !== part.quantity) {
      const difference = newQuantity - part.quantity;
      const transactionType = difference > 0 ? 'arrival' : 'expense';
      const description = difference > 0 
        ? `Корректировка количества: добавлено ${Math.abs(difference)} шт.`
        : `Корректировка количества: убрано ${Math.abs(difference)} шт.`;
      
      updatePartQuantity(partId, newQuantity, transactionType, description);
    }
    
    // Обновляем цену напрямую (нужно добавить функцию в DataContext)
    if (newPrice !== part.price) {
      // Временно обновляем через прямое обращение к части
      const updatedParts = allParts.map(p => 
        p.id === partId ? { ...p, price: newPrice } : p
      );
      // Нужно будет добавить функцию updatePartPrice в DataContext
    }
    
    setEditModalVisible(false);
    Alert.alert('Успешно', 'Данные товара обновлены');
  };

  const getStockStatus = () => {
    if (part.quantity === 0) return { text: 'Нет в наличии', color: '#FF3B30' };
    if (part.quantity < 5) return { text: 'Заканчивается', color: '#FF9500' };
    return { text: 'В наличии', color: '#34C759' };
  };

  const stockStatus = getStockStatus();

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Основная информация */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Основная информация</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Название</Text>
            <Text style={styles.infoValue}>{part.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Артикул</Text>
            <Text style={styles.infoValue}>{part.article}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Тип</Text>
            <Text style={styles.infoValue}>{part.type || 'Не указан'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Штрих-код</Text>
            <Text style={styles.infoValue}>{part.barcode || 'Нет'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Контейнер</Text>
            <Text style={styles.infoValue}>{container?.name || 'Не указан'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Расположение</Text>
            <Text style={styles.infoValue}>{container?.location || 'Не указано'}</Text>
          </View>
        </View>

        {part.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.infoLabel}>Описание</Text>
            <Text style={styles.descriptionText}>{part.description}</Text>
          </View>
        )}
      </View>

      {/* Складская информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Складская информация</Text>
        <View style={styles.stockGrid}>
          <View style={styles.stockCard}>
            <Ionicons name="cube-outline" size={32} color="#007AFF" />
            <Text style={styles.stockValue}>{part.quantity}</Text>
            <Text style={styles.stockLabel}>Количество (шт.)</Text>
          </View>
          <View style={styles.stockCard}>
            <Ionicons name="pricetag-outline" size={32} color="#34C759" />
            <Text style={styles.stockValue}>
              {part.price ? `${part.price.toFixed(2)}` : 'Не указана'}
            </Text>
            <Text style={styles.stockLabel}>Цена за штуку (руб.)</Text>
          </View>
          <View style={styles.stockCard}>
            <Ionicons name="calculator-outline" size={32} color="#FF9500" />
            <Text style={styles.stockValue}>
              {part.price ? `${(part.quantity * part.price).toFixed(2)}` : 'Не указана'}
            </Text>
            <Text style={styles.stockLabel}>Общая стоимость (руб.)</Text>
          </View>
          <View style={styles.stockCard}>
            <View style={[styles.statusIndicator, { backgroundColor: stockStatus.color }]} />
            <Text style={[styles.stockValue, { color: stockStatus.color }]}>
              {stockStatus.text}
            </Text>
            <Text style={styles.stockLabel}>Статус наличия</Text>
          </View>
        </View>
      </View>

      {/* Партии товара */}
      {relatedBatches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Партии товара</Text>
          {relatedBatches.map(batch => (
            <View key={batch.id} style={styles.batchItem}>
              <View style={styles.batchHeader}>
                <Text style={styles.batchSupplier}>
                  {batch.supplier || 'Поставщик не указан'}
                </Text>
                <Text style={styles.batchQuantity}>
                  {batch.remainingQuantity} / {batch.quantity} шт.
                </Text>
              </View>
              <View style={styles.batchDetails}>
                <Text style={styles.batchPrice}>
                  Цена: {batch.price ? `${batch.price} руб/шт` : 'Не указана'}
                </Text>
                <Text style={styles.batchDate}>
                  Дата поставки: {new Date(batch.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Фотографии */}
      {part.photos && part.photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Фотографии</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photosContainer}>
              {part.photos.map((photo, index) => (
                <Image 
                  key={index} 
                  source={{ uri: typeof photo === 'string' ? photo : photo.uri }} 
                  style={styles.photo} 
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>История операций</Text>
        <Text style={styles.historySubtitle}>Всего операций: {partTransactions.length}</Text>
      </View>

      {sortedTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Нет истории операций</Text>
          <Text style={styles.emptySubtext}>
            История операций появится после первых движений товара
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedTransactions}
          renderItem={renderHistoryItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderHistoryItem = ({ item }) => {
    const isExpense = item.type === 'expense';
    const borderColor = isExpense ? '#FF3B30' : '#34C759';
    const iconName = isExpense ? 'remove-circle-outline' : 'add-circle-outline';
    const quantityText = isExpense ? `-${item.quantity}` : `+${item.quantity}`;
    const typeText = isExpense ? 'Списание' : 'Поступление';

    return (
      <View style={[styles.historyItem, { borderLeftColor: borderColor }]}>
        <View style={styles.historyItemHeader}>
          <View style={styles.historyTypeContainer}>
            <Ionicons name={iconName} size={20} color={borderColor} />
            <Text style={[styles.historyType, { color: borderColor }]}>{typeText}</Text>
          </View>
          <Text style={styles.historyDate}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.historyItemBody}>
          <View style={styles.historyDetail}>
            <Ionicons name="layers-outline" size={16} color="#666" />
            <Text style={[styles.historyDetailText, { color: borderColor, fontWeight: '600' }]}>
              Количество: {quantityText} шт.
            </Text>
          </View>
          
          {part.price && (
            <View style={styles.historyDetail}>
              <Ionicons name="card-outline" size={16} color="#666" />
              <Text style={styles.historyDetailText}>
                Стоимость: {(part.price * item.quantity).toFixed(2)} руб.
              </Text>
            </View>
          )}
          
          {item.equipmentId && (
            <View style={styles.historyDetail}>
              <Ionicons name="construct-outline" size={16} color="#666" />
              <Text style={styles.historyDetailText}>
                Связано с техникой
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
      </View>
    );
  };

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
            <Text style={styles.modalTitle}>Редактировать товар</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Количество (шт.)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={editData.quantity}
                onChangeText={value => setEditData(prev => ({ ...prev, quantity: value }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Цена за штуку (руб.)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={editData.price}
                onChangeText={value => setEditData(prev => ({ ...prev, price: value }))}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{part.name}</Text>
          <Text style={styles.subtitle}>
            {part.article} • {part.quantity} шт.
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
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            История
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' ? renderOverviewTab() : renderHistoryTab()}

      {renderEditModal()}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
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
    fontSize: 18,
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
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stockCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  stockLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 8,
  },
  batchItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchSupplier: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  batchQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  batchDetails: {
    gap: 4,
  },
  batchPrice: {
    fontSize: 12,
    color: '#666',
  },
  batchDate: {
    fontSize: 12,
    color: '#666',
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
  listContainer: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: '#fff',
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyType: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
});