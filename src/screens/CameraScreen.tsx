import React, {useEffect, useState} from 'react';
import {Alert, Platform, TouchableOpacity} from 'react-native';
import {Box, Button, Text, Image, styled} from '@gluestack-ui/themed';
import {launchCamera} from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import {request, PERMISSIONS} from 'react-native-permissions';
import RNFS from 'react-native-fs';
import {Image as CompressorImage} from 'react-native-compressor';
import LocationManager from '../location/LocationManager';

const CameraScreen = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<{lat: number; lon: number} | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    LocationManager.shared.setup();
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const cameraResult = await request(PERMISSIONS.ANDROID.CAMERA);
        const locationResult = await request(
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        );
        const storageResult =
          Platform.Version >= 33
            ? await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES)
            : await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);

        if (
          cameraResult !== 'granted' ||
          locationResult !== 'granted' ||
          storageResult !== 'granted'
        ) {
          Alert.alert(
            'Permission Denied',
            'Camera, location, or storage permissions are required.',
          );
          return false;
        }
      } else {
        const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
        const locationResult = await request(
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        );

        if (cameraResult !== 'granted' || locationResult !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Camera or location permissions are required.',
          );
          return false;
        }
      }
      return true;
    } catch (err) {
      console.warn('Permission error:', err);
      Alert.alert('Permission Error', 'Failed to request permissions.');
      return false;
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    launchCamera({mediaType: 'photo', saveToPhotos: true}, async response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Camera Error', response.errorMessage || 'Unknown error');
      } else if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri || null;
        console.log('Photo URI:', uri);
        setImageUri(uri);

        try {
          const position = await LocationManager.shared.getCurrentPosition();
          const {latitude, longitude} = position.coords;
          setCoords({lat: latitude, lon: longitude});
        } catch (error: any) {
          console.warn('Location error:', error.message);
          Alert.alert('Location Error', error.message);
          setCoords(null);
        }
      }
    });
  };

  const uploadToFirestoreAsBase64 = async () => {
    if (!imageUri) {
      Alert.alert('Missing Data', 'No image to upload.');
      return;
    }

    try {
      setUploading(true);
      console.log('Starting compression...');

      const filePath =
        Platform.OS === 'android' ? imageUri.replace('file://', '') : imageUri;

      // Compress the image
      console.log('Before CompressorImage.compress');
      const compressedUri = await CompressorImage.compress(filePath, {
        maxWidth: 800,
        quality: 0.6,
        compressionMethod: 'auto',
      });
      console.log('Compressed URI:', compressedUri);

      console.log('Reading file as base64...');
      const base64 = await RNFS.readFile(compressedUri, 'base64');
      console.log('Base64 size:', base64.length);

      console.log('Uploading to Firestore...');
      await firestore()
        .collection('photos')
        .add({
          imageBase64: base64,
          timestamp: firestore.FieldValue.serverTimestamp(),
          coordinates: coords || null,
        });
      console.log('Upload completed ✅');

      Alert.alert('Success', 'Photo uploaded successfully...');
      setImageUri(null);
      setCoords(null);
    } catch (error: any) {
      console.error('Upload error:', error.message);
      Alert.alert(
        'Upload Failed',
        error.message || 'An error occurred during upload.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box p="$4">
      <TouchableOpacity
        onPress={takePhoto}
        disabled={uploading}
        style={{
          backgroundColor: '#5F12AA',
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 10,
        }}>
        <Text style={{color: 'white', textAlign: 'center'}}>
          {uploading ? 'Uploading...' : 'Take Photo'}
        </Text>
      </TouchableOpacity>

      {imageUri && (
        <>
          <Image
            source={{uri: imageUri}}
            alt="Preview"
            w={200}
            h={200}
            mt={16}
            borderRadius={16}
          />
          <Text mt="$2">
            Coordinates:{' '}
            {coords ? `${coords.lat}, ${coords.lon}` : 'Fetching...'}
          </Text>

          <TouchableOpacity
            onPress={uploadToFirestoreAsBase64}
            disabled={uploading}
            style={{
              backgroundColor: '#5F12AA',
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 10,
            }}>
            <Text style={{color: 'white', textAlign: 'center'}}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </Box>
  );
};

export default CameraScreen;
