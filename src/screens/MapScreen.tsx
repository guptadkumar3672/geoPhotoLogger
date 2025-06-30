import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Image} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import firestore from '@react-native-firebase/firestore';
import {useIsFocused} from '@react-navigation/native';

interface PhotoItem {
  id: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  imageBase64?: string;
  timestamp?: {
    toDate: () => Date;
  };
}

const INITIAL_REGION: Region = {
  latitude: 26.848983,
  longitude: 75.80441,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const MapScreen = () => {
  const isFocused = useIsFocused();
  const [locations, setLocations] = useState<PhotoItem[]>([]);
  const [currentRegion, setCurrentRegion] = useState<Region>(INITIAL_REGION);
  console.log('currentRegion----', currentRegion);

  const [hasSetInitialRegion, setHasSetInitialRegion] = useState(false);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!isFocused) return;

    const unsubscribe = firestore()
      .collection('photos')
      .onSnapshot(snapshot => {
        const data: PhotoItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setLocations(data);

        const first = data.find(
          item =>
            typeof item?.coordinates?.lat === 'number' &&
            typeof item?.coordinates?.lon === 'number',
        );

        if (first?.coordinates && mapRef.current && !hasSetInitialRegion) {
          const newRegion: Region = {
            latitude: first.coordinates.lat,
            longitude: first.coordinates.lon,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };

          setCurrentRegion(newRegion);
          setHasSetInitialRegion(true);
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      });

    return () => unsubscribe();
  }, [isFocused]);

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} region={currentRegion}>
        {locations.map((item, index) => {
          console.log('item.coordinates--', item.coordinates);

          return (
            <Marker
              key={item.id || index}
              coordinate={{
                latitude: item?.coordinates?.lat ?? 0,
                longitude: item?.coordinates?.lon ?? 0,
              }}
              title={item.timestamp?.toDate?.().toString() || 'Uploaded Image'}
              // image={{uri: `data:image/jpeg;base64,${item.imageBase64}`}}
              // style={{height: 30, width: 30}}
            >
              <View>
                <Image
                  source={{uri: `data:image/jpeg;base64,${item.imageBase64}`}}
                  style={{
                    height: 35,
                    width: 35,
                    borderWidth: 1,
                    borderRadius: 40,
                    borderColor:"black"
                  }}
                  resizeMode='contain'
                />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapScreen;
