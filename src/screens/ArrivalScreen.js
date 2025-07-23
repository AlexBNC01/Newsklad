import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import ImagePickerComponent from '../components/ImagePicker';
import BarcodeScanner from '../components/BarcodeScanner';
import DynamicFormField from '../components/DynamicFormField';
import { useNavigation } from '@react-navigation/native';

export default function ArrivalScreen() {
  const navigation = useNavigation();
  const { 
    addPart, 
    containers, 
    findPartTemplateByBarcode, 
    addOrUpdatePartTemplate, 
    addPartBatch,
    getEnabledArrivalFields,
    transactions,
    parts
  } = useData();
  const [activeTab, setActiveTab] = useState('arrival');
  const [formData, setFormData] = useState({
    photos: [],
    barcode: '',
  });
  const [scannerVisible, setScannerVisible] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const enabledFields = getEnabledArrivalFields();

  // Получаем все транзакции типа "arrival" (поступление)
  const arrivalTransactions = transactions.filter(t => t.type === 'arrival');
  const sortedArrivalTransactions = arrivalTransactions.sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBarcodeScanned = (barcode) => {
    const template = findPartTemplateByBarcode(barcode);
    
    if (template) {
      const newFormData = { ...formData, barcode: barcode };
      enabledFields.forEach(field => {
        if (template[field.name]) {
          newFormData[field.name] = template[field.name];
        }
      });
      setFormData(newFormData);
      Alert.alert(
        'Товар найден',
        `Найден товар "${template.name}". Заполните недостающие поля.`
      );
    } else {
      setFormData(prev => ({
        ...prev,
        barcode: barcode,
      }));
      Alert.alert(
        'Новый товар',
        'Товар с таким штрих-кодом не найден. Заполните все поля для создания нового товара.'
      );
    }
  };

  const validateForm = () => {
    const errors = {};
    
    enabledFields.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} обязательно для заполнения`;
      }
      
      if (field.type === 'number' && formData[field.name]) {
        const value = parseFloat(formData[field.name]);
        if (isNaN(value) || value < 0) {
          errors[field.name] = `${field.label} должно быть положительным числом`;
        }
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      Alert.alert('Ошибка', 'Исправьте ошибки в форме');
      return;
    }

    if (formData.barcode) {
      const templateData = {
        barcode: formData.barcode,
        name: formData.name,
        article: formData.article,
        type: formData.type || 'Другое',
        description: formData.description,
      };
      addOrUpdatePartTemplate(templateData);

      const batchData = {
        barcode: formData.barcode,
        supplier: formData.supplier,
        price: formData.price ? parseFloat(formData.price) : 0,
        quantity: formData.quantity ? parseFloat(formData.quantity) : 0,
        containerId: formData.containerId,
        photos: formData.photos?.map(photo => typeof photo === 'string' ? photo : photo.uri) || [],
      };
      addPartBatch(batchData);
    }

    const part = {
      ...formData,
      quantity: formData.quantity ? parseFloat(formData.quantity) : 0,
      price: formData.price ? parseFloat(formData.price) : 0,
      type: formData.type || 'Другое',
      photos: formData.photos?.map(photo => typeof photo === 'string' ? photo : photo.uri) || [],
    };

    addPart(part);
    
    Alert.alert(
      'Успешно',
      `Запчасть "${formData.name}" добавлена на склад`,
      [
        {
          text: 'Добавить еще',
          onPress: () => {
            const newFormData = { photos: [], barcode: '' };
            enabledFields.forEach(field => {
              if (field.name === 'type' || field.name === 'containerId' || field.name === 'supplier') {
                newFormData[field.name] = formData[field.name];
              } else {
                newFormData[field.name] = '';
              }
            });
            setFormData(newFormData);
            setFormErrors({});
          },
        },
        {
          text: 'Готово',
          onPress: () => {
            const newFormData = { photos: [], barcode: '' };
            enabledFields.forEach(field => {
              newFormData[field.name] = '';
            });
            setFormData(newFormData);
            setFormErrors({});
          },
        },
      ]
    );
  };

  const renderArrivalTab = () => (
    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Штрих-код / QR-код</Text>
        <View style={styles.barcodeContainer}>
          <TextInput
            style={[styles.input, styles.barcodeInput]}
            placeholder="Отсканируйте или введите штрих-код"
            value={formData.barcode}
            onChangeText={value => handleInputChange('barcode', value)}
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setScannerVisible(true)}
          >
            <Ionicons name="scan" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {enabledFields.map(field => (
        <DynamicFormField
          key={field.id}
          field={field}
          value={formData[field.name]}
          onValueChange={value => handleInputChange(field.name, value)}
          containers={containers}
          error={formErrors[field.name]}
        />
      ))}

      <ImagePickerComponent
        photos={formData.photos}
        onPhotosChange={photos => handleInputChange('photos', photos)}
        maxPhotos={3}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.submitButtonText}>Добавить на склад</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>История поступлений</Text>
        <Text style={styles.historySubtitle}>Всего операций: {arrivalTransactions.length}</Text>
      </View>

      {sortedArrivalTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Нет истории поступлений</Text>
          <Text style={styles.emptySubtext}>
            История операций появится после первого добавления запчасти
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedArrivalTransactions}
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
          
          {part && part.type && (
            <View style={styles.historyDetail}>
              <Ionicons name="pricetag-outline" size={16} color="#666" />
              <Text style={styles.historyDetailText}>
                Тип: {part.type}
              </Text>
            </View>
          )}
          
          {part && part.article && (
            <View style={styles.historyDetail}>
              <Ionicons name="barcode-outline" size={16} color="#666" />
              <Text style={styles.historyDetailText}>
                Артикул: {part.article}
              </Text>
            </View>
          )}
          
          {part && part.containerId && (
            <View style={styles.historyDetail}>
              <Ionicons name="cube-outline" size={16} color="#666" />
              <Text style={styles.historyDetailText}>
                Контейнер: {containers.find(c => c.id === part.containerId)?.name || 'Не указан'}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Приход</Text>
        <Text style={styles.subtitle}>Добавление и история поступлений</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'arrival' && styles.activeTab]}
          onPress={() => setActiveTab('arrival')}
        >
          <Text style={[styles.tabText, activeTab === 'arrival' && styles.activeTabText]}>
            Приход
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

      {activeTab === 'arrival' ? (
        <KeyboardAvoidingView 
          style={styles.tabContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {renderArrivalTab()}
        </KeyboardAvoidingView>
      ) : (
        renderHistoryTab()
      )}
      
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
  form: {
    flex: 1,
    padding: 16,
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
  typeScroll: {
    flexDirection: 'row',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpace: {
    height: 40,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeInput: {
    flex: 1,
    marginRight: 8,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
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