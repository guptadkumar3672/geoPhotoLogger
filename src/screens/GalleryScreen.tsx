import React, { useEffect, useState } from 'react';
import { ScrollView, Linking } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { Box, Image, Text, Pressable } from '@gluestack-ui/themed';

const GalleryScreen = () => {
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('photos')
      .orderBy('timestamp', 'desc')
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => doc.data());
        setPhotos(data);
      });
    return () => unsubscribe();
  }, []);

  return (
    <ScrollView>
      {photos.map((item, index) => (
        <Box key={index} p="$4" borderBottomWidth={1} borderColor="$coolGray200">
          <Image
            source={{
              uri: item.imageBase64
                ? `data:image/jpeg;base64,${item.imageBase64}`
                : item.imageUrl || '',
            }}
            alt="Photo"
            w={300}
            h={200}
            borderRadius="$lg"
          />
          {item.coordinates && (
            <Text mt="$2">
              Lat: {item.coordinates.lat}, Lon: {item.coordinates.lon}
            </Text>
          )}
          <Text color="$blue600">
            {item.timestamp?.toDate?.().toLocaleString() || 'Unknown time'}
          </Text>

          {item.coordinates && (
            <Pressable
              onPress={() =>
                Linking.openURL(`https://maps.google.com/?q=${item.coordinates.lat},${item.coordinates.lon}`)
              }>
              <Text mt="$1" color="$blue600">
                Open in Google Maps
              </Text>
            </Pressable>
          )}
        </Box>
      ))}
    </ScrollView>
  );
};

export default GalleryScreen;
