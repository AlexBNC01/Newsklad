import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [parts, setParts] = useState([]);
  const [partTemplates, setPartTemplates] = useState([]);
  const [partBatches, setPartBatches] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [arrivalFields, setArrivalFields] = useState([
    { id: '1', name: 'name', label: 'Название', type: 'text', required: true, enabled: true, order: 1 },
    { id: '2', name: 'article', label: 'Артикул', type: 'text', required: true, enabled: true, order: 2 },
    { id: '3', name: 'type', label: 'Тип запчасти', type: 'select', required: false, enabled: true, order: 3, options: ['Двигатель', 'Трансмиссия', 'Гидравлика', 'Электрика', 'Кузов', 'Ходовая', 'Кабина', 'Другое'] },
    { id: '4', name: 'quantity', label: 'Количество', type: 'number', required: true, enabled: true, order: 4 },
    { id: '5', name: 'containerId', label: 'Контейнер', type: 'container', required: true, enabled: true, order: 5 },
    { id: '6', name: 'supplier', label: 'Поставщик', type: 'text', required: false, enabled: true, order: 6 },
    { id: '7', name: 'price', label: 'Цена (руб.)', type: 'number', required: false, enabled: true, order: 7 },
    { id: '8', name: 'description', label: 'Описание', type: 'textarea', required: false, enabled: true, order: 8 },
    { id: '9', name: 'weight', label: 'Вес (кг)', type: 'number', required: false, enabled: false, order: 9 },
    { id: '10', name: 'brand', label: 'Производитель', type: 'text', required: false, enabled: false, order: 10 },
    { id: '11', name: 'warranty', label: 'Гарантия (мес.)', type: 'number', required: false, enabled: false, order: 11 },
  ]);
  const [expenseFields, setExpenseFields] = useState([
    { id: '1', name: 'reason', label: 'Причина списания', type: 'select', required: true, enabled: true, order: 1, options: ['Ремонт техники', 'Продажа', 'Списание (брак)', 'Внутреннее использование', 'Возврат поставщику', 'Другое'] },
    { id: '2', name: 'quantity', label: 'Количество', type: 'number', required: true, enabled: true, order: 2 },
    { id: '3', name: 'equipment', label: 'Техника', type: 'equipment', required: false, enabled: true, order: 3 },
    { id: '4', name: 'notes', label: 'Примечания', type: 'textarea', required: false, enabled: false, order: 4 },
    { id: '5', name: 'cost', label: 'Стоимость списания', type: 'number', required: false, enabled: false, order: 5 },
    { id: '6', name: 'recipient', label: 'Получатель', type: 'text', required: false, enabled: false, order: 6 },
  ]);
  const [equipment, setEquipment] = useState([
    {
      id: '1',
      type: 'Трактор',
      model: 'МТЗ-82',
      serialNumber: 'МТЗ123456',
      licensePlate: 'A123BC77',
      year: '2018',
      status: 'Исправен',
      engineHours: 1250,
      mileage: 45000,
      photos: [],
    },
    {
      id: '2',
      type: 'КамАЗ',
      model: 'КамАЗ-5320',
      serialNumber: 'КАМ789012',
      licensePlate: 'В456ЕК99',
      year: '2020',
      status: 'В ремонте',
      engineHours: 950,
      mileage: 78000,
      photos: [],
    },
  ]);
  const [repairProcesses, setRepairProcesses] = useState([]);
  const [staff, setStaff] = useState([
    {
      id: '1',
      name: 'Иван Петров',
      position: 'Слесарь',
      hourlyRate: 500,
      phone: '+7 (999) 123-45-67',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Сергей Сидоров',
      position: 'Механик',
      hourlyRate: 600,
      phone: '+7 (999) 234-56-78',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [workSessions, setWorkSessions] = useState([]);
  const [containers, setContainers] = useState([
    { id: '1', name: 'Контейнер А1', location: 'Зона А', description: 'Основной склад' },
    { id: '2', name: 'Контейнер Б1', location: 'Зона Б', description: 'Запасы тракторов' },
    { id: '3', name: 'Контейнер В1', location: 'Зона В', description: 'Запасы КамАЗ' },
  ]);
  const [partTypes, setPartTypes] = useState([
    { id: '1', name: 'Двигатель', order: 1 },
    { id: '2', name: 'Трансмиссия', order: 2 },
    { id: '3', name: 'Гидравлика', order: 3 },
    { id: '4', name: 'Электрика', order: 4 },
    { id: '5', name: 'Кузов', order: 5 },
    { id: '6', name: 'Ходовая', order: 6 },
    { id: '7', name: 'Кабина', order: 7 },
    { id: '8', name: 'Другое', order: 8 },
  ]);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const partsData = await AsyncStorage.getItem('parts');
      const partTemplatesData = await AsyncStorage.getItem('partTemplates');
      const partBatchesData = await AsyncStorage.getItem('partBatches');
      const transactionsData = await AsyncStorage.getItem('transactions');
      const equipmentData = await AsyncStorage.getItem('equipment');
      const staffData = await AsyncStorage.getItem('staff');
      const workSessionsData = await AsyncStorage.getItem('workSessions');
      const containersData = await AsyncStorage.getItem('containers');
      const arrivalFieldsData = await AsyncStorage.getItem('arrivalFields');
      const expenseFieldsData = await AsyncStorage.getItem('expenseFields');
      const repairProcessesData = await AsyncStorage.getItem('repairProcesses');
      const partTypesData = await AsyncStorage.getItem('partTypes');
      const themeData = await AsyncStorage.getItem('isDarkTheme');
      
      if (partsData) setParts(JSON.parse(partsData));
      if (partTemplatesData) setPartTemplates(JSON.parse(partTemplatesData));
      if (partBatchesData) setPartBatches(JSON.parse(partBatchesData));
      if (transactionsData) setTransactions(JSON.parse(transactionsData));
      if (equipmentData) setEquipment(JSON.parse(equipmentData));
      if (staffData) setStaff(JSON.parse(staffData));
      if (workSessionsData) setWorkSessions(JSON.parse(workSessionsData));
      if (containersData) setContainers(JSON.parse(containersData));
      if (arrivalFieldsData) setArrivalFields(JSON.parse(arrivalFieldsData));
      if (expenseFieldsData) setExpenseFields(JSON.parse(expenseFieldsData));
      if (repairProcessesData) setRepairProcesses(JSON.parse(repairProcessesData));
      if (partTypesData) setPartTypes(JSON.parse(partTypesData));
      if (themeData) setIsDarkTheme(JSON.parse(themeData));
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const saveData = async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Ошибка сохранения данных:', error);
    }
  };

  const findPartTemplateByBarcode = (barcode) => {
    return partTemplates.find(template => template.barcode === barcode);
  };

  const addOrUpdatePartTemplate = (templateData) => {
    const existingTemplate = partTemplates.find(t => t.barcode === templateData.barcode);
    let updatedTemplates;
    
    if (existingTemplate) {
      updatedTemplates = partTemplates.map(t => 
        t.barcode === templateData.barcode ? { ...t, ...templateData } : t
      );
    } else {
      const newTemplate = {
        ...templateData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      updatedTemplates = [...partTemplates, newTemplate];
    }
    
    setPartTemplates(updatedTemplates);
    saveData('partTemplates', updatedTemplates);
    return updatedTemplates.find(t => t.barcode === templateData.barcode);
  };

  const addPartBatch = (batchData) => {
    const newBatch = {
      ...batchData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      remainingQuantity: batchData.quantity,
    };
    const updatedBatches = [...partBatches, newBatch];
    setPartBatches(updatedBatches);
    saveData('partBatches', updatedBatches);
    return newBatch;
  };

  const getPartBatchesByBarcode = (barcode) => {
    return partBatches.filter(batch => batch.barcode === barcode && batch.remainingQuantity > 0);
  };

  const updatePartBatchQuantity = (batchId, newQuantity) => {
    const updatedBatches = partBatches.map(batch => 
      batch.id === batchId ? { ...batch, remainingQuantity: newQuantity } : batch
    );
    setPartBatches(updatedBatches);
    saveData('partBatches', updatedBatches);
  };

  const addPart = (part) => {
    const newPart = {
      ...part,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      photos: part.photos || [],
    };
    const updatedParts = [...parts, newPart];
    setParts(updatedParts);
    saveData('parts', updatedParts);

    addTransaction({
      type: 'arrival',
      partId: newPart.id,
      partName: newPart.name,
      quantity: newPart.quantity,
      description: `Добавлена запчасть: ${newPart.name}`,
    });
  };

  const updatePartQuantity = (partId, newQuantity, transactionType, description, equipmentId = null) => {
    const updatedParts = parts.map(part => 
      part.id === partId ? { ...part, quantity: newQuantity } : part
    );
    setParts(updatedParts);
    saveData('parts', updatedParts);

    const part = parts.find(p => p.id === partId);
    if (part) {
      addTransaction({
        type: transactionType,
        partId: partId,
        partName: part.name,
        quantity: Math.abs(part.quantity - newQuantity),
        description: description || `${transactionType === 'expense' ? 'Списание' : 'Поступление'}: ${part.name}`,
        equipmentId: equipmentId,
      });
    }
  };

  const addTransaction = (transaction) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      device: 'Mobile App',
    };
    const updatedTransactions = [...transactions, newTransaction];
    setTransactions(updatedTransactions);
    saveData('transactions', updatedTransactions);
  };

  const addEquipment = (equipmentData) => {
    const newEquipment = {
      ...equipmentData,
      id: Date.now().toString(),
      status: 'Исправен',
      engineHours: equipmentData.engineHours ? parseFloat(equipmentData.engineHours) : 0,
      mileage: equipmentData.mileage ? parseFloat(equipmentData.mileage) : 0,
      licensePlate: equipmentData.licensePlate || '',
      createdAt: new Date().toISOString(),
      photos: equipmentData.photos || [],
    };
    const updatedEquipment = [...equipment, newEquipment];
    setEquipment(updatedEquipment);
    saveData('equipment', updatedEquipment);
    return newEquipment;
  };

  const updateEquipment = (equipmentId, updates) => {
    const updatedEquipment = equipment.map(eq => 
      eq.id === equipmentId ? { ...eq, ...updates } : eq
    );
    setEquipment(updatedEquipment);
    saveData('equipment', updatedEquipment);
  };

  const addContainer = (containerData) => {
    const newContainer = {
      ...containerData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updatedContainers = [...containers, newContainer];
    setContainers(updatedContainers);
    saveData('containers', updatedContainers);
    return newContainer;
  };

  const updateContainer = (containerId, updates) => {
    const updatedContainers = containers.map(container => 
      container.id === containerId ? { ...container, ...updates } : container
    );
    setContainers(updatedContainers);
    saveData('containers', updatedContainers);
  };

  const deleteContainer = (containerId) => {
    const updatedContainers = containers.filter(container => container.id !== containerId);
    setContainers(updatedContainers);
    saveData('containers', updatedContainers);
    
    const updatedParts = parts.map(part => 
      part.containerId === containerId ? { ...part, containerId: null } : part
    );
    setParts(updatedParts);
    saveData('parts', updatedParts);
  };

  const updateArrivalField = (fieldId, updates) => {
    const updatedFields = arrivalFields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setArrivalFields(updatedFields);
    saveData('arrivalFields', updatedFields);
  };

  const updateExpenseField = (fieldId, updates) => {
    const updatedFields = expenseFields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setExpenseFields(updatedFields);
    saveData('expenseFields', updatedFields);
  };

  const addArrivalField = (fieldData) => {
    const newField = {
      ...fieldData,
      id: Date.now().toString(),
      order: arrivalFields.length + 1,
    };
    const updatedFields = [...arrivalFields, newField];
    setArrivalFields(updatedFields);
    saveData('arrivalFields', updatedFields);
    return newField;
  };

  const addExpenseField = (fieldData) => {
    const newField = {
      ...fieldData,
      id: Date.now().toString(),
      order: expenseFields.length + 1,
    };
    const updatedFields = [...expenseFields, newField];
    setExpenseFields(updatedFields);
    saveData('expenseFields', updatedFields);
    return newField;
  };

  const deleteArrivalField = (fieldId) => {
    const updatedFields = arrivalFields.filter(field => field.id !== fieldId);
    setArrivalFields(updatedFields);
    saveData('arrivalFields', updatedFields);
  };

  const deleteExpenseField = (fieldId) => {
    const updatedFields = expenseFields.filter(field => field.id !== fieldId);
    setExpenseFields(updatedFields);
    saveData('expenseFields', updatedFields);
  };

  const getEnabledArrivalFields = () => {
    return arrivalFields.filter(field => field.enabled).sort((a, b) => a.order - b.order);
  };

  const getEnabledExpenseFields = () => {
    return expenseFields.filter(field => field.enabled).sort((a, b) => a.order - b.order);
  };

  const startRepairProcess = (repairData) => {
    const newRepair = {
      ...repairData,
      id: Date.now().toString(),
      status: 'В процессе',
      startDate: new Date().toISOString(),
      parts: [],
      staff: [],
      totalCost: 0,
      laborCost: 0,
      createdAt: new Date().toISOString(),
    };
    
    const updatedProcesses = [...repairProcesses, newRepair];
    setRepairProcesses(updatedProcesses);
    saveData('repairProcesses', updatedProcesses);
    
    updateEquipment(repairData.equipmentId, { status: 'В ремонте' });
    
    return newRepair;
  };

  const addPartToRepair = (repairId, partId, quantity, description = '') => {
    const part = parts.find(p => p.id === partId);
    if (!part || part.quantity < quantity) {
      return false;
    }

    const repairPart = {
      id: Date.now().toString(),
      partId: partId,
      partName: part.name,
      partArticle: part.article,
      quantity: quantity,
      unitPrice: part.price || 0,
      totalPrice: (part.price || 0) * quantity,
      addedAt: new Date().toISOString(),
      description: description,
    };

    const updatedProcesses = repairProcesses.map(repair => {
      if (repair.id === repairId) {
        const updatedParts = [...repair.parts, repairPart];
        const partsCost = updatedParts.reduce((sum, p) => sum + p.totalPrice, 0);
        const laborCost = repair.staff?.reduce((sum, s) => sum + s.laborCost, 0) || 0;
        const totalCost = partsCost + laborCost;
        return { ...repair, parts: updatedParts, totalCost };
      }
      return repair;
    });

    setRepairProcesses(updatedProcesses);
    saveData('repairProcesses', updatedProcesses);

    const repair = repairProcesses.find(r => r.id === repairId);
    const newQuantity = part.quantity - quantity;
    updatePartQuantity(
      partId,
      newQuantity,
      'expense',
      `Использовано в ремонте: ${part.name} (${quantity} шт.) - ${description}`,
      repair?.equipmentId
    );

    return true;
  };

  const removePartFromRepair = (repairId, repairPartId) => {
    const repair = repairProcesses.find(r => r.id === repairId);
    const repairPart = repair?.parts.find(p => p.id === repairPartId);
    
    if (!repair || !repairPart) return false;

    const updatedProcesses = repairProcesses.map(r => {
      if (r.id === repairId) {
        const updatedParts = r.parts.filter(p => p.id !== repairPartId);
        const partsCost = updatedParts.reduce((sum, p) => sum + p.totalPrice, 0);
        const laborCost = r.staff?.reduce((sum, s) => sum + s.laborCost, 0) || 0;
        const totalCost = partsCost + laborCost;
        return { ...r, parts: updatedParts, totalCost };
      }
      return r;
    });

    setRepairProcesses(updatedProcesses);
    saveData('repairProcesses', updatedProcesses);

    const part = parts.find(p => p.id === repairPart.partId);
    if (part) {
      const newQuantity = part.quantity + repairPart.quantity;
      updatePartQuantity(
        repairPart.partId,
        newQuantity,
        'arrival',
        `Возвращено со склада после отмены использования в ремонте: ${repairPart.partName} (${repairPart.quantity} шт.)`,
        repair.equipmentId
      );
    }

    return true;
  };

  const completeRepairProcess = (repairId, completionData) => {
    const updatedProcesses = repairProcesses.map(repair => {
      if (repair.id === repairId) {
        return {
          ...repair,
          status: 'Завершен',
          endDate: new Date().toISOString(),
          completionNotes: completionData.notes || '',
          finalCost: completionData.finalCost || repair.totalCost,
          completionEngineHours: completionData.engineHours,
          completionMileage: completionData.mileage,
        };
      }
      return repair;
    });

    setRepairProcesses(updatedProcesses);
    saveData('repairProcesses', updatedProcesses);

    const repair = repairProcesses.find(r => r.id === repairId);
    if (repair) {
      const equipmentUpdates = { status: 'Исправен' };
      if (completionData.engineHours !== null && completionData.engineHours !== undefined) {
        equipmentUpdates.engineHours = completionData.engineHours;
      }
      if (completionData.mileage !== null && completionData.mileage !== undefined) {
        equipmentUpdates.mileage = completionData.mileage;
      }
      updateEquipment(repair.equipmentId, equipmentUpdates);
    }

    return true;
  };

  const getActiveRepairs = () => {
    return repairProcesses.filter(repair => repair.status === 'В процессе');
  };

  const getCompletedRepairs = () => {
    return repairProcesses.filter(repair => repair.status === 'Завершен');
  };

  const getRepairsByEquipment = (equipmentId) => {
    return repairProcesses.filter(repair => repair.equipmentId === equipmentId);
  };

  // Staff management functions
  const addStaff = (staffData) => {
    const newStaff = {
      ...staffData,
      id: Date.now().toString(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    const updatedStaff = [...staff, newStaff];
    setStaff(updatedStaff);
    saveData('staff', updatedStaff);
    return newStaff;
  };

  const updateStaff = (staffId, updates) => {
    const updatedStaff = staff.map(s => 
      s.id === staffId ? { ...s, ...updates } : s
    );
    setStaff(updatedStaff);
    saveData('staff', updatedStaff);
  };

  const deleteStaff = (staffId) => {
    const updatedStaff = staff.map(s => 
      s.id === staffId ? { ...s, isActive: false } : s
    );
    setStaff(updatedStaff);
    saveData('staff', updatedStaff);
  };

  const getActiveStaff = () => {
    return staff.filter(s => s.isActive);
  };

  // Work session functions
  const addWorkSession = (sessionData) => {
    const newSession = {
      ...sessionData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updatedSessions = [...workSessions, newSession];
    setWorkSessions(updatedSessions);
    saveData('workSessions', updatedSessions);
    return newSession;
  };

  const addStaffToRepair = (repairId, staffId, hours, description = '') => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember) return false;

    const laborCost = hours * staffMember.hourlyRate;
    const repairStaff = {
      id: Date.now().toString(),
      staffId: staffId,
      staffName: staffMember.name,
      staffPosition: staffMember.position,
      hours: hours,
      hourlyRate: staffMember.hourlyRate,
      laborCost: laborCost,
      description: description,
      addedAt: new Date().toISOString(),
    };

    const updatedProcesses = repairProcesses.map(repair => {
      if (repair.id === repairId) {
        const updatedStaff = [...repair.staff, repairStaff];
        const laborCost = updatedStaff.reduce((sum, s) => sum + s.laborCost, 0);
        const totalCost = (repair.parts?.reduce((sum, p) => sum + p.totalPrice, 0) || 0) + laborCost;
        return { ...repair, staff: updatedStaff, laborCost, totalCost };
      }
      return repair;
    });

    setRepairProcesses(updatedProcesses);
    saveData('repairProcesses', updatedProcesses);
    return true;
  };

  const removeStaffFromRepair = (repairId, repairStaffId) => {
    const updatedProcesses = repairProcesses.map(repair => {
      if (repair.id === repairId) {
        const updatedStaff = repair.staff.filter(s => s.id !== repairStaffId);
        const laborCost = updatedStaff.reduce((sum, s) => sum + s.laborCost, 0);
        const totalCost = (repair.parts?.reduce((sum, p) => sum + p.totalPrice, 0) || 0) + laborCost;
        return { ...repair, staff: updatedStaff, laborCost, totalCost };
      }
      return repair;
    });

    setRepairProcesses(updatedProcesses);
    saveData('repairProcesses', updatedProcesses);
    return true;
  };

  // Theme management
  const toggleTheme = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    saveData('isDarkTheme', newTheme);
  };

  // Theme colors
  const getThemeColors = () => {
    if (isDarkTheme) {
      return {
        background: '#121212',
        surface: '#1E1E1E',
        card: '#2C2C2C',
        text: '#FFFFFF',
        textSecondary: '#B0B0B0',
        textTertiary: '#808080',
        border: '#404040',
        borderLight: '#333333',
        primary: '#007AFF',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        headerBackground: '#1E1E1E',
        tabBarBackground: '#1E1E1E',
        inputBackground: '#2C2C2C',
        modalOverlay: 'rgba(0,0,0,0.7)',
      };
    } else {
      return {
        background: '#f5f5f5',
        surface: '#ffffff',
        card: '#ffffff',
        text: '#333333',
        textSecondary: '#666666',
        textTertiary: '#888888',
        border: '#e0e0e0',
        borderLight: '#f0f0f0',
        primary: '#007AFF',
        success: '#34C759',
        warning: '#FF9500',
        error: '#FF3B30',
        headerBackground: '#ffffff',
        tabBarBackground: '#ffffff',
        inputBackground: '#ffffff',
        modalOverlay: 'rgba(0,0,0,0.5)',
      };
    }
  };

  // Part types management
  const addPartType = (name) => {
    const newType = {
      id: Date.now().toString(),
      name: name,
      order: partTypes.length + 1,
    };
    const updatedTypes = [...partTypes, newType];
    setPartTypes(updatedTypes);
    saveData('partTypes', updatedTypes);
    return newType;
  };

  const updatePartType = (typeId, updates) => {
    const updatedTypes = partTypes.map(type => 
      type.id === typeId ? { ...type, ...updates } : type
    );
    setPartTypes(updatedTypes);
    saveData('partTypes', updatedTypes);
  };

  const deletePartType = (typeId) => {
    const updatedTypes = partTypes.filter(type => type.id !== typeId);
    setPartTypes(updatedTypes);
    saveData('partTypes', updatedTypes);
  };

  const reorderPartTypes = (updatedTypes) => {
    setPartTypes(updatedTypes);
    saveData('partTypes', updatedTypes);
  };

  const getPartTypeOptions = () => {
    return partTypes.sort((a, b) => a.order - b.order).map(type => type.name);
  };

  // Helper function to normalize photo URIs
  const normalizePhotos = (photos) => {
    if (!photos || !Array.isArray(photos)) return [];
    return photos.map(photo => typeof photo === 'string' ? photo : photo.uri);
  };

  const value = {
    parts,
    partTemplates,
    partBatches,
    transactions,
    containers,
    equipment,
    staff,
    workSessions,
    arrivalFields,
    expenseFields,
    repairProcesses,
    addPart,
    updatePartQuantity,
    addTransaction,
    addEquipment,
    updateEquipment,
    addContainer,
    updateContainer,
    deleteContainer,
    findPartTemplateByBarcode,
    addOrUpdatePartTemplate,
    addPartBatch,
    getPartBatchesByBarcode,
    updatePartBatchQuantity,
    updateArrivalField,
    updateExpenseField,
    addArrivalField,
    addExpenseField,
    deleteArrivalField,
    deleteExpenseField,
    getEnabledArrivalFields,
    getEnabledExpenseFields,
    startRepairProcess,
    addPartToRepair,
    removePartFromRepair,
    completeRepairProcess,
    getActiveRepairs,
    getCompletedRepairs,
    getRepairsByEquipment,
    addStaff,
    updateStaff,
    deleteStaff,
    getActiveStaff,
    addWorkSession,
    addStaffToRepair,
    removeStaffFromRepair,
    loadData,
    isDarkTheme,
    toggleTheme,
    getThemeColors,
    partTypes,
    addPartType,
    updatePartType,
    deletePartType,
    reorderPartTypes,
    getPartTypeOptions,
    normalizePhotos,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};