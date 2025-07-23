import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import { useNavigation } from '@react-navigation/native';

export default function WarehouseScreen() {
  const navigation = useNavigation();
  const { parts, containers, getThemeColors } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContainer, setSelectedContainer] = useState('all');
  
  const themeColors = getThemeColors();

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         part.article.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesContainer = selectedContainer === 'all' || part.containerId === selectedContainer;
    return matchesSearch && matchesContainer;
  });

  const renderPartItem = ({ item }) => (
    <TouchableOpacity 
      style={dynamicStyles.partItem}
      onPress={() => navigation.navigate('PartDetail', { partId: item.id })}
    >
      <View style={dynamicStyles.partHeader}>
        <Text style={dynamicStyles.partName}>{item.name}</Text>
        <Text style={dynamicStyles.partQuantity}>
          {item.quantity} шт.
        </Text>
      </View>
      <Text style={dynamicStyles.partArticle}>Артикул: {item.article}</Text>
      <Text style={dynamicStyles.partType}>Тип: {item.type}</Text>
      <Text style={dynamicStyles.partContainer}>
        Контейнер: {containers.find(c => c.id === item.containerId)?.name || 'Не указан'}
      </Text>
      {item.description && (
        <Text style={dynamicStyles.partDescription}>{item.description}</Text>
      )}
      
      <View style={dynamicStyles.partFooter}>
        <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
        <Text style={dynamicStyles.detailsText}>Подробная информация</Text>
      </View>
    </TouchableOpacity>
  );

  const renderContainerFilter = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, selectedContainer === 'all' && styles.filterButtonActive]}
        onPress={() => setSelectedContainer('all')}
      >
        <Text style={[styles.filterText, selectedContainer === 'all' && styles.filterTextActive]}>
          Все
        </Text>
      </TouchableOpacity>
      {containers.map(container => (
        <TouchableOpacity
          key={container.id}
          style={[styles.filterButton, selectedContainer === container.id && styles.filterButtonActive]}
          onPress={() => setSelectedContainer(container.id)}
        >
          <Text style={[styles.filterText, selectedContainer === container.id && styles.filterTextActive]}>
            {container.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.surface,
      margin: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: themeColors.text,
    },
    partItem: {
      backgroundColor: themeColors.surface,
      padding: 16,
      marginBottom: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
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
      color: themeColors.text,
      flex: 1,
    },
    partQuantity: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.primary,
    },
    partArticle: {
      fontSize: 14,
      color: themeColors.textSecondary,
      marginBottom: 4,
    },
    partType: {
      fontSize: 14,
      color: themeColors.textSecondary,
      marginBottom: 4,
    },
    partContainer: {
      fontSize: 14,
      color: themeColors.textSecondary,
      marginBottom: 4,
    },
    partDescription: {
      fontSize: 14,
      color: themeColors.textTertiary,
      fontStyle: 'italic',
    },
    partFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    detailsText: {
      fontSize: 14,
      color: themeColors.primary,
      marginLeft: 4,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>Склад</Text>
        <Text style={dynamicStyles.subtitle}>Всего запчастей: {parts.length}</Text>
      </View>

      <View style={dynamicStyles.searchContainer}>
        <Ionicons name="search" size={20} color={themeColors.textSecondary} style={dynamicStyles.searchIcon} />
        <TextInput
          style={dynamicStyles.searchInput}
          placeholder="Поиск по названию или артикулу..."
          placeholderTextColor={themeColors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {renderContainerFilter()}

      <FlatList
        data={filteredParts}
        renderItem={renderPartItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Запчасти не найдены</Text>
            <Text style={styles.emptySubtext}>
              {parts.length === 0 
                ? 'Добавьте первую запчасть через раздел "Приход"'
                : 'Попробуйте изменить параметры поиска'
              }
            </Text>
          </View>
        }
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
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
    color: '#007AFF',
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
    marginBottom: 4,
  },
  partDescription: {
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