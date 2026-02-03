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
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Storage } from '../services/storage';

const { width } = Dimensions.get('window');

type TabType = 'standard' | 'farmer';

export const CalculatorScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('standard');
  const [showHelp, setShowHelp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ expression: string, result: string }>>([]);

  // Standard Calculator State
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState<number>(0);
  const [prevValue, setPrevValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Farmer Calculator State
  const [farmerCalcType, setFarmerCalcType] = useState<'seed' | 'fertilizer' | 'units' | 'yield' | 'volume'>('seed');
  const [inputs, setInputs] = useState<any>({});
  const [farmerResult, setFarmerResult] = useState<string | null>(null);
  const [unitType, setUnitType] = useState('acres_to_hectares');

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    const savedMemory = await Storage.getItem('calc_memory');
    if (savedMemory) setMemory(parseFloat(savedMemory));
  };

  const saveMemory = async (val: number) => {
    setMemory(val);
    await Storage.setItem('calc_memory', val.toString());
  };

  /* --- Standard Calculator Logic --- */
  const handleDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue == null) {
      setPrevValue(display);
    } else if (operator) {
      const currentValue = parseFloat(prevValue) || 0;
      const newValue = performCalculation(currentValue, inputValue, operator);
      setPrevValue(String(newValue));
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const performCalculation = (prev: number, current: number, op: string) => {
    switch (op) {
      case '+': return prev + current;
      case '-': return prev - current;
      case '*': return prev * current;
      case '/': return prev / current;
      case '%': return (prev * current) / 100;
      default: return current;
    }
  };

  const handleEqual = () => {
    if (!operator || prevValue == null) return;
    const inputValue = parseFloat(display);
    const currentValue = parseFloat(prevValue);
    const newValue = performCalculation(currentValue, inputValue, operator);

    // Add to history
    const exp = `${currentValue} ${operator} ${inputValue}`;
    setHistory(prev => [{ expression: exp, result: String(newValue) }, ...prev].slice(0, 50));

    setDisplay(String(newValue));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handlePlusMinus = () => {
    const value = parseFloat(display);
    if (value > 0) {
      setDisplay('-' + display);
    } else if (value < 0) {
      setDisplay(display.slice(1));
    }
  };

  const handleMemory = (type: 'M+' | 'M-' | 'MR' | 'MC') => {
    const currentVal = parseFloat(display);
    switch (type) {
      case 'M+': saveMemory(memory + currentVal); break;
      case 'M-': saveMemory(memory - currentVal); break;
      case 'MR': setDisplay(String(memory)); break;
      case 'MC': saveMemory(0); break;
    }
  };

  /* --- Farmer Calculator Logic --- */
  const calculateFarmer = () => {
    try {
      if (farmerCalcType === 'seed') {
        const area = parseFloat(inputs.area);
        const rate = parseFloat(inputs.rate);
        if (area && rate) {
          const total = area * rate;
          setFarmerResult(`${total.toFixed(2)} kg of seeds required for ${area} acres.`);
        } else {
          Alert.alert("Input Error", "Please enter both area and seed rate.");
        }
      } else if (farmerCalcType === 'fertilizer') {
        const area = parseFloat(inputs.area);
        const n = parseFloat(inputs.n) || 0;
        const p = parseFloat(inputs.p) || 0;
        const k = parseFloat(inputs.k) || 0;
        if (area) {
          const totalN = area * n;
          const totalP = area * p;
          const totalK = area * k;
          setFarmerResult(`Total Requirement for ${area} Acres:\n• Nitrogen (N): ${totalN.toFixed(1)} kg\n• Phosphorus (P): ${totalP.toFixed(1)} kg\n• Potassium (K): ${totalK.toFixed(1)} kg`);
        } else {
          Alert.alert("Input Error", "Please enter the area.");
        }
      } else if (farmerCalcType === 'units') {
        const val = parseFloat(inputs.value);
        if (val) {
          switch (unitType) {
            case 'acres_to_hectares': setFarmerResult(`${val} Acres = ${(val * 0.4046).toFixed(3)} Hectares`); break;
            case 'hectares_to_acres': setFarmerResult(`${val} Hectares = ${(val * 2.471).toFixed(3)} Acres`); break;
            case 'kg_to_quintal': setFarmerResult(`${val} kg = ${(val / 100).toFixed(2)} Quintals`); break;
            case 'quintal_to_kg': setFarmerResult(`${val} Quintals = ${(val * 100).toFixed(0)} kg`); break;
            case 'meters_to_feet': setFarmerResult(`${val} Meters = ${(val * 3.2808).toFixed(2)} Feet`); break;
          }
        }
      } else if (farmerCalcType === 'yield') {
        const area = parseFloat(inputs.area);
        const avgYield = parseFloat(inputs.avgYield);
        if (area && avgYield) {
          const totalYield = area * avgYield;
          setFarmerResult(`Estimated Total Yield: ${totalYield.toFixed(2)} Quintals\nExpected Revenue: ₹${(totalYield * 2200).toLocaleString()} (est. @ ₹2200/q)`);
        }
      } else if (farmerCalcType === 'volume') {
        const l = parseFloat(inputs.length);
        const w = parseFloat(inputs.width);
        const h = parseFloat(inputs.height);
        if (l && w && h) {
          const vol = l * w * h;
          const liters = vol * 1000;
          setFarmerResult(`Volume: ${vol.toFixed(2)} m³\nWater Capacity: ${liters.toLocaleString()} Liters\nIdeal for: ${Math.floor(liters / 500)} storage tanks (500L each)`);
        }
      }
    } catch (e) {
      console.error("Calculation error:", e);
      Alert.alert("Error", "Something went wrong with the calculation.");
    }
  };

  const renderStandardCalc = () => (
    <View style={styles.standardCalc}>
      <View style={styles.display}>
        <Text style={styles.displayText} numberOfLines={1}>{display}</Text>
      </View>

      <View style={styles.memoryRow}>
        {['MC', 'MR', 'M-', 'M+'].map(btn => (
          <TouchableOpacity key={btn} style={styles.memBtnSmall} onPress={() => handleMemory(btn as any)}>
            <Text style={styles.memBtnTextSmall}>{btn}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonGrid}>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.specialBtn]} onPress={handleClear}>
            <Text style={styles.specialBtnText}>AC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.specialBtn]} onPress={handleBackspace}>
            <Ionicons name="backspace-outline" size={24} color="#27AE60" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.specialBtn]} onPress={() => handleOperator('%')}>
            <Text style={styles.specialBtnText}>%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleOperator('/')}>
            <Text style={styles.opBtnText}>÷</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          {['7', '8', '9'].map(num => (
            <TouchableOpacity key={num} style={[styles.btn, styles.numBtn]} onPress={() => handleDigit(num)}>
              <Text style={styles.numBtnText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleOperator('*')}>
            <Text style={styles.opBtnText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          {['4', '5', '6'].map(num => (
            <TouchableOpacity key={num} style={[styles.btn, styles.numBtn]} onPress={() => handleDigit(num)}>
              <Text style={styles.numBtnText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleOperator('-')}>
            <Text style={styles.opBtnText}>−</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          {['1', '2', '3'].map(num => (
            <TouchableOpacity key={num} style={[styles.btn, styles.numBtn]} onPress={() => handleDigit(num)}>
              <Text style={styles.numBtnText}>{num}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleOperator('+')}>
            <Text style={styles.opBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.numBtn]} onPress={handlePlusMinus}>
            <Text style={styles.numBtnText}>±</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.numBtn]} onPress={() => handleDigit('0')}>
            <Text style={styles.numBtnText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.numBtn]} onPress={() => handleDigit('.')}>
            <Text style={styles.numBtnText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.equalBtn]} onPress={handleEqual}>
            <Text style={styles.equalBtnText}>=</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFarmerCalc = () => {
    const farmerTabs = [
      { id: 'seed', label: 'Seed', icon: 'leaf-outline' },
      { id: 'fertilizer', label: 'Fertilizer', icon: 'flask-outline' },
      { id: 'units', label: 'Units', icon: 'swap-horizontal-outline' },
      { id: 'yield', label: 'Yield', icon: 'trending-up-outline' },
      { id: 'volume', label: 'Volume', icon: 'cube-outline' },
    ];

    return (
      <ScrollView style={styles.farmerCalc} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.farmerTabsContainer}>
          {farmerTabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.farmerTab, farmerCalcType === tab.id && styles.activeFarmerTab]}
              onPress={() => { setFarmerCalcType(tab.id as any); setFarmerResult(null); setInputs({}); }}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={farmerCalcType === tab.id ? '#27AE60' : '#666'}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.farmerTabText, farmerCalcType === tab.id && styles.activeFarmerTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputCard}>
          {farmerCalcType === 'seed' && (
            <>
              <Text style={styles.inputLabel}>Area (Acres)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="5" value={inputs.area} onChangeText={v => setInputs({ ...inputs, area: v })} />
              <Text style={styles.inputLabel}>Seed Rate (kg/Acre)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="40" value={inputs.rate} onChangeText={v => setInputs({ ...inputs, rate: v })} />
            </>
          )}
          {farmerCalcType === 'fertilizer' && (
            <>
              <Text style={styles.inputLabel}>Area (Acres)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="5" value={inputs.area} onChangeText={v => setInputs({ ...inputs, area: v })} />
              <Text style={styles.inputLabel}>Nitrogen (N) kg/Acre</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="50" value={inputs.n} onChangeText={v => setInputs({ ...inputs, n: v })} />
              <Text style={styles.inputLabel}>Phosphorus (P) kg/Acre</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="25" value={inputs.p} onChangeText={v => setInputs({ ...inputs, p: v })} />
              <Text style={styles.inputLabel}>Potassium (K) kg/Acre</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="25" value={inputs.k} onChangeText={v => setInputs({ ...inputs, k: v })} />
            </>
          )}
          {farmerCalcType === 'units' && (
            <>
              <Text style={styles.inputLabel}>Select Conversion</Text>
              <View style={styles.unitSelector}>
                {[
                  { id: 'acres_to_hectares', label: 'Acres → Hectares' },
                  { id: 'hectares_to_acres', label: 'Hectares → Acres' },
                  { id: 'kg_to_quintal', label: 'kg → Quintal' },
                  { id: 'quintal_to_kg', label: 'Quintal → kg' },
                  { id: 'meters_to_feet', label: 'Meters → Feet' },
                ].map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.unitOption, unitType === u.id && styles.activeUnitOption]}
                    onPress={() => { setUnitType(u.id); setFarmerResult(null); }}
                  >
                    <Text style={[styles.unitOptionText, unitType === u.id && styles.activeUnitOptionText]}>{u.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Value to Convert</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="10" value={inputs.value} onChangeText={v => setInputs({ ...inputs, value: v })} />
            </>
          )}
          {farmerCalcType === 'yield' && (
            <>
              <Text style={styles.inputLabel}>Area (Acres)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="5" value={inputs.area} onChangeText={v => setInputs({ ...inputs, area: v })} />
              <Text style={styles.inputLabel}>Average Yield (Quintals/Acre)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="20" value={inputs.avgYield} onChangeText={v => setInputs({ ...inputs, avgYield: v })} />
            </>
          )}
          {farmerCalcType === 'volume' && (
            <>
              <Text style={styles.inputLabel}>Length (Meters)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="10" value={inputs.length} onChangeText={v => setInputs({ ...inputs, length: v })} />
              <Text style={styles.inputLabel}>Width (Meters)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="5" value={inputs.width} onChangeText={v => setInputs({ ...inputs, width: v })} />
              <Text style={styles.inputLabel}>Height (Meters)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="2" value={inputs.height} onChangeText={v => setInputs({ ...inputs, height: v })} />
            </>
          )}

          <TouchableOpacity style={styles.calculateBtn} onPress={calculateFarmer}>
            <Text style={styles.calculateBtnText}>Calculate</Text>
          </TouchableOpacity>

          {farmerResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Result:</Text>
              <Text style={styles.resultText}>{farmerResult}</Text>
            </View>
          )}
        </View>

        <View style={styles.templateCard}>
          <Text style={styles.templateTitle}>Common Templates</Text>
          <TouchableOpacity style={styles.templateItem} onPress={() => { setFarmerCalcType('seed'); setInputs({ area: '1', rate: '50' }); }}>
            <Text style={styles.templateText}>🌾 Wheat Seed (50kg/Acre)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.templateItem} onPress={() => { setFarmerCalcType('fertilizer'); setInputs({ area: '1', n: '40', p: '20', k: '20' }); }}>
            <Text style={styles.templateText}>🍚 Rice Fertilizer (NPK 40:20:20)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.templateItem} onPress={() => { setFarmerCalcType('yield'); setInputs({ area: '1', avgYield: '25' }); }}>
            <Text style={styles.templateText}>🌽 Corn Yield (25 Quintals/Acre)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AgriSaarthi Calculators</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={{ marginRight: 15 }}>
            <Ionicons name="time-outline" size={24} color="#27AE60" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowHelp(true)}>
            <Ionicons name="help-circle-outline" size={24} color="#27AE60" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'standard' && styles.activeMainTab]}
          onPress={() => setActiveTab('standard')}
        >
          <Text style={[styles.mainTabText, activeTab === 'standard' && styles.activeMainTabText]}>Standard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'farmer' && styles.activeMainTab]}
          onPress={() => setActiveTab('farmer')}
        >
          <Text style={[styles.mainTabText, activeTab === 'farmer' && styles.activeMainTabText]}>Farmer</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'standard' ? renderStandardCalc() : renderFarmerCalc()}

      <Modal visible={showHelp} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Calculator Help</Text>
            <Text style={styles.helpText}>• Standard: Basic math with memory (MC/MR) and percentage.</Text>
            <Text style={styles.helpText}>• Seed: Calculate total seed weight for your land area.</Text>
            <Text style={styles.helpText}>• Fertilizer: Calculate NPK requirements in kg.</Text>
            <Text style={styles.helpText}>• Units: Quickly convert between common farm units.</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowHelp(false)}>
              <Text style={styles.closeBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={styles.modalTitle}>History</Text>
              <TouchableOpacity onPress={() => setHistory([])}>
                <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {history.length === 0 ? (
                <Text style={styles.helpText}>No history yet.</Text>
              ) : (
                history.map((item, index) => (
                  <View key={index} style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 }}>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>{item.expression}</Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#27AE60' }}>= {item.result}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowHistory(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FDF9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'white' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A' },
  backBtn: { padding: 4 },
  mainTabs: { flexDirection: 'row', padding: 10, backgroundColor: 'white' },
  mainTab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F0F4F2', marginHorizontal: 5 },
  activeMainTab: { backgroundColor: '#27AE60' },
  mainTabText: { fontWeight: '700', color: '#666' },
  activeMainTabText: { color: 'white' },

  // Standard Calc
  standardCalc: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
    backgroundColor: 'white',
    marginTop: 8,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  display: {
    height: 100,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    justifyContent: 'center',
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  displayText: {
    color: '#2C3E50',
    fontSize: 48,
    textAlign: 'right',
    fontWeight: '600'
  },
  memoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  memBtnSmall: {
    backgroundColor: '#F1F3F5',
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center'
  },
  memBtnTextSmall: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '700'
  },
  buttonGrid: {
    flex: 1,
    marginTop: 10,
  },
  btn: {
    width: (width - 48) / 4, // Increased size (removed padding calc)
    height: (width - 48) / 4,
    borderRadius: 24, // Rounder
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12, // Spacing between rows
  },
  numBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EDEFEF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5
  },
  numBtnText: {
    fontSize: 40, // Increased from 32
    color: '#2C3E50',
    fontWeight: '600'
  },
  opBtn: {
    backgroundColor: '#E7F5FF',
    elevation: 4,
    shadowColor: '#228BE6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  opBtnText: {
    fontSize: 44, // Increased from 36
    color: '#228BE6',
    fontWeight: '500'
  },
  specialBtn: {
    backgroundColor: '#F3F0FF',
    elevation: 4,
  },
  specialBtnText: {
    fontSize: 30, // Increased from 24
    color: '#7950F2',
    fontWeight: '700'
  },
  equalBtn: {
    backgroundColor: '#27AE60',
    elevation: 6,
    shadowColor: '#27AE60',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  equalBtnText: {
    fontSize: 48, // Increased from 38
    color: 'white',
    fontWeight: '400'
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 0 // Handled by btn marginBottom
  },

  // Farmer Calc
  farmerCalc: { flex: 1, padding: 16 },
  farmerTabsContainer: { flexDirection: 'row', marginBottom: 20 },
  farmerTab: { paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#E0F2E9', marginRight: 10 },
  activeFarmerTab: { borderBottomColor: '#27AE60' },
  farmerTabText: { color: '#666', fontWeight: '600' },
  activeFarmerTabText: { color: '#27AE60' },
  inputCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 3 },
  inputLabel: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, fontSize: 16 },
  unitSelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  unitOption: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F0F4F2', borderRadius: 20, marginRight: 8, marginBottom: 8 },
  activeUnitOption: { backgroundColor: '#27AE60' },
  unitOptionText: { fontSize: 12, color: '#666', fontWeight: '600' },
  activeUnitOptionText: { color: 'white' },
  calculateBtn: { backgroundColor: '#27AE60', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  calculateBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  resultBox: { marginTop: 20, padding: 15, backgroundColor: '#F5FDF9', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#27AE60' },
  resultLabel: { color: '#666', fontSize: 12, marginBottom: 4 },
  resultText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  templateCard: { marginTop: 24, backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 30 },
  templateTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  templateItem: { padding: 12, backgroundColor: '#F9F9F9', borderRadius: 8, marginBottom: 10 },
  templateText: { color: '#444' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#1A1A1A' },
  helpText: { fontSize: 15, color: '#444', marginBottom: 10, lineHeight: 22 },
  closeBtn: { backgroundColor: '#27AE60', padding: 12, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  closeBtnText: { color: 'white', fontWeight: 'bold' },
});
