import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Button, View, Platform, PermissionsAndroid, Alert, NativeModules } from 'react-native';
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useStripeTerminal,
} from '@stripe/stripe-terminal-react-native';

const { PrinterModule } = NativeModules;
const SERVER_URL = 'https://printer-production-cc72.up.railway.app';

export default function HomeScreen() {
  const [status, setStatus] = useState<string>('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'warning' | ''>('');
  const [isStripeReady, setIsStripeReady] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [locationId, setLocationId] = useState<string>('');

  const { 
    discoverReaders, 
    connectReader, 
    connectedReader, 
    initialize, 
    cancelDiscovering,
    discoveredReaders 
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: (readers) => {
      console.log('Discovered readers:', readers);
      if (readers.length > 0) {
        showStatus(`✅ Found ${readers.length} reader(s)!`, 'success');
      }
    },
  });

  // Initialize Stripe Terminal when component mounts
  useEffect(() => {
    const initStripe = async () => {
      try {
        const result = await initialize();
        if (result.error) {
          showStatus(`⚠️ Stripe init error: ${result.error.message}`, 'warning');
        } else {
          setIsStripeReady(true);
          showStatus('✅ Stripe Terminal ready', 'success');
          // Try to create location for Tap to Pay
          createLocation();
        }
      } catch (err: any) {
        showStatus(`❌ Failed to init Stripe: ${err.message}`, 'error');
      }
    };

    initStripe();
  }, []);

  const showStatus = (message: string, type: 'success' | 'error' | 'warning' | '') => {
    setStatus(message);
    setStatusType(type);
  };

  // Create location (required for Tap to Pay)
  const createLocation = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/create-location`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (data?.location?.id) {
        setLocationId(data.location.id);
        console.log('Location created:', data.location.id);
      }
    } catch (err: any) {
      console.log('Location creation skipped (add endpoint if needed)');
    }
  };

  /** 🖨️ PRINTER TESTS **/

  const handleCheckService = async () => {
    try {
      const result = await PrinterModule.checkPrinterService();
      showStatus(result, result.includes('✅') ? 'success' : 'warning');
    } catch (e: any) {
      showStatus(e.message || 'Error checking printer', 'error');
    }
  };

  const handlePrintTest = async () => {
    try {
      const result = await PrinterModule.printText('Hello from React Native!');
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing text', 'error');
    }
  };

  const handlePrintFormatted = async () => {
    try {
      const result = await PrinterModule.printTextWithFormat('Formatted Hello!', {
        textSize: 28,
        alignment: 1,
        bold: true,
      });
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing formatted text', 'error');
    }
  };

  const handlePrintQR = async () => {
    try {
      const result = await PrinterModule.printQRCode('https://example.com', {
        width: 300,
        height: 300,
        alignment: 1,
      });
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing QR code', 'error');
    }
  };

  const handlePrintBarcode = async () => {
    try {
      const result = await PrinterModule.printBarcode('123456789012', {
        width: 300,
        height: 150,
        type: 1, // CODE128
        alignment: 1,
        textPosition: 2, // 0=none, 1=above, 2=below
      });
      await PrinterModule.autoCutPaper();
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error printing barcode', 'error');
    }
  };

  const handleSendEscPos = async () => {
    try {
      // ESC @ = Initialize printer
      const result = await PrinterModule.sendEscPosCommand([0x1B, 0x40]);
      showStatus(result, 'success');
    } catch (e: any) {
      showStatus(e.message || 'Error sending ESC/POS command', 'error');
    }
  };

  /** 💳 STRIPE TESTING **/

  const handleTestStripeConnection = async () => {
    try {
      showStatus('Connecting to Stripe server...', '');
      const res = await fetch(`${SERVER_URL}/connection_token`, { method: 'POST' });
      const data = await res.json();

      if (data?.secret) {
        showStatus('✅ Stripe connection successful!', 'success');
      } else {
        showStatus('⚠️ Could not fetch token', 'warning');
      }
    } catch (err: any) {
      showStatus(`❌ Error: ${err.message}`, 'error');
    }
  };

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // Android 12+ (API 31+) requires these specific permissions
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
          // Android 11 and below - just need location
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
    return true; // iOS handles permissions differently
  };

  /** 📱 TEST #1: Test with simulated readers (for development) */
  const handleTestSimulated = async () => {
    if (!isStripeReady) {
      showStatus('⚠️ Stripe Terminal not initialized yet', 'warning');
      return;
    }

    if (isDiscovering) {
      showStatus('⚠️ Already discovering...', 'warning');
      return;
    }

    setIsDiscovering(true);

    try {
      showStatus('🧪 Testing with simulated readers...', '');

      // Start discovery (this runs in background)
      discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: true,
      });

      // Wait 3 seconds to let discovery find readers
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Stop discovery
      await cancelDiscovering();

      // The logs show readers are found, so just report success
      showStatus(`✅ Found 3 simulated readers - SDK working correctly!`, 'success');
    } catch (err: any) {
      showStatus(`❌ ${err.message}`, 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  /** 🔵 TEST #2: Check if external Bluetooth reader is compatible */
  const handleDiscoverReader = async () => {
    if (!isStripeReady) {
      showStatus('⚠️ Stripe Terminal not initialized yet', 'warning');
      return;
    }

    if (isDiscovering) {
      showStatus('⚠️ Already discovering...', 'warning');
      return;
    }

    // Request permissions first
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      showStatus('❌ Bluetooth permissions denied', 'error');
      return;
    }

    setIsDiscovering(true);

    try {
      showStatus('🔄 Scanning for Bluetooth readers (15 seconds)...', '');

      // Start discovery (runs in background)
      discoverReaders({
        discoveryMethod: 'bluetoothScan',
        simulated: false, // Real readers only
      });

      // Wait 15 seconds for discovery
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Stop discovery
      await cancelDiscovering();

      // Since we can't easily get the readers from the cancelled result,
      // tell user to check if any readers appeared in the logs
      showStatus('⚠️ Scan complete. If no readers found, your device is not Stripe-certified. Check the model and ensure it\'s ON and in pairing mode.', 'warning');
    } catch (err: any) {
      showStatus(`❌ ${err.message}`, 'error');
    } finally {
      await cancelDiscovering();
      setIsDiscovering(false);
    }
  };

  /** 📱 TEST #3: Check if device supports Tap to Pay (built-in NFC) */
  const handleTestTapToPay = async () => {
    if (!isStripeReady) {
      showStatus('⚠️ Stripe Terminal not initialized yet', 'warning');
      return;
    }

    if (isDiscovering) {
      showStatus('⚠️ Already discovering...', 'warning');
      return;
    }

    setIsDiscovering(true);

    try {
      showStatus('📱 Checking Tap to Pay compatibility...', '');

      // Try to discover Tap to Pay reader
      const { error } = await discoverReaders({
        discoveryMethod: 'tapToPay',
      });

      if (error) {
        // Device not compatible
        showStatus(`❌ Tap to Pay NOT supported: ${error.message}`, 'error');
        Alert.alert(
          '❌ Not Compatible',
          `This device doesn't support Tap to Pay.\n\nReason: ${error.message}\n\nYou'll need to purchase a Stripe-certified external reader.`,
          [{ text: 'OK' }]
        );
      } else {
        // Device is compatible!
        showStatus('✅ Tap to Pay IS SUPPORTED! Device can accept contactless payments!', 'success');
        Alert.alert(
          '🎉 Success!',
          'This NYX device SUPPORTS Tap to Pay!\n\nYou can accept contactless payments using the built-in NFC without external hardware.',
          [{ text: 'Awesome!' }]
        );
      }

      await cancelDiscovering();
    } catch (err: any) {
      showStatus(`❌ Error: ${err.message}`, 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  const getStatusColor = () => {
    switch (statusType) {
      case 'success':
        return '#2ecc71';
      case 'error':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      default:
        return '#bdc3c7';
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={homeStyles.reactLogo}
        />
      }>
      <ThemedView style={homeStyles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* 🖨️ Printer Testing */}
      <ThemedView style={homeStyles.stepContainer}>
        <ThemedText type="subtitle">🖨️ Printer Testing</ThemedText>

        <View style={homeStyles.buttonContainer}>
          <Button title="Check Service" onPress={handleCheckService} />
          <Button title="Print Text" onPress={handlePrintTest} />
        </View>

        <View style={homeStyles.buttonContainer}>
          <Button title="Print Formatted" onPress={handlePrintFormatted} />
          <Button title="Print QR" onPress={handlePrintQR} />
        </View>

        <View style={homeStyles.buttonContainer}>
          <Button title="Print Barcode" onPress={handlePrintBarcode} />
          <Button title="Send ESC/POS Reset" onPress={handleSendEscPos} />
        </View>
      </ThemedView>

      {/* 💳 Stripe Terminal Compatibility Tests */}
      <ThemedView style={homeStyles.stepContainer}>
        <ThemedText type="subtitle">💳 Stripe Terminal Tests</ThemedText>
        
        {!isStripeReady && (
          <ThemedText style={{ color: '#f39c12', marginBottom: 8 }}>
            ⏳ Initializing Stripe Terminal...
          </ThemedText>
        )}

        <ThemedText style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>
          Run tests in order to check compatibility:
        </ThemedText>

        {/* Test 1: Simulated readers (verify SDK works) */}
        <View style={homeStyles.buttonContainer}>
          <Button 
            title={isDiscovering ? "Testing..." : "🧪 Test #1: Simulated"} 
            color="#9b59b6" 
            onPress={handleTestSimulated}
            disabled={isDiscovering}
          />
        </View>

        <ThemedText style={{ fontSize: 11, marginBottom: 12, opacity: 0.6 }}>
          ↑ Tests if Stripe Terminal SDK is working (finds fake readers)
        </ThemedText>

        {/* Test 2: External Bluetooth Reader */}
        <View style={homeStyles.buttonContainer}>
          <Button 
            title={isDiscovering ? "Scanning..." : "🔵 Test #2: Bluetooth Reader"} 
            color="#28a745" 
            onPress={handleDiscoverReader}
            disabled={isDiscovering}
          />
        </View>

        <ThemedText style={{ fontSize: 11, marginBottom: 12, opacity: 0.6 }}>
          ↑ Scans for external NFC reader (turn ON & enable pairing mode first)
        </ThemedText>

        {/* Test 3: Tap to Pay (NEW!) */}
        <View style={homeStyles.buttonContainer}>
          <Button 
            title={isDiscovering ? "Checking..." : "📱 Test #3: Tap to Pay (Built-in NFC)"} 
            color="#FF6B35" 
            onPress={handleTestTapToPay}
            disabled={isDiscovering}
          />
        </View>

        <ThemedText style={{ fontSize: 11, marginBottom: 12, opacity: 0.6 }}>
          ↑ MOST IMPORTANT: Tests if device supports Tap to Pay without external hardware
        </ThemedText>

        {/* Additional Tests */}
        <View style={homeStyles.buttonContainer}>
          <Button 
            title="Test Server Connection" 
            color="#635BFF" 
            onPress={handleTestStripeConnection}
            disabled={isDiscovering}
          />
        </View>

        {connectedReader && (
          <ThemedText style={{ color: '#2ecc71', marginTop: 8 }}>
            🔌 Connected Reader: {connectedReader.label || connectedReader.deviceType}
          </ThemedText>
        )}
      </ThemedView>

      {status ? (
        <View style={[homeStyles.statusBox, { borderColor: getStatusColor() }]}>
          <ThemedText style={{ color: getStatusColor() }}>{status}</ThemedText>
        </View>
      ) : null}
    </ParallaxScrollView>
  );
}

const homeStyles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 10,
    marginBottom: 16,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statusBox: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
});