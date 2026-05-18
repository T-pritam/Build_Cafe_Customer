import React, {useRef, useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Camera, useCameraDevice, useCodeScanner} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Toast from 'react-native-toast-message';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {AuthStackParamList, MainStackParamList} from '../../navigation/types';
import {tablesAPI} from '../../services/api';
import {useCartStore} from '../../store/cartStore';
import {extractTableIdFromQR} from '../../utils/parseQRCode';
import {Colors, Spacing} from '../../theme';

type AuthNav = NativeStackNavigationProp<AuthStackParamList, 'QRScanner'>;
type MainNav = NativeStackNavigationProp<MainStackParamList, 'QRScanner'>;

type Props =
  | {navigation: AuthNav; route: RouteProp<AuthStackParamList, 'QRScanner'>}
  | {navigation: MainNav; route: RouteProp<MainStackParamList, 'QRScanner'>};

export const QRScannerScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {setPendingScan} = useCartStore();
  const scannedRef = useRef(false);
  const processingRef = useRef(false);
  const [processing, setProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const device = useCameraDevice('back');

  useEffect(() => {
    Camera.requestCameraPermission().then(status => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const context = route.params.context;

  const handleBarcode = useCallback(
    async (rawValue: string) => {
      if (scannedRef.current || processingRef.current) {return;}
      const tableId = extractTableIdFromQR(rawValue);
      if (!tableId) {return;}

      scannedRef.current = true;
      processingRef.current = true;
      setProcessing(true);

      try {
        const res = await tablesAPI.scan(tableId);
        const tableNumber = String(res.data.tableNumber).padStart(2, '0');

        if (context === 'auth') {
          setPendingScan({tableId, tableNumber});
          navigation.goBack();
        } else {
          (navigation as MainNav).replace('SessionNamePrompt', {
            tableId,
            tableNumber,
            returnTo: context === 'rescan' ? 'Cart' : undefined,
          });
        }
      } catch (e: any) {
        Toast.show({
          type: 'error',
          text1: 'Could not read QR code',
          text2: e?.message ?? 'Please try again',
        });
        scannedRef.current = false;
        processingRef.current = false;
        setProcessing(false);
      }
    },
    [context, navigation, setPendingScan],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (codes.length > 0 && codes[0].value) {
        handleBarcode(codes[0].value);
      }
    },
  });

  const renderCamera = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.white} size="large" />
        </View>
      );
    }

    if (!hasPermission) {
      return (
        <View style={styles.centered}>
          <Icon name="camera-off" size={48} color={Colors.white} />
          <Text style={styles.permissionText}>Camera permission required</Text>
          <Text style={styles.permissionSub}>
            Enable camera access in Settings to scan table QR codes.
          </Text>
        </View>
      );
    }

    if (!device) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.white} size="large" />
        </View>
      );
    }

    return (
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!processing}
        codeScanner={codeScanner}
      />
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {renderCamera()}

      {/* Close button */}
      <TouchableOpacity
        style={[styles.closeBtn, {top: insets.top + Spacing.sm}]}
        onPress={() => navigation.goBack()}
        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
        <Icon name="close" size={24} color={Colors.white} />
      </TouchableOpacity>

      {/* Scan frame overlay */}
      {hasPermission && device && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          {processing ? (
            <ActivityIndicator
              style={styles.processingSpinner}
              color={Colors.accent}
              size="large"
            />
          ) : (
            <Text style={styles.hint}>Point at a table QR code</Text>
          )}
        </View>
      )}
    </View>
  );
};

const FRAME_SIZE = 240;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  permissionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
  },
  permissionSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 4,
  },
  hint: {
    marginTop: Spacing.lg,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  processingSpinner: {
    marginTop: Spacing.lg,
  },
});
