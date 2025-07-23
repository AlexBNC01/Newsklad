import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ImagePickerComponent({ photos = [], onPhotosChange, maxPhotos = 5 }) {
  
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Разрешения',
        'Для добавления фото необходимо разрешить доступ к камере и галерее.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async (source = 'gallery') => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Лимит фото', `Максимально можно добавить ${maxPhotos} фотографий`);
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const newPhoto = {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          type: result.assets[0].type,
          name: `photo_${Date.now()}.jpg`,
        };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('Ошибка при выборе изображения:', error);
      Alert.alert('Ошибка', 'Не удалось добавить фото');
    }
  };

  const removePhoto = (photoId) => {
    Alert.alert(
      'Удалить фото?',
      'Это действие нельзя отменить',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            onPhotosChange(photos.filter(photo => photo.id !== photoId));
          },
        },
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Добавить фото',
      'Выберите способ добавления фотографии',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Камера', onPress: () => pickImage('camera') },
        { text: 'Галерея', onPress: () => pickImage('gallery') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Фотографии</Text>
        <Text style={styles.counter}>{photos.length}/{maxPhotos}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoItem}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(photo.id)}
            >
              <Ionicons name="close-circle" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        ))}

        {photos.length < maxPhotos && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={showImageOptions}>
            <Ionicons name="camera" size={32} color="#666" />
            <Text style={styles.addPhotoText}>Добавить фото</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {photos.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="image-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Фотографии не добавлены</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={showImageOptions}>
            <Text style={styles.emptyButtonText}>Добавить первое фото</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  counter: {
    fontSize: 14,
    color: '#666',
  },
  photosContainer: {
    flexDirection: 'row',
  },
  photoItem: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});