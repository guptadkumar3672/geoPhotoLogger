import React, { useEffect, useState } from 'react';
import { View, Dimensions, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';

const MapScreen = () => {
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = firestore().collection('photos').onSnapshot(snapshot => {
      const data = snapshot.docs.map(doc => doc.data());
      setLocations(data);
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }}
        initialRegion={{ latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 }}
      >
        {locations.map((item, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: item.coordinates.lat, longitude: item.coordinates.lon }}
            title={item.timestamp?.toDate?.().toString() || 'Uploaded Image'}
          >
            <Image source={{ uri: item.imageUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

export default MapScreen;
