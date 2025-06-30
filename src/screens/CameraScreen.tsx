import React, { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { Box, Button, Text, Image } from '@gluestack-ui/themed';
import Geolocation from '@react-native-community/geolocation';
import { launchCamera } from 'react-native-image-picker';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { request, PERMISSIONS } from 'react-native-permissions';
import RNFS from 'react-native-fs';

const CameraScreen = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const cameraResult = await request(PERMISSIONS.ANDROID.CAMERA);
        const locationResult = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        const storageResult = Platform.Version >= 33
          ? await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES)
          : await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);

        if (
          cameraResult !== 'granted' ||
          locationResult !== 'granted' ||
          storageResult !== 'granted'
        ) {
          Alert.alert('Permission Denied', 'Camera, location, or storage permissions are required.');
          return false;
        }
      } else {
        const cameraResult = await request(PERMISSIONS.IOS.CAMERA);
        const locationResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

        if (cameraResult !== 'granted' || locationResult !== 'granted') {
          Alert.alert('Permission Denied', 'Camera or location permissions are required.');
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

    launchCamera(
      { mediaType: 'photo', saveToPhotos: true },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          Alert.alert('Camera Error', response.errorMessage || 'Unknown error');
        } else if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri || null;
          console.log('Photo URI:', uri);
          setImageUri(uri);

          Geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setCoords({ lat: latitude, lon: longitude });
            },
            (error) => {
              console.warn('Location error:', error.message);
              Alert.alert('Location Error', error.message);
              setCoords(null);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
          );
        }
      }
    );
  };

  const uploadToFirebase = async () => {
    if (!imageUri) {
      Alert.alert('Missing Data', 'No image to upload.');
      return;
    }

    try {
      setUploading(true);
      console.log('Starting upload process...');
      const filePath = Platform.OS === 'android' ? imageUri.replace('file://', '') : imageUri;
      const exists = await RNFS.exists(filePath);

      if (!exists) throw new Error('File does not exist at path');

      const filename = filePath.split('/').pop() || `image_${Date.now()}.jpg`;
      const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

      const ref = storage().ref(`images/${cleanFilename}`);
      console.log('Uploading file from:', filePath);

      // Upload
      const result = await ref.putFile(filePath);
      console.log('Upload state:', result.state); // 'success'

      // Download URL
      const url = await ref.getDownloadURL();
      console.log('Download URL:', url);

      // Firestore entry
      await firestore().collection('photos').add({
        imageUrl: url,
        timestamp: firestore.FieldValue.serverTimestamp(),
        coordinates: coords || null,
      });

      Alert.alert('Success', 'Photo uploaded successfully.');
      setImageUri(null);
      setCoords(null);
    } catch (error: any) {
      console.error('Upload error:', error.message);
      Alert.alert('Upload Failed', error.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box p="$4">
      <Button onPress={takePhoto} isDisabled={uploading}>
        <Text>{uploading ? 'Uploading...' : 'Take Photo'}</Text>
      </Button>

      {imageUri && (
        <>
          <Image
            source={{ uri: imageUri }}
            alt="Preview"
            w={200}
            h={200}
            mt="$4"
            borderRadius="$lg"
          />
          <Text mt="$2">
            Coordinates: {coords ? `${coords.lat}, ${coords.lon}` : 'Fetching...'}
          </Text>
          <Button onPress={uploadToFirebase} mt="$4" isDisabled={uploading}>
            <Text>{uploading ? 'Uploading...' : 'Upload'}</Text>
          </Button>
        </>
      )}
    </Box>
  );
};

export default CameraScreen;
