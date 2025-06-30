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
    const hasLocationPermission = await requestPermissions();
    console.log('hasLocationPermission----', hasLocationPermission);

    if (!hasLocationPermission) {
      console.log('Permissions not granted, aborting takePhoto');
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        saveToPhotos: true,
      },
      (response) => {
        if (response.didCancel) {
          console.log('Camera cancelled');
          return;
        }
        if (response.errorCode) {
          Alert.alert('Camera Error', response.errorMessage || 'Unknown error');
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const uri = response.assets[0].uri;
          console.log('Photo URI:', uri);
          setImageUri(uri || null);

          Geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              console.log('Geolocation success:', { latitude, longitude });
              setCoords({ lat: latitude, lon: longitude });
            },
            (error) => {
              console.warn('Location error:', error.code, error.message, error.stack);
              Alert.alert('Location Error', `Code: ${error.code}, Message: ${error.message}`);
              setCoords(null);
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
          );
        }
      }
    );
  };

  const uploadToFirebase = async () => {
    if (!imageUri) {
      Alert.alert('Missing Data', 'Image not available.');
      return;
    }

    try {
      console.log('Starting upload process...');
      const filePath = Platform.OS === 'android' ? imageUri.replace('file://', '') : imageUri;
      console.log('Checking if file exists:', filePath);
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) throw new Error('Image file does not exist');

      const filename = filePath.split('/').pop() || `image_${Date.now()}.jpg`;
      console.log('Filename:', filename);

      const ref = storage().ref(`images/${filename}`);
      console.log('Storage ref created:', ref.fullPath);

      console.log('Uploading file:', filePath);
      await ref.putFile(filePath);
      console.log('File uploaded, getting download URL...');
      const url = await ref.getDownloadURL();
      console.log('Download URL:', url);

      console.log('Saving to Firestore...');
      await firestore().collection('photos').add({
        imageUrl: url,
        timestamp: firestore.FieldValue.serverTimestamp(),
        coordinates: coords || null,
      });

      console.log('Firestore save successful');
      Alert.alert('Success', 'Photo uploaded successfully.');
      setImageUri(null);
      setCoords(null);
    } catch (error: any) {
      console.error('Upload error:', error, error.stack);
      Alert.alert('Upload Error', error.message || 'Failed to upload photo.');
    }
  };

  return (
    <Box p="$4">
      <Button onPress={takePhoto}>
        <Text>Take Photo</Text>
      </Button>

      {imageUri && (
        <>
          <Image
            source={{ uri: imageUri }}
            alt="preview"
            w={200}
            h={200}
            mt="$4"
            borderRadius="$lg"
          />
          <Text mt="$2">
            Coordinates: {coords ? `${coords.lat}, ${coords.lon}` : 'Not available'}
          </Text>
          <Button onPress={uploadToFirebase} mt="$4">
            <Text>Upload</Text>
          </Button>
        </>
      )}
    </Box>
  );
};

export default CameraScreen;