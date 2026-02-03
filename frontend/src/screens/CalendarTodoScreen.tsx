import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import { Storage } from '../services/storage';

import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore/lite';

// Configure notifications
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

interface Todo {
  id: string;
  text: string;
  description?: string;
  date: string;
  time?: string; // HH:mm format
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  hasAlarm: boolean;
  reminderTime?: string; // HH:mm format (deprecated in favor of time)
}

export const CalendarTodoScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDesc, setNewTodoDesc] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [setAlarm, setSetAlarm] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [is24Hour, setIs24Hour] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Demo user check
      if (user.uid.startsWith('demo_')) {
        await loadTodosFromStorage();
        return;
      }

      // One-time fetch for Firestore Lite
      try {
        const q = query(collection(db, 'users', user.uid, 'todos'));
        const snapshot = await getDocs(q);
        const firestoreTodos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Todo[];
        setTodos(firestoreTodos);
      } catch (e) {
        console.warn("Firestore error, falling back to local storage:", e);
        await loadTodosFromStorage();
      }
    };

    loadData();
  }, [user]);

  const loadTodosFromStorage = async () => {
    const stored = await Storage.getItem('user_todos');
    if (stored) {
      setTodos(JSON.parse(stored));
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'web') return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need notification permissions to set alarms.');
    }
  };

  const saveTodos = async (updatedTodos: Todo[]) => {
    // We don't need this anymore as we use real-time Firestore sync
    // But we might still want to save to Storage for offline use
    setTodos(updatedTodos);
    await Storage.setItem('user_todos', JSON.stringify(updatedTodos));
  };

  const formatTimeDisplay = (timeStr: string) => {
    if (!timeStr) return '';
    if (is24Hour) return timeStr;
    
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${minutes} ${ampm}`;
  };

  const addTodo = async () => {
    if (!newTodoText.trim()) return;

    const newTodo: Todo = {
      id: editingTodoId || Date.now().toString(),
      text: newTodoText,
      description: newTodoDesc,
      date: selectedDate,
      time: reminderTime,
      completed: false,
      priority: newTodoPriority,
      hasAlarm: setAlarm,
      reminderTime: reminderTime,
    };

    if (setAlarm && Platform.OS !== 'web') {
      const [hours, minutes] = reminderTime.split(':').map(Number);
      const triggerDate = new Date(selectedDate);
      triggerDate.setHours(hours, minutes, 0, 0);

      if (triggerDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "AgriSaarthi Task Reminder",
            body: newTodoText,
            data: { todoId: newTodo.id },
          },
          trigger: triggerDate,
        });
      }
    }

    if (user && !user.uid.startsWith('demo_')) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'todos', newTodo.id), newTodo);
        resetModal();
      } catch (error: any) {
        console.error("Error saving todo to Firestore:", error);
        // Fallback to local storage on error
        const updatedTodos = editingTodoId 
          ? todos.map(t => t.id === editingTodoId ? newTodo : t)
          : [...todos, newTodo];
        await saveTodos(updatedTodos);
        resetModal();
      }
    } else {
      // Fallback to local storage for demo users or if not logged in
      const updatedTodos = editingTodoId 
        ? todos.map(t => t.id === editingTodoId ? newTodo : t)
        : [...todos, newTodo];
      await saveTodos(updatedTodos);
      resetModal();
    }
  };

  const resetModal = () => {
    setNewTodoText('');
    setNewTodoDesc('');
    setNewTodoPriority('medium');
    setEditingTodoId(null);
    setSetAlarm(false);
    setReminderTime('08:00');
    setModalVisible(false);
  };

  const startEditTodo = (todo: Todo) => {
    setNewTodoText(todo.text);
    setNewTodoDesc(todo.description || '');
    setNewTodoPriority(todo.priority);
    setEditingTodoId(todo.id);
    setSetAlarm(todo.hasAlarm);
    setReminderTime(todo.time || todo.reminderTime || '08:00');
    setModalVisible(true);
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, completed: !todo.completed };
    
    if (user && !user.uid.startsWith('demo_')) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'todos', id), updatedTodo);
      } catch (error) {
        console.error("Error toggling todo:", error);
        const updatedTodos = todos.map(t => t.id === id ? updatedTodo : t);
        await saveTodos(updatedTodos);
      }
    } else {
      const updatedTodos = todos.map(t => t.id === id ? updatedTodo : t);
      await saveTodos(updatedTodos);
    }
  };

  const deleteTodo = async (id: string) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            if (user && !user.uid.startsWith('demo_')) {
              try {
                await deleteDoc(doc(db, 'users', user.uid, 'todos', id));
              } catch (error) {
                console.error("Error deleting todo:", error);
                const updatedTodos = todos.filter(t => t.id !== id);
                await saveTodos(updatedTodos);
              }
            } else {
              const updatedTodos = todos.filter(t => t.id !== id);
              await saveTodos(updatedTodos);
            }
          } 
        }
      ]
    );
  };

  const addTemplateTask = async (text: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      date: selectedDate,
      completed: false,
      priority,
      hasAlarm: false,
    };

    if (user && !user.uid.startsWith('demo_')) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'todos', newTodo.id), newTodo);
      } catch (e) {
        console.error("Error adding template task:", e);
        await saveTodos([...todos, newTodo]);
      }
    } else {
      await saveTodos([...todos, newTodo]);
    }
  };

  const filteredTodos = todos.filter(t => t.date === selectedDate);

  const markedDates = todos.reduce((acc: any, todo) => {
    acc[todo.date] = { marked: true, dotColor: '#27AE60' };
    return acc;
  }, {});

  markedDates[selectedDate] = { 
    ...markedDates[selectedDate], 
    selected: true, 
    selectedColor: '#27AE60' 
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA502';
      default: return '#27AE60';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar & Tasks</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarCard}>
          <Calendar
            onDayPress={(day: any) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              todayTextColor: '#27AE60',
              arrowColor: '#27AE60',
              selectedDayBackgroundColor: '#27AE60',
            }}
          />
          <TouchableOpacity 
            style={styles.todayBtn} 
            onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          >
            <Text style={styles.todayBtnText}>Go to Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tasksHeader}>
          <View>
            <Text style={styles.sectionTitle}>Tasks for {selectedDate}</Text>
            {filteredTodos.length > 0 && (
              <Text style={styles.summaryText}>
                {filteredTodos.filter(t => t.completed).length} of {filteredTodos.length} completed
              </Text>
            )}
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* TEMPLATE SUGGESTIONS */}
        <View style={styles.templatesSection}>
          <Text style={styles.templateHeader}>Smart Suggestions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
            <TouchableOpacity style={styles.templateItem} onPress={() => addTemplateTask('Watering the crops', 'high')}>
              <Ionicons name="water-outline" size={16} color="#27AE60" />
              <Text style={styles.templateItemText}>Watering</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.templateItem} onPress={() => addTemplateTask('Applying fertilizer', 'medium')}>
              <Ionicons name="flask-outline" size={16} color="#27AE60" />
              <Text style={styles.templateItemText}>Fertilizer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.templateItem} onPress={() => addTemplateTask('Check for pests', 'high')}>
              <Ionicons name="bug-outline" size={16} color="#27AE60" />
              <Text style={styles.templateItemText}>Pest Check</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.templateItem} onPress={() => addTemplateTask('Harvesting', 'high')}>
              <Ionicons name="cut-outline" size={16} color="#27AE60" />
              <Text style={styles.templateItemText}>Harvest</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {filteredTodos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No tasks for this day</Text>
          </View>
        ) : (
          filteredTodos.map(todo => (
            <View key={todo.id} style={styles.todoItem}>
              <TouchableOpacity 
                style={[styles.checkbox, todo.completed && styles.checked]} 
                onPress={() => toggleTodo(todo.id)}
              >
                {todo.completed && <Ionicons name="checkmark" size={16} color="white" />}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.todoTextContainer}
                onPress={() => startEditTodo(todo)}
              >
                <View style={styles.todoHeaderRow}>
                  <Text style={[styles.todoText, todo.completed && styles.completedText]}>
                    {todo.text}
                  </Text>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(todo.priority) }]}>
                    <Text style={styles.priorityText}>{todo.priority}</Text>
                  </View>
                </View>
                {todo.description ? (
                  <Text style={styles.todoDesc} numberOfLines={1}>{todo.description}</Text>
                ) : null}
                
                <View style={styles.timeAndAlarmContainer}>
                  {todo.time && (
                    <View style={styles.timeBadge}>
                      <Ionicons name="time-outline" size={12} color="#666" />
                      <Text style={styles.timeText}>{formatTimeDisplay(todo.time)}</Text>
                    </View>
                  )}
                  {todo.hasAlarm && (
                    <View style={styles.alarmBadge}>
                      <Ionicons name="alarm-outline" size={12} color="#27AE60" />
                      <Text style={styles.alarmText}>Alarm set</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => deleteTodo(todo.id)}>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTodoId ? 'Edit Task' : 'New Task'}</Text>
              <TouchableOpacity onPress={resetModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Task Name"
              value={newTodoText}
              onChangeText={setNewTodoText}
              autoFocus
            />

            <TextInput
              style={[styles.modalInput, styles.textArea]}
              placeholder="Description (Optional)"
              value={newTodoDesc}
              onChangeText={setNewTodoDesc}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Priority</Text>
            <View style={styles.prioritySelector}>
              {(['low', 'medium', 'high'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    newTodoPriority === p && { backgroundColor: getPriorityColor(p) }
                  ]}
                  onPress={() => setNewTodoPriority(p)}
                >
                  <Text style={[
                    styles.priorityOptionText,
                    newTodoPriority === p && { color: 'white' }
                  ]}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Task Time</Text>
            <View style={styles.timeSelectionRow}>
              <TouchableOpacity 
                style={styles.timePickerBtn}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timePickerText}>
                  {formatTimeDisplay(reminderTime)}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.formatToggle}
                onPress={() => setIs24Hour(!is24Hour)}
              >
                <Text style={styles.formatToggleText}>{is24Hour ? '24h' : '12h'}</Text>
              </TouchableOpacity>
            </View>
            
            {Platform.OS !== 'web' && (
              <View>
                <TouchableOpacity 
                  style={styles.alarmToggle} 
                  onPress={() => setSetAlarm(!setAlarm)}
                >
                  <Ionicons 
                    name={setAlarm ? "alarm" : "alarm-outline"} 
                    size={24} 
                    color={setAlarm ? "#27AE60" : "#666"} 
                  />
                  <Text style={[styles.alarmToggleText, setAlarm && styles.activeAlarmText]}>
                    Set Reminder Alarm
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={addTodo}>
              <Text style={styles.saveBtnText}>{editingTodoId ? 'Update Task' : 'Save Task'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTimePicker}
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerContainer}>
            <Text style={[styles.modalTitle, { textAlign: 'center', marginBottom: 20 }]}>Select Time</Text>
            
            <View style={styles.timePickerRows}>
              {/* Hours Column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <ScrollView 
                  style={styles.pickerScroll} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 80 }}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const h = (i + 1).toString().padStart(2, '0');
                    const currentH = parseInt(reminderTime.split(':')[0]);
                    const currentM = reminderTime.split(':')[1];
                    const isPM = currentH >= 12;
                    
                    // Convert 24h to 12h for display comparison
                    const displayH = currentH % 12 || 12;
                    const isSelected = displayH === parseInt(h);
                    
                    return (
                      <TouchableOpacity 
                        key={i} 
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          let newH = parseInt(h);
                          if (isPM && newH !== 12) newH += 12;
                          if (!isPM && newH === 12) newH = 0;
                          setReminderTime(`${newH.toString().padStart(2, '0')}:${currentM}`);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minutes Column */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <ScrollView 
                  style={styles.pickerScroll} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 80 }}
                >
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => {
                    const isSelected = reminderTime.endsWith(m);
                    return (
                      <TouchableOpacity 
                        key={m} 
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => setReminderTime(`${reminderTime.split(':')[0]}:${m}`)}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* AM/PM Column */}
              <View style={[styles.pickerColumn, { marginLeft: 10 }]}>
                <Text style={styles.pickerLabel}>AM/PM</Text>
                <View style={styles.amPmContainer}>
                  {['AM', 'PM'].map((period) => {
                    const currentH = parseInt(reminderTime.split(':')[0]);
                    const isPM = currentH >= 12;
                    const isSelected = (period === 'PM' && isPM) || (period === 'AM' && !isPM);
                    
                    return (
                      <TouchableOpacity 
                        key={period}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          let newH = currentH;
                          if (period === 'AM' && isPM) newH -= 12;
                          if (period === 'PM' && !isPM) newH += 12;
                          setReminderTime(`${newH.toString().padStart(2, '0')}:${reminderTime.split(':')[1]}`);
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.modalBtn, styles.saveBtn, { marginTop: 20 }]} 
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FDF9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2E9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 16,
  },
  scrollContent: {
    padding: 16,
  },
  calendarCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
    paddingBottom: 16,
  },
  todayBtn: {
    alignSelf: 'center', 
    paddingVertical: 8,
    paddingHorizontal: 16, 
    borderRadius: 20,
    backgroundColor: '#E0F2E9',
    marginTop: 8,
  },
  todayBtnText: {
    color: '#27AE60',
    fontWeight: '600',
    fontSize: 14,
  },
  tasksHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700', 
    color: '#1A1A1A',
  },
  addBtn: {
    backgroundColor: '#27AE60',
    width: 36,
    height: 36, 
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  templatesSection: {
    marginBottom: 20,
  },
  templateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  templateScroll: {
    flexDirection: 'row',
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  templateItemText: {
    fontSize: 13,
    color: '#27AE60',
    fontWeight: '600',
    marginLeft: 6,
  },
  todoItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5, 
    elevation: 2,
  },
  checkbox: {
    width: 24,    height: 24,
    borderRadius: 12, 
    borderWidth: 2,
    borderColor: '#27AE60',
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
  },
  checked: {
    backgroundColor: '#27AE60',
  },
  todoTextContainer: {
    flex: 1,
  },
  todoHeaderRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 2,
  },
  todoText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  todoDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#AAA', 
  },
  alarmBadge: {
    flexDirection: 'row', 
    alignItems: 'center', 
  },
  timeAndAlarmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  alarmText: {
    fontSize: 12,
    color: '#27AE60',
    marginLeft: 4,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    color: '#AAA',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', 
    padding: 20, 
  },
  modalContent: {
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1A1A1A',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80, 
    textAlignVertical: 'top', 
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  prioritySelector: {
    flexDirection: 'row', 
    marginBottom: 20,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center', 
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '700', 
    color: '#666',
  },
  alarmToggle: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  alarmToggleText: {
    marginLeft: 10,
    fontSize: 16, 
    color: '#666',
  },
  activeAlarmText: {
    color: '#27AE60',
    fontWeight: '600',
  },
  timeSelectionRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 8,
  },
  timePickerBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12, 
    borderRadius: 8,
    backgroundColor: 'white', 
    alignItems: 'center', 
  },
  timePickerText: {
    fontSize: 16, 
    fontWeight: '600', 
    color: '#27AE60',
  },
  formatToggle: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 12, 
    borderRadius: 8,
    backgroundColor: '#E0F2E9',
  },
  formatToggleText: {
    fontSize: 14,
    fontWeight: '700', 
    color: '#27AE60',
  },
  timePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  timePickerRows: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginVertical: 10,
  },
  pickerColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  amPmContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pickerScroll: {
    width: '100%',
    flex: 1,
  },
  pickerItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 4,
    width: '80%',
    alignSelf: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#E0F2E9',
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  pickerItemText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '500',
  },
  pickerItemTextSelected: {
    color: '#27AE60',
    fontWeight: '700',
    fontSize: 22,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '300',
    color: '#DDD',
    marginHorizontal: 15,
    paddingTop: 20, // Align with the items
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#F5F5F5',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#27AE60',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
