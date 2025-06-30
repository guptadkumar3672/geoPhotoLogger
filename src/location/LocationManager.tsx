import Geolocation, {
  GeolocationResponse,
} from '@react-native-community/geolocation';

import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  checkMultiple,
  openSettings,
} from 'react-native-permissions';
import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
// import RNAndroidLocationEnabler from 'react-native-android-location-enabler';

export enum LocationPermissionStatus {
  unknown,
  granted,
  denined,
}

class LocationManager {
  watchId?: number;
  position?: GeolocationResponse;

  private static _instance: LocationManager = new LocationManager();

  static get shared(): LocationManager {
    return LocationManager._instance;
  }

  private constructor() {}

  setup() {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      enableBackgroundLocationUpdates: false,
    });
    // this.watchPosition();
  }

  getCurrentPosition() {
    return new Promise<GeolocationResponse>(async (resolve, reject) => {
      if (Platform.OS === 'ios') {
        Geolocation.getCurrentPosition(
          position => {
            resolve(position);
          },
          error => {
            Geolocation.getCurrentPosition(
              position => {
                resolve(position);
              },
              error => {
                if (
                  error.message == 'User denied access to location services.'
                ) {
                  Linking.openSettings();
                }
                reject(error);
              },
              {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
            );
          },
          {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
        );
      }
      if (Platform.OS === 'android') {
        try {
          const status = true;
          // await RNAndroidLocationEnabler.promptForEnableLocationIfNeeded({
          //     interval: 10000,
          //     fastInterval: 5000,
          // });
          if (status) {
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            )
              .then(granted => {
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                  Geolocation.getCurrentPosition(
                    position => {
                      resolve(position);
                    },
                    error => {
                      reject(error);
                    },
                    {
                      enableHighAccuracy: false,
                      timeout: 20000,
                      maximumAge: 1000,
                    },
                  );
                } else if (granted == 'never_ask_again') {
                  Linking.openSettings();
                  reject(new Error('Permission denied'));
                } else {
                  reject(new Error('Permission denied'));
                }
              })
              .catch(error => {
                reject(error);
              });
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  }

  getCooridnates() {
    return this.position
      ? {
          latitude: this.position.coords.latitude,
          longitude: this.position.coords.longitude,
        }
      : {};
  }

  async checkLocationPermissionIOSStatus() {
    try {
      const result = await checkMultiple([
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        PERMISSIONS.IOS.LOCATION_ALWAYS,
      ]);
      console.log(result);
      const whenInUse = result[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE];
      const always = result[PERMISSIONS.IOS.LOCATION_ALWAYS];
      if (whenInUse == RESULTS.GRANTED || always == RESULTS.GRANTED) {
        return LocationPermissionStatus.granted;
      } else if (
        whenInUse == RESULTS.UNAVAILABLE &&
        always == RESULTS.UNAVAILABLE
      ) {
        return LocationPermissionStatus.unknown;
      } else {
        return LocationPermissionStatus.denined;
      }
    } catch (error) {
      return LocationPermissionStatus.denined;
    }
  }

  async checkLocationPermissionAndroidStatus() {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted) {
        return LocationPermissionStatus.granted;
      } else {
        return LocationPermissionStatus.denined;
      }
    } catch (error) {
      return LocationPermissionStatus.denined;
    }
  }

  async checkCurrentStatus(): Promise<LocationPermissionStatus> {
    if (Platform.OS == 'ios') {
      return await this.checkLocationPermissionIOSStatus();
    } else {
      return await this.checkLocationPermissionAndroidStatus();
    }
  }

  async requestAuthorization() {
    return new Promise<boolean>((resolve, reject) => {
      Geolocation.requestAuthorization(
        () => {
          resolve(true);
        },
        error => {
          reject(error);
        },
      );
    });
  }

  async requestLocationPermission(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (Platform.OS === 'ios') {
          const permission = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
          const status = await request(permission);

          if (status === RESULTS.GRANTED) {
            resolve();
          } else {
            Alert.alert(
              'Location Permission Required',
              'Please allow location access in your device settings to use this feature.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Open Settings',
                  onPress: () => openSettings(),
                },
              ],
            );
            reject(new Error('Permission denied'));
          }
        } else if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );

          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            resolve();
          } else {
            Alert.alert(
              'Location Permission Required',
              'Please allow location access in your device settings to use this feature.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openSettings(),
                },
              ],
            );
            reject(new Error('Permission denied'));
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private watchPosition = () => {
    try {
      this.watchId = Geolocation.watchPosition(
        position => {
          console.log('watchPosition', position);
          this.position = position;
          return position;
        },
        error => {
          console.log(error);
          //Toast.showToast(JSON.stringify(error), 'Warning');
        },
        {
          maximumAge: 60 * 2 * 1000,
          enableHighAccuracy: true,
          interval: 60 * 2 * 1000,
        },
      );
    } catch (error) {
      // Toast.showToast(JSON.stringify(error), 'Warning');
    }
  };

  private clearWatch = () => {
    this.watchId !== undefined && Geolocation.clearWatch(this.watchId);
    this.watchId = undefined;
  };
}

export default LocationManager;
