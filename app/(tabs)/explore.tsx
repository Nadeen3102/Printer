import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useStripeTerminal } from '@stripe/stripe-terminal-react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// CONFIGURATION - UPDATE THESE!
const SERVER_URL = 'https://printer-production-cc72.up.railway.app';


export default function StripePaymentScreen() {
  const [status, setStatus] = useState('Initializing...');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | ''>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [locationId, setLocationId] = useState<string>('');

  const {
    initialize,
    discoverReaders,
    connectReader,
    collectPaymentMethod,
    processPayment,
    cancelDiscovering,
    connectedReader,
    discoveredReaders,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      console.log('Discovered readers:', readers);
      if (readers.length > 0) {
        showStatus(`Found ${readers.length} reader(s)`, 'success');
      }
    },
  });

  useEffect(() => {
    initializeTerminal();
  }, []);

  const initializeTerminal = async () => {
    try {
      const result = await initialize();
      if (result.error) {
        showStatus(`Init error: ${result.error.message}`, 'error');
      } else {
        showStatus('Terminal initialized ✅', 'success');
        createLocation();
      }
    } catch (err: any) {
      showStatus(`Failed to init: ${err.message}`, 'error');
    }
  };

  const createLocation = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/create-location`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data?.location?.id) {
        setLocationId(data.location.id);
        console.log('Location ID:', data.location.id);
        showStatus('Location ready ✅', 'success');
      }
    } catch (err: any) {
      console.log('Location setup:', err.message);
      // Not critical - can proceed without it
    }
  };

  const showStatus = (message: string, type: 'success' | 'error' | 'warning' | '') => {
    setStatus(message);
    setStatusType(type);
  };

  const getStatusColor = () => {
    switch (statusType) {
      case 'success': return '#2ecc71';
      case 'error': return '#e74c3c';
      case 'warning': return '#f39c12';
      default: return '#bdc3c7';
    }
  };

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 31) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          return (
            granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
            granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Discover readers - Simulated for testing
  const handleDiscoverSimulated = async () => {
    if (isDiscovering) {
      showStatus('Already discovering...', 'warning');
      return;
    }

    setIsDiscovering(true);
    showStatus('Discovering simulated readers...', '');

    try {
      const { error } = await discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: true,
      });

      if (error) {
        showStatus(`Discovery failed: ${error.message}`, 'error');
      } else {
        showStatus('Discovery complete - check readers list', 'success');
      }
    } catch (err: any) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Discover real Bluetooth readers
  const handleDiscoverBluetooth = async () => {
    if (isDiscovering) {
      showStatus('Already discovering...', 'warning');
      return;
    }

    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      showStatus('Bluetooth permissions denied', 'error');
      return;
    }

    setIsDiscovering(true);
    showStatus('Scanning for Bluetooth readers...', '');

    try {
      const { error } = await discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: false,
      });

      if (error) {
        showStatus(`Scan failed: ${error.message}`, 'error');
      } else {
        showStatus('Scan complete', 'success');
      }
    } catch (err: any) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Test Tap to Pay (built-in NFC)
  const handleTestTapToPay = async () => {
    if (isDiscovering) {
      showStatus('Already discovering...', 'warning');
      return;
    }

    setIsDiscovering(true);
    showStatus('Checking Tap to Pay...', '');

    try {
      const { error } = await discoverReaders({
        discoveryMethod: 'tapToPay',
      });

      if (error) {
        showStatus(`Tap to Pay NOT supported: ${error.message}`, 'error');
        Alert.alert(
          '❌ Not Compatible',
          `This device doesn't support Tap to Pay.\n\nYou'll need an external Stripe-certified reader.`,
          [{ text: 'OK' }]
        );
      } else {
        showStatus('✅ Tap to Pay SUPPORTED!', 'success');
        Alert.alert(
          '🎉 Success!',
          'This device SUPPORTS Tap to Pay!\n\nYou can accept contactless payments using built-in NFC.',
          [{ text: 'Awesome!' }]
        );
      }
    } catch (err: any) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      setIsDiscovering(false);
      await cancelDiscovering();
    }
  };

  // Connect to a discovered reader
  const handleConnectReader = async (reader: any) => {
    showStatus('Connecting to reader...', '');
    setIsProcessing(true);

    try {
      const { error } = await connectReader({
        reader,
      });

      if (error) {
        showStatus(`Connection failed: ${error.message}`, 'error');
      } else {
        setIsConnected(true);
        showStatus(`Connected: ${reader.label || reader.deviceType} ✅`, 'success');
        Alert.alert('Success', 'Ready to accept payments!');
      }
    } catch (err: any) {
      showStatus(`Error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process payment
  const handleProcessPayment = async (amountInCents: number) => {
    if (!connectedReader) {
      Alert.alert('Error', 'No reader connected');
      return;
    }

    setIsProcessing(true);
    const amount = (amountInCents / 100).toFixed(2);
    showStatus(`Creating payment for $${amount}...`, '');

    try {
      // Step 1: Create payment intent
      const response = await fetch(`${SERVER_URL}/create_payment_intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInCents,
          currency: 'usd',
        }),
      });

      const data = await response.json();
      
      if (!data.client_secret && !data.clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      const clientSecret = data.client_secret || data.clientSecret;
      showStatus('Present card to reader...', '');

      // Step 2: Collect payment method
      const { error: collectError, paymentIntent } = await collectPaymentMethod({
        clientSecret,
      });

      if (collectError) {
        showStatus(`Collection failed: ${collectError.message}`, 'error');
        setIsProcessing(false);
        return;
      }

      showStatus('Processing payment...', '');

      // Step 3: Process payment
      const { error: processError } = await processPayment({
        paymentIntent,
      });

      if (processError) {
        showStatus(`Payment failed: ${processError.message}`, 'error');
        Alert.alert('Payment Failed', processError.message);
      } else {
        showStatus(`✅ Payment of $${amount} successful!`, 'success');
        Alert.alert('Success!', `Payment of $${amount} completed!`);
      }
    } catch (err: any) {
      showStatus(`Error: ${err.message}`, 'error');
      Alert.alert('Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Stripe Terminal Payment
        </ThemedText>

        {/* Status Display */}
        <View style={[styles.statusBox, { borderColor: getStatusColor() }]}>
          <ThemedText style={{ color: getStatusColor() }}>{status}</ThemedText>
        </View>

        {/* Connected Reader Info */}
        {connectedReader && (
          <View style={styles.connectedBox}>
            <ThemedText style={styles.connectedText}>
              🔌 Connected: {connectedReader.label || connectedReader.deviceType}
            </ThemedText>
          </View>
        )}

        {/* Discovery Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Discovery Options</ThemedText>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleDiscoverSimulated}
            disabled={isDiscovering || isProcessing}
          >
            {isDiscovering ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🧪 Discover Simulated Readers</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleDiscoverBluetooth}
            disabled={isDiscovering || isProcessing}
          >
            <Text style={styles.buttonText}>🔵 Discover Bluetooth Readers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.accentButton]}
            onPress={handleTestTapToPay}
            disabled={isDiscovering || isProcessing}
          >
            <Text style={styles.buttonText}>📱 Test Tap to Pay (Built-in NFC)</Text>
          </TouchableOpacity>

          <ThemedText style={styles.helpText}>
            Try Tap to Pay first - it uses your device's built-in NFC!
          </ThemedText>
        </ThemedView>

        {/* Discovered Readers List */}
        {discoveredReaders && discoveredReaders.length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Available Readers ({discoveredReaders.length})</ThemedText>
            
            {discoveredReaders.map((reader: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.readerItem}
                onPress={() => handleConnectReader(reader)}
                disabled={isProcessing}
              >
                <View>
                  <Text style={styles.readerText}>
                    {reader.label || reader.deviceType || 'Unknown Reader'}
                  </Text>
                  <Text style={styles.readerSubtext}>
                    {reader.serialNumber || 'Simulated'} • {reader.deviceType}
                  </Text>
                </View>
                <Text style={styles.connectArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ThemedView>
        )}

        {/* Payment Buttons */}
        {isConnected && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle">Process Payment</ThemedText>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => handleProcessPayment(1000)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Pay $10.00</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => handleProcessPayment(2500)}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>Pay $25.00</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => handleProcessPayment(5000)}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>Pay $50.00</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.successButton]}
              onPress={() => handleProcessPayment(10000)}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>Pay $100.00</Text>
            </TouchableOpacity>
          </ThemedView>
        )}

        {/* Instructions */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Instructions</ThemedText>
          <ThemedText style={styles.instructionsText}>
            1. Click "Test Tap to Pay" to check if your device supports built-in NFC{'\n'}
            2. If not supported, try "Discover Bluetooth Readers" for external hardware{'\n'}
            3. Tap a reader to connect{'\n'}
            4. Choose payment amount{'\n'}
            5. Present card to NFC reader{'\n'}
            6. Wait for confirmation
          </ThemedText>
        </ThemedView>

        {/* Test Cards Info */}
        <ThemedView style={[styles.section, styles.testInfoBox]}>
          <ThemedText style={styles.testInfoTitle}>Test Cards</ThemedText>
          <ThemedText style={styles.testInfoText}>
            Visa: 4242 4242 4242 4242{'\n'}
            Mastercard: 5555 5555 5555 4444{'\n'}
            Declined: 4000 0000 0000 0002{'\n'}
            Exp: Any future date • CVC: Any 3 digits
          </ThemedText>
        </ThemedView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  statusBox: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  connectedBox: {
    backgroundColor: '#d4edda',
    borderColor: '#2ecc71',
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  connectedText: {
    color: '#155724',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#9b59b6',
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
  accentButton: {
    backgroundColor: '#FF6B35',
  },
  successButton: {
    backgroundColor: '#2ecc71',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  readerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  readerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  readerSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  connectArrow: {
    fontSize: 24,
    color: '#635BFF',
    fontWeight: 'bold',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  testInfoBox: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  testInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  testInfoText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 22,
  },
});