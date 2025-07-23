import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ComboBox from './ComboBox';
import { useData } from '../context/DataContext';

const DynamicFormField = ({ 
  field, 
  value, 
  onValueChange, 
  containers = [], 
  equipment = [], 
  error 
}) => {
  const { getPartTypeOptions } = useData();
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder={`Введите ${field.label.toLowerCase()}`}
            value={value || ''}
            onChangeText={onValueChange}
          />
        );

      case 'number':
        return (
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder={`Введите ${field.label.toLowerCase()}`}
            value={value || ''}
            onChangeText={onValueChange}
            keyboardType="numeric"
          />
        );

      case 'textarea':
        return (
          <TextInput
            style={[styles.input, styles.textArea, error && styles.inputError]}
            placeholder={`Введите ${field.label.toLowerCase()}`}
            value={value || ''}
            onChangeText={onValueChange}
            multiline
            numberOfLines={3}
          />
        );

      case 'select':
        // Если это поле типа запчасти, используем ComboBox
        if (field.name === 'type') {
          return (
            <ComboBox
              value={value}
              onValueChange={onValueChange}
              options={getPartTypeOptions()}
              placeholder="Выберите или введите тип запчасти"
              error={error}
              allowCustomInput={true}
            />
          );
        }
        // Для остальных селектов используем обычную логику
        return (
          <View style={styles.selectContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {field.options?.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectOption,
                    value === option && styles.selectOptionActive,
                    error && styles.selectOptionError,
                  ]}
                  onPress={() => onValueChange(option)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    value === option && styles.selectOptionTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'container':
        return (
          <View style={styles.selectContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {containers.map(container => (
                <TouchableOpacity
                  key={container.id}
                  style={[
                    styles.selectOption,
                    value === container.id && styles.selectOptionActive,
                    error && styles.selectOptionError,
                  ]}
                  onPress={() => onValueChange(container.id)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    value === container.id && styles.selectOptionTextActive,
                  ]}>
                    {container.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'equipment':
        return (
          <View style={styles.selectContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {equipment.map(eq => (
                <TouchableOpacity
                  key={eq.id}
                  style={[
                    styles.selectOption,
                    value === eq.id && styles.selectOptionActive,
                  ]}
                  onPress={() => onValueChange(eq.id)}
                >
                  <Text style={[
                    styles.selectOptionText,
                    value === eq.id && styles.selectOptionTextActive,
                  ]}>
                    {eq.type} {eq.model}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'boolean':
        return (
          <View style={styles.switchContainer}>
            <Switch
              value={value === true || value === 'true'}
              onValueChange={(newValue) => onValueChange(newValue)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={value ? '#007AFF' : '#f4f3f4'}
            />
            <Text style={styles.switchLabel}>
              {value === true || value === 'true' ? 'Да' : 'Нет'}
            </Text>
          </View>
        );

      case 'date':
        return (
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="ДД.ММ.ГГГГ"
            value={value || ''}
            onChangeText={onValueChange}
            keyboardType="numeric"
          />
        );

      default:
        return (
          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder={`Введите ${field.label.toLowerCase()}`}
            value={value || ''}
            onChangeText={onValueChange}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, error && styles.labelError]}>
        {field.label}
        {field.required && <Text style={styles.required}> *</Text>}
      </Text>
      {renderField()}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  labelError: {
    color: '#FF3B30',
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectContainer: {
    flexDirection: 'row',
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectOptionError: {
    borderColor: '#FF3B30',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
});

export default DynamicFormField;