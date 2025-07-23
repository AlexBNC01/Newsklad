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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function PartTypesManagementScreen({ navigation }) {
  const { 
    partTypes, 
    addPartType, 
    updatePartType, 
    deletePartType, 
    reorderPartTypes,
    getThemeColors 
  } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeName, setTypeName] = useState('');

  const themeColors = getThemeColors();

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
    content: {
      flex: 1,
      padding: 16,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: themeColors.primary,
      padding: 16,
      borderRadius: 12,
      marginBottom: 20,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    typeItem: {
      backgroundColor: themeColors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    dragHandle: {
      marginRight: 12,
    },
    typeInfo: {
      flex: 1,
    },
    typeName: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
      marginBottom: 4,
    },
    typeOrder: {
      fontSize: 14,
      color: themeColors.textSecondary,
    },
    typeActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: themeColors.borderLight,
    },
    editButton: {
      backgroundColor: themeColors.primary + '20',
    },
    deleteButton: {
      backgroundColor: themeColors.error + '20',
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
      color: themeColors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: themeColors.textTertiary,
      textAlign: 'center',
      paddingHorizontal: 32,
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
      maxWidth: 400,
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
    modalBody: {
      padding: 20,
    },
    input: {
      backgroundColor: themeColors.inputBackground,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      color: themeColors.text,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: themeColors.textSecondary,
      alignItems: 'center',
    },
    saveButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: themeColors.primary,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  const sortedTypes = [...partTypes].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    setEditingType(null);
    setTypeName('');
    setModalVisible(true);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setTypeName(type.name);
    setModalVisible(true);
  };

  const handleDelete = (type) => {
    Alert.alert(
      'Удалить тип',
      `Вы уверены, что хотите удалить тип "${type.name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => deletePartType(type.id)
        }
      ]
    );
  };

  const handleSave = () => {
    if (!typeName.trim()) {
      Alert.alert('Ошибка', 'Введите название типа');
      return;
    }

    if (editingType) {
      updatePartType(editingType.id, { name: typeName.trim() });
    } else {
      addPartType(typeName.trim());
    }

    setModalVisible(false);
    setTypeName('');
    setEditingType(null);
  };

  const moveUp = (type) => {
    const currentIndex = sortedTypes.findIndex(t => t.id === type.id);
    if (currentIndex > 0) {
      const newTypes = [...sortedTypes];
      [newTypes[currentIndex], newTypes[currentIndex - 1]] = [newTypes[currentIndex - 1], newTypes[currentIndex]];
      
      // Обновляем порядок
      const updatedTypes = newTypes.map((type, index) => ({
        ...type,
        order: index + 1
      }));
      
      reorderPartTypes(updatedTypes);
    }
  };

  const moveDown = (type) => {
    const currentIndex = sortedTypes.findIndex(t => t.id === type.id);
    if (currentIndex < sortedTypes.length - 1) {
      const newTypes = [...sortedTypes];
      [newTypes[currentIndex], newTypes[currentIndex + 1]] = [newTypes[currentIndex + 1], newTypes[currentIndex]];
      
      // Обновляем порядок
      const updatedTypes = newTypes.map((type, index) => ({
        ...type,
        order: index + 1
      }));
      
      reorderPartTypes(updatedTypes);
    }
  };

  const renderTypeItem = ({ item, index }) => (
    <View style={dynamicStyles.typeItem}>
      <View style={dynamicStyles.dragHandle}>
        <Ionicons name="reorder-three" size={24} color={themeColors.textSecondary} />
      </View>
      
      <View style={dynamicStyles.typeInfo}>
        <Text style={dynamicStyles.typeName}>{item.name}</Text>
        <Text style={dynamicStyles.typeOrder}>Позиция: {item.order}</Text>
      </View>
      
      <View style={dynamicStyles.typeActions}>
        <TouchableOpacity
          style={[dynamicStyles.actionButton, { opacity: index === 0 ? 0.3 : 1 }]}
          onPress={() => moveUp(item)}
          disabled={index === 0}
        >
          <Ionicons name="chevron-up" size={20} color={themeColors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[dynamicStyles.actionButton, { opacity: index === sortedTypes.length - 1 ? 0.3 : 1 }]}
          onPress={() => moveDown(item)}
          disabled={index === sortedTypes.length - 1}
        >
          <Ionicons name="chevron-down" size={20} color={themeColors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[dynamicStyles.actionButton, dynamicStyles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="create-outline" size={20} color={themeColors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[dynamicStyles.actionButton, dynamicStyles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={20} color={themeColors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Типы запчастей</Text>
        <Text style={dynamicStyles.subtitle}>Управление типами запчастей</Text>
      </View>

      <View style={dynamicStyles.content}>
        <TouchableOpacity style={dynamicStyles.addButton} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={dynamicStyles.addButtonText}>Добавить тип</Text>
        </TouchableOpacity>

        {sortedTypes.length === 0 ? (
          <View style={dynamicStyles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={64} color={themeColors.textTertiary} />
            <Text style={dynamicStyles.emptyText}>Нет типов запчастей</Text>
            <Text style={dynamicStyles.emptySubtext}>
              Добавьте первый тип запчасти с помощью кнопки выше
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedTypes}
            renderItem={renderTypeItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>
                {editingType ? 'Редактировать тип' : 'Добавить тип'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.modalBody}>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Название типа запчасти"
                placeholderTextColor={themeColors.textTertiary}
                value={typeName}
                onChangeText={setTypeName}
                autoFocus
              />
            </View>

            <View style={dynamicStyles.modalButtons}>
              <TouchableOpacity
                style={dynamicStyles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={dynamicStyles.buttonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={dynamicStyles.saveButton}
                onPress={handleSave}
              >
                <Text style={dynamicStyles.buttonText}>
                  {editingType ? 'Сохранить' : 'Добавить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}