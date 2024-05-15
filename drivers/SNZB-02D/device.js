'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class LCDTemperatureAndHumiditySensor extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {

    //this.enableDebug();
    //debug(true);
    this.disableDebug();
    debug(false);
    this.printNode();

    this.temperature_minInterval = this.getSetting('temperature_minInterval') !== null ? this.getSetting('temperature_minInterval') : 0;
    this.temperature_maxInterval = this.getSetting('temperature_maxInterval') !== null ? this.getSetting('temperature_maxInterval') : 3600;
    this.temperature_minChange = this.getSetting('temperature_minChange') !== null ? this.getSetting('temperature_minChange') : 10;
    this.humidity_minInterval = this.getSetting('humidity_minInterval') !== null ? this.getSetting('humidity_minInterval') : 0;
    this.humidity_maxInterval = this.getSetting('humidity_maxInterval') !== null ? this.getSetting('humidity_maxInterval') : 3600;
    this.humidity_minChange = this.getSetting('humidity_minChange') !== null ? this.getSetting('humidity_minChange') : 100;

    if (this.isFirstInit()) {
      await this.setStoreValue('settingsChanged', true);
    } else if (this.getStoreValue('settingsChanged') === null) {
      await this.setStoreValue('settingsChanged', true);
    }

    this._saveReportingConfigWhenChanged();

    // measure_temperature
    zclNode.endpoints[1].clusters[CLUSTER.TEMPERATURE_MEASUREMENT.NAME]
    .on('attr.measuredValue', this.onTemperatureMeasuredAttributeReport.bind(this));
  
    // measure_humidity
    zclNode.endpoints[1].clusters[CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT.NAME]
    .on('attr.measuredValue', this.onRelativeHumidityMeasuredAttributeReport.bind(this));

    // measure_battery // alarm_battery
    zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
    .on('attr.batteryPercentageRemaining', this.onBatteryPercentageRemainingAttributeReport.bind(this));

  }

  onTemperatureMeasuredAttributeReport(measuredValue) {
    this._saveReportingConfigWhenChanged();
    const temperatureOffset = this.getSetting('temperature_offset') || 0;
    const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
    this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset).catch(this.error);
  }

  onRelativeHumidityMeasuredAttributeReport(measuredValue) {
    this._saveReportingConfigWhenChanged();
    const humidityOffset = this.getSetting('humidity_offset') || 0;
    const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
    this.log('measure_humidity | relativeHumidity - measuredValue (humidity):', parsedValue, '+ humidity offset', humidityOffset);
    this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset).catch(this.error);
  }

  onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
    this._saveReportingConfigWhenChanged();
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
    this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2).catch(this.error);
    this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false).catch(this.error);
  }
  
  async onSettings(settingsEvent) {
    this.temperature_minInterval = settingsEvent.newSettings['temperature_minInterval'] !== null ? settingsEvent.newSettings['temperature_minInterval'] : 0;
    this.temperature_maxInterval = settingsEvent.newSettings['temperature_maxInterval'] !== null ? settingsEvent.newSettings['temperature_maxInterval'] : 3600;
    this.temperature_minChange = settingsEvent.newSettings['temperature_minChange'] !== null ? settingsEvent.newSettings['temperature_minChange'] : 10;
    this.humidity_minInterval = settingsEvent.newSettings['humidity_minInterval'] !== null ? settingsEvent.newSettings['humidity_minInterval'] : 0;
    this.humidity_maxInterval = settingsEvent.newSettings['humidity_maxInterval'] !== null ? settingsEvent.newSettings['humidity_maxInterval'] : 3600;
    this.humidity_minChange = settingsEvent.newSettings['humidity_minChange'] !== null ? settingsEvent.newSettings['humidity_minChange'] : 100;

    await this.setStoreValue('settingsChanged', true);
    await this._saveReportingConfigWhenChanged();
  }
 
  async onEndDeviceAnnounce() {
    if (!this.getAvailable()) {
      await this.setAvailable() // Mark the device as available upon re-announcement
      .then(() => this.log('Device is now available'))
      .catch(err => this.error('Error setting device available', err));
    }

    await this._saveReportingConfigWhenChanged();
  }

  async _saveReportingConfigWhenChanged() {
    if (this.getStoreValue('settingsChanged')) {
      try {
        await this.configureAttributeReporting([
          {
            endpointId: 1,
            cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
            attributeName: 'measuredValue',
            minInterval: this.temperature_minInterval,
            maxInterval: this.temperature_maxInterval,
            minChange: this.temperature_minChange
          },
          {
            endpointId: 1,
            cluster: CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT,
            attributeName: 'measuredValue',
            minInterval: this.humidity_minInterval,
            maxInterval: this.humidity_maxInterval,
            minChange: this.humidity_minChange
          },
          {
            endpointId: 1,
            cluster: CLUSTER.POWER_CONFIGURATION,
            attributeName: 'batteryPercentageRemaining',
            minInterval: 0, // See ZCL spec 2.5.7.1.5, 2.5.7.1.6 and 2.5.7.1.7
            maxInterval: 3600,
            minChange: 2
          }
        ]);
        this.log("Attribute reporting configured successfully.");
        await this.setStoreValue('settingsChanged', false); // Reset the flag
      } catch (error) {
        this.log("There was a problem configuring attribute reporting:", error);
      }
    }
  }

  onDeleted(){
    this.log("LCD temperature and humidity sensor SNZB-02D removed")
  }

}

module.exports = LCDTemperatureAndHumiditySensor;
  
/* "ids": {
  "modelId": "SNZB-02D",
  "manufacturerName": "SONOFF"
},
"endpoints": {
  "endpointDescriptors": [
    {
      "endpointId": 1,
      "applicationProfileId": 260,
      "applicationDeviceId": 770,
      "applicationDeviceVersion": 0,
      "_reserved1": 1,
      "inputClusters": [
        0,
        1,
        3,
        32,
        1026,
        1029,
        64599,
        64529
      ],
      "outputClusters": [
        25
      ]
    }
  ],
  "endpoints": {
    "1": {
      "clusters": {
        "basic": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "zclVersion",
              "value": 8,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1,
              "name": "appVersion",
              "value": 0,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 3,
              "name": "hwVersion",
              "value": 0,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 4,
              "name": "manufacturerName",
              "value": "SONOFF",
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 5,
              "name": "modelId",
              "value": "SNZB-02D",
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 6,
              "name": "dateCode",
              "value": "20230105",
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 7,
              "name": "powerSource",
              "value": "unknown",
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 17,
              "name": "physicalEnv",
              "value": "Unspecified",
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 16384,
              "name": "swBuildId",
              "value": "1.0.9",
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 3,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            }
          ],
          "commandsGenerated": [],
          "commandsReceived": []
        },
        "powerConfiguration": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 33,
              "name": "batteryPercentageRemaining",
              "value": 200,
              "reportingConfiguration": {
                "direction": "reported",
                "attributeDataType": 32,
                "minInterval": 1,
                "maxInterval": 65534,
                "minChange": 0,
                "status": "SUCCESS"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            }
          ],
          "commandsGenerated": [],
          "commandsReceived": []
        },
        "identify": {
          "attributes": [
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 0,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            }
          ],
          "commandsGenerated": [
            0
          ],
          "commandsReceived": [
            0,
            1
          ]
        },
        "pollControl": {
          "attributes": [
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 0,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "writable",
                "reportable"
              ],
              "id": 3,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 3,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            }
          ],
          "commandsGenerated": [
            0
          ],
          "commandsReceived": [
            0,
            1,
            2,
            3
          ]
        },
        "temperatureMeasurement": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "measuredValue",
              "value": 1940,
              "reportingConfiguration": {
                "direction": "reported",
                "attributeDataType": 41,
                "minInterval": 1,
                "maxInterval": 65534,
                "minChange": 0,
                "status": "SUCCESS"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1,
              "name": "minMeasuredValue",
              "value": -32768,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2,
              "name": "maxMeasuredValue",
              "value": -32768,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 3,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            }
          ],
          "commandsGenerated": [],
          "commandsReceived": []
        },
        "relativeHumidity": {
          "attributes": [
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 0,
              "name": "measuredValue",
              "value": 5170,
              "reportingConfiguration": {
                "direction": "reported",
                "attributeDataType": 33,
                "minInterval": 1,
                "maxInterval": 65534,
                "minChange": 0,
                "status": "SUCCESS"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 1,
              "name": "minMeasuredValue",
              "value": 0,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 2,
              "name": "maxMeasuredValue",
              "value": 0,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            },
            {
              "acl": [
                "readable",
                "reportable"
              ],
              "id": 65533,
              "name": "clusterRevision",
              "value": 2,
              "reportingConfiguration": {
                "status": "NOT_FOUND",
                "direction": "reported"
              }
            }
          ],
          "commandsGenerated": [],
          "commandsReceived": []
        }
      },
      "bindings": {
        "ota": {
          "attributes": [],
          "commandsGenerated": [],
          "commandsReceived": []
        }
      }
    }
  }
} */