import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function ComboBox({ 
  value, 
  onValueChange, 
  options, 
  placeholder, 
  error,
  allowCustomInput = true,
  label 
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const { getThemeColors, addPartType } = useData();
  const themeColors = getThemeColors();

  const dynamicStyles = StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.inputBackground,
      borderWidth: 1,
      borderColor: error ? themeColors.error : themeColors.border,
      borderRadius: 8,
    },
    input: {
      flex: 1,
      padding: 16,
      fontSize: 16,
      color: themeColors.text,
    },
    dropdownButton: {
      padding: 16,
    },
    errorText: {
      fontSize: 14,
      color: themeColors.error,
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: themeColors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      width: '90%',
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    optionItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.borderLight,
    },
    optionText: {
      fontSize: 16,
      color: themeColors.text,
    },
    selectedOption: {
      backgroundColor: themeColors.primary + '20',
    },
    selectedOptionText: {
      color: themeColors.primary,
      fontWeight: '600',
    },
    customInputContainer: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    customInput: {
      backgroundColor: themeColors.inputBackground,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: themeColors.text,
      marginBottom: 12,
    },
    customInputButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    customButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    addButton: {
      backgroundColor: themeColors.success,
    },
    cancelButton: {
      backgroundColor: themeColors.textSecondary,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const handleOptionSelect = (option) => {
    setInputValue(option);
    onValueChange(option);
    setModalVisible(false);
    setShowCustomInput(false);
  };

  const handleCustomInput = () => {
    if (customValue.trim()) {
      const newValue = customValue.trim();
      // Если это поле типа запчасти, добавляем новый тип в базу данных
      if (allowCustomInput) {
        // Проверяем, не существует ли уже такой тип
        if (!options.includes(newValue)) {
          addPartType(newValue);
        }
      }
      handleOptionSelect(newValue);
      setCustomValue('');
    }
    setShowCustomInput(false);
  };

  const handleInputChange = (text) => {
    setInputValue(text);
    onValueChange(text);
  };

  const renderOption = ({ item }) => {
    const isSelected = item === inputValue;
    return (
      <TouchableOpacity
        style={[dynamicStyles.optionItem, isSelected && dynamicStyles.selectedOption]}
        onPress={() => handleOptionSelect(item)}
      >
        <Text style={[dynamicStyles.optionText, isSelected && dynamicStyles.selectedOptionText]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={dynamicStyles.container}>
      {label && <Text style={dynamicStyles.label}>{label}</Text>}
      
      <View style={dynamicStyles.inputContainer}>
        <TextInput
          style={dynamicStyles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor={themeColors.textTertiary}
        />
        <TouchableOpacity
          style={dynamicStyles.dropdownButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="chevron-down" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      {error && <Text style={dynamicStyles.errorText}>{error}</Text>}

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Выберите тип</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {allowCustomInput && (
              <View style={dynamicStyles.customInputContainer}>
                {!showCustomInput ? (
                  <TouchableOpacity
                    style={[dynamicStyles.customButton, { backgroundColor: themeColors.primary }]}
                    onPress={() => setShowCustomInput(true)}
                  >
                    <Text style={dynamicStyles.buttonText}>+ Добавить свой тип</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <TextInput
                      style={dynamicStyles.customInput}
                      value={customValue}
                      onChangeText={setCustomValue}
                      placeholder="Введите новый тип запчасти"
                      placeholderTextColor={themeColors.textTertiary}
                      autoFocus
                    />
                    <View style={dynamicStyles.customInputButtons}>
                      <TouchableOpacity
                        style={[dynamicStyles.customButton, dynamicStyles.addButton]}
                        onPress={handleCustomInput}
                      >
                        <Text style={dynamicStyles.buttonText}>Добавить</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[dynamicStyles.customButton, dynamicStyles.cancelButton]}
                        onPress={() => {
                          setShowCustomInput(false);
                          setCustomValue('');
                        }}
                      >
                        <Text style={dynamicStyles.buttonText}>Отмена</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <FlatList
              data={options}
              renderItem={renderOption}
              keyExtractor={(item, index) => index.toString()}
              style={{ maxHeight: 300 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}