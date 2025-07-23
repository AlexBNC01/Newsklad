import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../context/DataContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ReportsScreen({ navigation }) {
  const {
    equipment,
    staff,
    parts,
    transactions,
    repairProcesses,
    containers,
    partTypes,
    getThemeColors,
    isDarkTheme
  } = useData();

  const themeColors = getThemeColors();
  const [loading, setLoading] = useState(false);
  
  // Фильтры отчета
  const [reportConfig, setReportConfig] = useState({
    reportType: 'general', // general, equipment, staff, parts, repairs
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 дней назад
    dateTo: new Date(),
    selectedEquipment: [],
    selectedStaff: [],
    selectedPartTypes: [],
    selectedContainers: [],
    includeTransactions: true,
    includeRepairs: true,
    includeStats: true,
    includePhotos: false,
  });

  const [showDatePicker, setShowDatePicker] = useState({ show: false, type: '' });
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const reportTypes = [
    { id: 'general', name: 'Общий отчет', icon: 'document-text-outline' },
    { id: 'equipment', name: 'По технике', icon: 'construct-outline' },
    { id: 'staff', name: 'По сотрудникам', icon: 'people-outline' },
    { id: 'parts', name: 'По запчастям', icon: 'cube-outline' },
    { id: 'repairs', name: 'По ремонтам', icon: 'build-outline' },
    { id: 'inventory', name: 'Складские остатки', icon: 'archive-outline' },
  ];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker({ show: false, type: '' });
    if (selectedDate) {
      setReportConfig(prev => ({
        ...prev,
        [showDatePicker.type]: selectedDate
      }));
    }
  };

  const generateReportData = () => {
    const { dateFrom, dateTo, reportType } = reportConfig;
    
    // Фильтруем транзакции по дате
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      return transactionDate >= dateFrom && transactionDate <= dateTo;
    });

    // Фильтруем ремонты по дате
    const filteredRepairs = repairProcesses.filter(r => {
      const repairDate = new Date(r.startDate);
      return repairDate >= dateFrom && repairDate <= dateTo;
    });

    let reportData = {
      title: '',
      period: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
      generatedAt: new Date().toLocaleString(),
      sections: []
    };

    switch (reportType) {
      case 'general':
        reportData.title = 'Общий отчет';
        reportData.sections = generateGeneralReport(filteredTransactions, filteredRepairs);
        break;
      case 'equipment':
        reportData.title = 'Отчет по технике';
        reportData.sections = generateEquipmentReport(filteredTransactions, filteredRepairs);
        break;
      case 'staff':
        reportData.title = 'Отчет по сотрудникам';
        reportData.sections = generateStaffReport(filteredRepairs);
        break;
      case 'parts':
        reportData.title = 'Отчет по запчастям';
        reportData.sections = generatePartsReport(filteredTransactions);
        break;
      case 'repairs':
        reportData.title = 'Отчет по ремонтам';
        reportData.sections = generateRepairsReport(filteredRepairs);
        break;
      case 'inventory':
        reportData.title = 'Складские остатки';
        reportData.sections = generateInventoryReport();
        break;
    }

    return reportData;
  };

  const generateGeneralReport = (transactions, repairs) => {
    const sections = [];

    // Статистика
    if (reportConfig.includeStats) {
      const totalTransactions = transactions.length;
      const arrivalTransactions = transactions.filter(t => t.type === 'arrival').length;
      const expenseTransactions = transactions.filter(t => t.type === 'expense').length;
      const totalRepairs = repairs.length;
      const completedRepairs = repairs.filter(r => r.status === 'Завершен').length;
      const activeRepairs = repairs.filter(r => r.status === 'В процессе').length;

      sections.push({
        title: 'Общая статистика',
        type: 'stats',
        data: [
          { label: 'Всего операций', value: totalTransactions },
          { label: 'Поступления', value: arrivalTransactions },
          { label: 'Списания', value: expenseTransactions },
          { label: 'Всего ремонтов', value: totalRepairs },
          { label: 'Завершенные ремонты', value: completedRepairs },
          { label: 'Активные ремонты', value: activeRepairs },
        ]
      });
    }

    // Транзакции
    if (reportConfig.includeTransactions && transactions.length > 0) {
      sections.push({
        title: 'Операции с запчастями',
        type: 'transactions',
        data: transactions.slice(0, 20) // Ограничиваем количество для PDF
      });
    }

    // Ремонты
    if (reportConfig.includeRepairs && repairs.length > 0) {
      sections.push({
        title: 'Ремонтные работы',
        type: 'repairs',
        data: repairs
      });
    }

    return sections;
  };

  const generateEquipmentReport = (transactions, repairs) => {
    const sections = [];
    
    equipment.forEach(eq => {
      const equipmentTransactions = transactions.filter(t => t.equipmentId === eq.id);
      const equipmentRepairs = repairs.filter(r => r.equipmentId === eq.id);
      
      if (equipmentTransactions.length > 0 || equipmentRepairs.length > 0) {
        sections.push({
          title: `${eq.type} ${eq.model} (${eq.licensePlate})`,
          type: 'equipment',
          data: {
            equipment: eq,
            transactions: equipmentTransactions,
            repairs: equipmentRepairs,
            totalCost: equipmentRepairs.reduce((sum, r) => sum + (r.totalCost || 0), 0),
          }
        });
      }
    });

    return sections;
  };

  const generateStaffReport = (repairs) => {
    const sections = [];
    
    staff.filter(s => s.isActive).forEach(member => {
      const staffRepairs = repairs.filter(r => 
        r.staff?.some(s => s.staffId === member.id)
      );
      
      if (staffRepairs.length > 0) {
        const totalHours = staffRepairs.reduce((sum, repair) => {
          const staffHours = repair.staff
            ?.filter(s => s.staffId === member.id)
            .reduce((hours, s) => hours + s.hours, 0) || 0;
          return sum + staffHours;
        }, 0);
        
        const totalCost = totalHours * member.hourlyRate;
        
        sections.push({
          title: `${member.name} (${member.position})`,
          type: 'staff',
          data: {
            staff: member,
            repairs: staffRepairs,
            totalHours,
            totalCost,
          }
        });
      }
    });

    return sections;
  };

  const generatePartsReport = (transactions) => {
    const partStats = {};
    
    transactions.forEach(t => {
      if (!partStats[t.partId]) {
        const part = parts.find(p => p.id === t.partId);
        partStats[t.partId] = {
          part,
          arrivals: 0,
          expenses: 0,
          totalValue: 0,
        };
      }
      
      if (t.type === 'arrival') {
        partStats[t.partId].arrivals += t.quantity;
      } else {
        partStats[t.partId].expenses += t.quantity;
      }
      
      const part = parts.find(p => p.id === t.partId);
      if (part?.price) {
        partStats[t.partId].totalValue += t.quantity * part.price;
      }
    });

    return [{
      title: 'Движение запчастей',
      type: 'parts',
      data: Object.values(partStats).filter(stat => stat.part)
    }];
  };

  const generateRepairsReport = (repairs) => {
    const totalCost = repairs.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const avgCost = repairs.length > 0 ? totalCost / repairs.length : 0;
    
    return [{
      title: 'Детальная информация по ремонтам',
      type: 'repairs_detailed',
      data: {
        repairs,
        totalCost,
        avgCost,
        completedCount: repairs.filter(r => r.status === 'Завершен').length,
        inProgressCount: repairs.filter(r => r.status === 'В процессе').length,
      }
    }];
  };

  const generateInventoryReport = () => {
    const totalValue = parts.reduce((sum, part) => {
      return sum + (part.quantity * (part.price || 0));
    }, 0);
    
    const lowStockParts = parts.filter(p => p.quantity < 5);
    const outOfStockParts = parts.filter(p => p.quantity === 0);
    
    return [
      {
        title: 'Складские остатки',
        type: 'inventory',
        data: {
          totalParts: parts.length,
          totalValue,
          lowStockParts,
          outOfStockParts,
          partsByType: partTypes.map(type => ({
            type: type.name,
            count: parts.filter(p => p.type === type.name).length,
            value: parts
              .filter(p => p.type === type.name)
              .reduce((sum, p) => sum + (p.quantity * (p.price || 0)), 0)
          }))
        }
      }
    ];
  };

  const generatePDF = async () => {
    setLoading(true);
    
    try {
      const reportData = generateReportData();
      const htmlContent = generateHTMLReport(reportData);
      
      // Создаем HTML файл
      const htmlPath = `${FileSystem.documentDirectory}report.html`;
      await FileSystem.writeAsStringAsync(htmlPath, htmlContent);
      
      // Показываем HTML файл (пока нет PDF библиотеки)
      await Sharing.shareAsync(htmlPath, {
        mimeType: 'text/html',
        dialogTitle: 'Отчет готов'
      });
      
      Alert.alert('Успешно', 'Отчет сформирован и готов к просмотру');
      
    } catch (error) {
      console.error('Ошибка генерации отчета:', error);
      Alert.alert('Ошибка', 'Не удалось сформировать отчет');
    } finally {
      setLoading(false);
    }
  };

  const generateHTMLReport = (reportData) => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportData.title}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                color: #333;
                line-height: 1.6;
            }
            .header { 
                text-align: center; 
                border-bottom: 2px solid #007AFF; 
                padding-bottom: 20px; 
                margin-bottom: 30px;
            }
            .header h1 { 
                color: #007AFF; 
                margin: 0;
                font-size: 28px;
            }
            .period { 
                color: #666; 
                font-size: 16px;
                margin: 10px 0;
            }
            .generated { 
                color: #999; 
                font-size: 14px;
            }
            .section { 
                margin-bottom: 30px; 
                break-inside: avoid;
            }
            .section h2 { 
                color: #007AFF; 
                border-bottom: 1px solid #eee; 
                padding-bottom: 10px;
                font-size: 20px;
            }
            .stats-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 15px; 
                margin: 20px 0;
            }
            .stat-card { 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 8px; 
                text-align: center;
                border-left: 4px solid #007AFF;
            }
            .stat-value { 
                font-size: 24px; 
                font-weight: bold; 
                color: #007AFF;
                display: block;
            }
            .stat-label { 
                color: #666; 
                font-size: 14px;
                margin-top: 5px;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0;
                font-size: 14px;
            }
            th, td { 
                border: 1px solid #ddd; 
                padding: 12px; 
                text-align: left;
            }
            th { 
                background-color: #f8f9fa; 
                font-weight: bold;
                color: #007AFF;
            }
            tr:nth-child(even) { 
                background-color: #f9f9f9;
            }
            .footer { 
                text-align: center; 
                color: #999; 
                font-size: 12px; 
                margin-top: 50px; 
                border-top: 1px solid #eee; 
                padding-top: 20px;
            }
            @media print {
                body { margin: 0; font-size: 12px; }
                .section { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${reportData.title}</h1>
            <div class="period">Период: ${reportData.period}</div>
            <div class="generated">Сформирован: ${reportData.generatedAt}</div>
        </div>
    `;

    reportData.sections.forEach(section => {
      html += `<div class="section"><h2>${section.title}</h2>`;
      
      switch (section.type) {
        case 'stats':
          html += '<div class="stats-grid">';
          section.data.forEach(stat => {
            html += `
              <div class="stat-card">
                <span class="stat-value">${stat.value}</span>
                <div class="stat-label">${stat.label}</div>
              </div>
            `;
          });
          html += '</div>';
          break;
          
        case 'transactions':
          html += `
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Запчасть</th>
                  <th>Тип</th>
                  <th>Количество</th>
                  <th>Описание</th>
                </tr>
              </thead>
              <tbody>
          `;
          section.data.forEach(transaction => {
            html += `
              <tr>
                <td>${new Date(transaction.timestamp).toLocaleDateString()}</td>
                <td>${transaction.partName}</td>
                <td>${transaction.type === 'arrival' ? 'Поступление' : 'Списание'}</td>
                <td>${transaction.quantity}</td>
                <td>${transaction.description}</td>
              </tr>
            `;
          });
          html += '</tbody></table>';
          break;
          
        case 'repairs':
          html += `
            <table>
              <thead>
                <tr>
                  <th>Техника</th>
                  <th>Статус</th>
                  <th>Дата начала</th>
                  <th>Стоимость</th>
                </tr>
              </thead>
              <tbody>
          `;
          section.data.forEach(repair => {
            const eq = equipment.find(e => e.id === repair.equipmentId);
            html += `
              <tr>
                <td>${eq ? `${eq.type} ${eq.model}` : 'Не указана'}</td>
                <td>${repair.status}</td>
                <td>${new Date(repair.startDate).toLocaleDateString()}</td>
                <td>${repair.totalCost ? repair.totalCost.toFixed(2) + ' руб.' : 'Не указана'}</td>
              </tr>
            `;
          });
          html += '</tbody></table>';
          break;
          
        case 'parts':
          html += `
            <table>
              <thead>
                <tr>
                  <th>Запчасть</th>
                  <th>Поступило</th>
                  <th>Списано</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
          `;
          section.data.forEach(partStat => {
            html += `
              <tr>
                <td>${partStat.part.name}</td>
                <td>${partStat.arrivals}</td>
                <td>${partStat.expenses}</td>
                <td>${partStat.totalValue.toFixed(2)} руб.</td>
              </tr>
            `;
          });
          html += '</tbody></table>';
          break;
      }
      
      html += '</div>';
    });

    html += `
        <div class="footer">
            <p>Отчет сформирован автоматически системой управления складом</p>
        </div>
    </body>
    </html>
    `;

    return html;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      backgroundColor: themeColors.surface,
      padding: 16,
      paddingTop: 44,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    section: {
      backgroundColor: themeColors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
      marginBottom: 16,
    },
    reportTypeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    reportTypeCard: {
      width: '48%',
      backgroundColor: themeColors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: themeColors.border,
    },
    reportTypeCardActive: {
      borderColor: themeColors.primary,
      backgroundColor: themeColors.primary + '20',
    },
    reportTypeIcon: {
      marginBottom: 8,
    },
    reportTypeName: {
      fontSize: 14,
      fontWeight: '600',
      color: themeColors.text,
      textAlign: 'center',
    },
    periodContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    dateButton: {
      flex: 1,
      backgroundColor: themeColors.card,
      borderRadius: 8,
      padding: 16,
      marginHorizontal: 4,
      alignItems: 'center',
    },
    dateLabel: {
      fontSize: 12,
      color: themeColors.textSecondary,
      marginBottom: 4,
    },
    dateText: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.text,
    },
    filterButton: {
      backgroundColor: themeColors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    filterButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    generateButton: {
      backgroundColor: themeColors.success,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      borderRadius: 8,
    },
    generateButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 8,
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
      maxHeight: '80%',
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
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    switchLabel: {
      fontSize: 16,
      color: themeColors.text,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: themeColors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: themeColors.text,
      fontSize: 16,
      marginTop: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Отчеты</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Тип отчета */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Тип отчета</Text>
          <View style={styles.reportTypeGrid}>
            {reportTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.reportTypeCard,
                  reportConfig.reportType === type.id && styles.reportTypeCardActive
                ]}
                onPress={() => setReportConfig(prev => ({ ...prev, reportType: type.id }))}
              >
                <Ionicons 
                  name={type.icon} 
                  size={32} 
                  color={reportConfig.reportType === type.id ? themeColors.primary : themeColors.textSecondary}
                  style={styles.reportTypeIcon}
                />
                <Text style={styles.reportTypeName}>{type.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Период */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Период</Text>
          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker({ show: true, type: 'dateFrom' })}
            >
              <Text style={styles.dateLabel}>От</Text>
              <Text style={styles.dateText}>
                {reportConfig.dateFrom.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker({ show: true, type: 'dateTo' })}
            >
              <Text style={styles.dateLabel}>До</Text>
              <Text style={styles.dateText}>
                {reportConfig.dateTo.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Фильтры */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={24} color="#fff" />
          <Text style={styles.filterButtonText}>Дополнительные фильтры</Text>
        </TouchableOpacity>

        {/* Генерация отчета */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={generatePDF}
          disabled={loading}
        >
          <Ionicons name="document-text" size={24} color="#fff" />
          <Text style={styles.generateButtonText}>
            {loading ? 'Формируется...' : 'Сформировать отчет'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно фильтров */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Настройки отчета</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Включить транзакции</Text>
                <Switch
                  value={reportConfig.includeTransactions}
                  onValueChange={value => 
                    setReportConfig(prev => ({ ...prev, includeTransactions: value }))
                  }
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Включить ремонты</Text>
                <Switch
                  value={reportConfig.includeRepairs}
                  onValueChange={value => 
                    setReportConfig(prev => ({ ...prev, includeRepairs: value }))
                  }
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Включить статистику</Text>
                <Switch
                  value={reportConfig.includeStats}
                  onValueChange={value => 
                    setReportConfig(prev => ({ ...prev, includeStats: value }))
                  }
                />
              </View>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Включить фотографии</Text>
                <Switch
                  value={reportConfig.includePhotos}
                  onValueChange={value => 
                    setReportConfig(prev => ({ ...prev, includePhotos: value }))
                  }
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker.show && (
        <DateTimePicker
          value={reportConfig[showDatePicker.type]}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Формирование отчета...</Text>
        </View>
      )}
    </View>
  );
}