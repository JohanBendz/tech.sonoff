'use strict';

const Homey = require('homey');
const ZigBeeDevice = require("homey-meshdriver").ZigBeeDevice;

class TemperatureAndHumiditySensor extends ZigBeeDevice {
  
	async onMeshInit() {

		this.enableDebug();
		this.printNode();

		// Register capabilities and listeners
		if (this.hasCapability('measure_temperature')) {
			this.registerCapability('measure_temperature', 'msTemperatureMeasurement', { endpoint: 0 });
			this.registerAttrReportListener('msTemperatureMeasurement', 'measure_temperature', 0, 3600, 100, data => {
				onTemperatureMeasuredAttributeReport.bind(data);
	/* 			this.log('msTemperatureMeasurement - measure_temperature', data);
				this.setCapabilityValue('measure_temperature', data); */
			}, 0)
			.catch(err => {
				this.error()
			});
		};
		
		if (this.hasCapability('measure_humidity')) {
			this.registerCapability('measure_humidity', 'msRelativeHumidity', { endpoint: 0 });
			this.registerAttrReportListener('msRelativeHumidity', 'measure_humidity', 0, 3600, 100, data => {
				onRelativeHumidityMeasuredAttributeReport.bind(data)
	/* 			this.log('msRelativeHumidity - measure_humidity', data);
				this.setCapabilityValue('measure_humidity', data); */
			}, 0)
			.catch(err => {
				this.error()
			});
		};
		
		if (this.hasCapability('measure_battery')) {
			this.registerCapability('measure_battery', 'genPowerCfg', { endpoint: 0 });
			this.registerAttrReportListener('genPowerCfg', 'measure_battery', 0, 21600, 1, data => {
				onBatteryPercentageRemainingAttributeReport.bind(data)
	/* 			this.log('genPowerCfg - measure_battery', data/2);
				this.setCapabilityValue('measure_battery', data/2);
				this.setCapabilityValue('alarm_battery', (data/2 > 20) ? true : false); */
			}, 0)
			.catch(err => {
				this.error()
			});
		};

	};

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

	onDeleted(){
	this.log("temphumidsensor removed")
	}

}

module.exports = TemperatureAndHumiditySensor;