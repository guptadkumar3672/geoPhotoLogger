import React from 'react';
import {GluestackUIProvider} from '@gluestack-ui/themed';
import {config} from '@gluestack-ui/config';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import CameraScreen from './src/screens/CameraScreen';
import MapScreen from './src/screens/MapScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import {Image, StyleSheet} from 'react-native';
import Images from './src/assets/images';

const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <GluestackUIProvider config={config}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({focused, color, size}) => {
              let iconSource;

              if (route.name == 'Camera') {
                iconSource = Images.camera;
              } else if (route.name == 'Map') {
                iconSource = Images.placeholder;
              } else {
                iconSource = Images.gallery;
              }

              return (
                <Image
                  source={iconSource}
                  style={[styles.tabIcon, {tintColor: color}]}
                />
              );
            },
            tabBarActiveTintColor: '#5F12AA',
            tabBarInactiveTintColor: 'gray',
          })}>
          <Tab.Screen name="Camera" component={CameraScreen} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Gallery" component={GalleryScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </GluestackUIProvider>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
});

export default App;
