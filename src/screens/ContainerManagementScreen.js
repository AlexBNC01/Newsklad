import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';

export default function ContainerManagementScreen() {
  const { containers, addContainer, updateContainer, deleteContainer } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [containerName, setContainerName] = useState('');
  const [containerLocation, setContainerLocation] = useState('');
  const [containerDescription, setContainerDescription] = useState('');

  const handleAddContainer = () => {
    setEditingContainer(null);
    setContainerName('');
    setContainerLocation('');
    setContainerDescription('');
    setModalVisible(true);
  };

  const handleEditContainer = (container) => {
    setEditingContainer(container);
    setContainerName(container.name);
    setContainerLocation(container.location);
    setContainerDescription(container.description);
    setModalVisible(true);
  };

  const handleSaveContainer = () => {
    if (!containerName.trim()) {
      Alert.alert('Ошибка', 'Введите название контейнера');
      return;
    }

    const containerData = {
      name: containerName.trim(),
      location: containerLocation.trim(),
      description: containerDescription.trim(),
    };

    if (editingContainer) {
      updateContainer(editingContainer.id, containerData);
    } else {
      addContainer(containerData);
    }

    setModalVisible(false);
    setContainerName('');
    setContainerLocation('');
    setContainerDescription('');
    setEditingContainer(null);
  };

  const handleDeleteContainer = (container) => {
    Alert.alert(
      'Удаление контейнера',
      `Вы уверены, что хотите удалить контейнер "${container.name}"?\n\nВсе запчасти в этом контейнере будут перемещены в "Без контейнера".`,
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: () => deleteContainer(container.id)
        }
      ]
    );
  };

  const renderContainerItem = ({ item }) => (
    <View style={styles.containerItem}>
      <View style={styles.containerHeader}>
        <Text style={styles.containerName}>{item.name}</Text>
        <View style={styles.containerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditContainer(item)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteContainer(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      {item.location && (
        <Text style={styles.containerLocation}>Локация: {item.location}</Text>
      )}
      {item.description && (
        <Text style={styles.containerDescription}>{item.description}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Управление контейнерами</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddContainer}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={containers}
        renderItem={renderContainerItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Контейнеры не найдены</Text>
            <Text style={styles.emptySubtext}>
              Добавьте первый контейнер для организации склада
            </Text>
          </View>
        }
      />

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
                {editingContainer ? 'Редактировать контейнер' : 'Добавить контейнер'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Название *</Text>
              <TextInput
                style={styles.input}
                value={containerName}
                onChangeText={setContainerName}
                placeholder="Введите название контейнера"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Локация</Text>
              <TextInput
                style={styles.input}
                value={containerLocation}
                onChangeText={setContainerLocation}
                placeholder="Введите локацию контейнера"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Описание</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={containerDescription}
                onChangeText={setContainerDescription}
                placeholder="Введите описание контейнера"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={handleSaveContainer}
              >
                <Text style={styles.saveButtonText}>Сохранить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  containerItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  containerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  containerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  containerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  containerLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  containerDescription: {
    fontSize: 14,
    color: '#888',
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
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
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