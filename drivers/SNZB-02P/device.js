'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class TemperatureAndHumiditySensor2 extends ZigBeeDevice {
  
	async onNodeInit({ zclNode }) {

		this.enableDebug();
		debug(true);
    this.printNode();

/*     const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
	  		this.log("frame data! endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
		}; */

    this.temperature_minInterval = this.getSetting('temperature_minInterval') || 0;
    this.temperature_maxInterval = this.getSetting('temperature_maxInterval') || 3600;
    this.temperature_minChange = this.getSetting('temperature_minChange') || 100;
    this.humidity_minInterval = this.getSetting('humidity_minInterval') || 0;
    this.humidity_maxInterval = this.getSetting('humidity_maxInterval') || 3600;
    this.humidity_minChange = this.getSetting('humidity_minChange') || 100;

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
        minInterval: 3600,
        maxInterval: 65535,
        minChange: 2
      }
    ]);

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
		const temperatureOffset = this.getSetting('temperature_offset') || 0;
		const parsedValue = this.getSetting('temperature_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
		this.log('measure_temperature | temperatureMeasurement - measuredValue (temperature):', parsedValue, '+ temperature offset', temperatureOffset);
		this.setCapabilityValue('measure_temperature', parsedValue + temperatureOffset);
	}

	onRelativeHumidityMeasuredAttributeReport(measuredValue) {
		const humidityOffset = this.getSetting('humidity_offset') || 0;
		const parsedValue = this.getSetting('humidity_decimals') === '2' ? Math.round((measuredValue / 100) * 100) / 100 : Math.round((measuredValue / 100) * 10) / 10;
		this.log('measure_humidity | relativeHumidity - measuredValue (humidity):', parsedValue, '+ humidity offset', humidityOffset);
		this.setCapabilityValue('measure_humidity', parsedValue + humidityOffset);
	}

	onBatteryPercentageRemainingAttributeReport(batteryPercentageRemaining) {
		const batteryThreshold = this.getSetting('batteryThreshold') || 20;
		this.log("measure_battery | powerConfiguration - batteryPercentageRemaining (%): ", batteryPercentageRemaining/2);
		this.setCapabilityValue('measure_battery', batteryPercentageRemaining/2);
		this.setCapabilityValue('alarm_battery', (batteryPercentageRemaining/2 < batteryThreshold) ? true : false)
  }
  
  onSettings(oldSettings, newSettings, changedKeys) {
    this.setStoreValue('settingsChanged', true);
  };
 
  async onEndDeviceAnnounce() {
    const settingsChanged = this.getStoreValue('settingsChanged');
    if (settingsChanged) {
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
            minInterval: 3600,
            maxInterval: 65535,
            minChange: 2
          }
        ]);
      } catch (error) {
        this.log("There was a problem configuring attribute reporting");
      }
      this.setStoreValue('settingsChanged', false); // Reset the flag
    }
  }

	onDeleted(){
	this.log("temphumidsensor removed")
	}

}

module.exports = TemperatureAndHumiditySensor2;
