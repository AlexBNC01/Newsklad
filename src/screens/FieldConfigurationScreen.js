import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function FieldConfigurationScreen({ route }) {
  const { fieldType } = route.params; // 'arrival' or 'expense'
  const {
    arrivalFields,
    expenseFields,
    updateArrivalField,
    updateExpenseField,
    addArrivalField,
    addExpenseField,
    deleteArrivalField,
    deleteExpenseField,
  } = useData();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm, setFieldForm] = useState({
    name: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
    optionText: '',
  });

  const fields = fieldType === 'arrival' ? arrivalFields : expenseFields;
  const updateField = fieldType === 'arrival' ? updateArrivalField : updateExpenseField;
  const addField = fieldType === 'arrival' ? addArrivalField : addExpenseField;
  const deleteField = fieldType === 'arrival' ? deleteArrivalField : deleteExpenseField;

  const fieldTypes = [
    { value: 'text', label: 'Текст' },
    { value: 'number', label: 'Число' },
    { value: 'textarea', label: 'Многострочный текст' },
    { value: 'select', label: 'Выбор из списка' },
    { value: 'date', label: 'Дата' },
    { value: 'boolean', label: 'Да/Нет' },
  ];

  const handleToggleField = (fieldId, enabled) => {
    updateField(fieldId, { enabled });
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setFieldForm({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.required,
      options: field.options || [],
      optionText: '',
    });
    setModalVisible(true);
  };

  const handleAddField = () => {
    setEditingField(null);
    setFieldForm({
      name: '',
      label: '',
      type: 'text',
      required: false,
      options: [],
      optionText: '',
    });
    setModalVisible(true);
  };

  const handleSaveField = () => {
    if (!fieldForm.name || !fieldForm.label) {
      Alert.alert('Ошибка', 'Заполните название и метку поля');
      return;
    }

    const fieldData = {
      name: fieldForm.name,
      label: fieldForm.label,
      type: fieldForm.type,
      required: fieldForm.required,
      enabled: true,
    };

    if (fieldForm.type === 'select' && fieldForm.options.length > 0) {
      fieldData.options = fieldForm.options;
    }

    if (editingField) {
      updateField(editingField.id, fieldData);
    } else {
      addField(fieldData);
    }

    setModalVisible(false);
    setEditingField(null);
  };

  const handleDeleteField = (field) => {
    if (field.required) {
      Alert.alert('Ошибка', 'Нельзя удалить обязательное поле');
      return;
    }

    Alert.alert(
      'Удаление поля',
      `Вы уверены, что хотите удалить поле "${field.label}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => deleteField(field.id) }
      ]
    );
  };

  const handleAddOption = () => {
    if (fieldForm.optionText.trim()) {
      setFieldForm(prev => ({
        ...prev,
        options: [...prev.options, prev.optionText.trim()],
        optionText: '',
      }));
    }
  };

  const handleRemoveOption = (index) => {
    setFieldForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const renderFieldItem = ({ item }) => (
    <View style={styles.fieldItem}>
      <View style={styles.fieldInfo}>
        <Text style={styles.fieldLabel}>{item.label}</Text>
        <Text style={styles.fieldDetails}>
          {item.name} • {fieldTypes.find(t => t.value === item.type)?.label}
          {item.required && ' • Обязательное'}
        </Text>
      </View>
      <View style={styles.fieldActions}>
        <Switch
          value={item.enabled}
          onValueChange={(enabled) => handleToggleField(item.id, enabled)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={item.enabled ? '#007AFF' : '#f4f3f4'}
        />
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditField(item)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        {!item.required && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteField(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingField ? 'Редактировать поле' : 'Добавить поле'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Название поля (для системы)</Text>
              <TextInput
                style={styles.input}
                value={fieldForm.name}
                onChangeText={(text) => setFieldForm(prev => ({ ...prev, name: text }))}
                placeholder="например: weight, brand"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Метка поля (для пользователя)</Text>
              <TextInput
                style={styles.input}
                value={fieldForm.label}
                onChangeText={(text) => setFieldForm(prev => ({ ...prev, label: text }))}
                placeholder="например: Вес, Производитель"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Тип поля</Text>
              <View style={styles.typeContainer}>
                {fieldTypes.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      fieldForm.type === type.value && styles.typeButtonActive
                    ]}
                    onPress={() => setFieldForm(prev => ({ ...prev, type: type.value }))}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      fieldForm.type === type.value && styles.typeButtonTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.switchContainer}>
                <Text style={styles.inputLabel}>Обязательное поле</Text>
                <Switch
                  value={fieldForm.required}
                  onValueChange={(required) => setFieldForm(prev => ({ ...prev, required }))}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={fieldForm.required ? '#007AFF' : '#f4f3f4'}
                />
              </View>
            </View>

            {fieldForm.type === 'select' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Варианты выбора</Text>
                <View style={styles.optionsContainer}>
                  <View style={styles.addOptionContainer}>
                    <TextInput
                      style={[styles.input, styles.optionInput]}
                      value={fieldForm.optionText}
                      onChangeText={(text) => setFieldForm(prev => ({ ...prev, optionText: text }))}
                      placeholder="Добавить вариант"
                    />
                    <TouchableOpacity style={styles.addOptionButton} onPress={handleAddOption}>
                      <Ionicons name="add" size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                  {fieldForm.options.map((option, index) => (
                    <View key={index} style={styles.optionItem}>
                      <Text style={styles.optionText}>{option}</Text>
                      <TouchableOpacity onPress={() => handleRemoveOption(index)}>
                        <Ionicons name="close-circle" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
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
              onPress={handleSaveField}
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
        <Text style={styles.title}>
          Настройка полей {fieldType === 'arrival' ? 'прихода' : 'расхода'}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddField}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={fields.sort((a, b) => a.order - b.order)}
        renderItem={renderFieldItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Поля не найдены</Text>
          </View>
        }
      />

      {renderModal()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  fieldItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldInfo: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fieldDetails: {
    fontSize: 14,
    color: '#666',
  },
  fieldActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
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
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
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
    backgroundColor: '#fff',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  addOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  addOptionButton: {
    padding: 8,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
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