import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@gluestack-ui/config';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import MapScreen from './src/screens/MapScreen';
// import GalleryScreen from './src/screens/GalleryScreen';
import CameraScreen from './src/screens/CameraScreen';
import MapScreen from './src/screens/MapScreen';
import GalleryScreen from './src/screens/GalleryScreen';

const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <GluestackUIProvider config={config}>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Camera" component={CameraScreen} />
          <Tab.Screen name="Map" component={MapScreen} />
          <Tab.Screen name="Gallery" component={GalleryScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </GluestackUIProvider>
  );
};

export default App;