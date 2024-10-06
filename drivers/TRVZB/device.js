'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const SonoffSpecificCluster = require('../../lib/SonoffSpecificCluster');
const SonoffHelpers = require('../../lib/SonoffHelpers');

Cluster.addCluster(SonoffSpecificCluster);

class TRVZBDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Initializing TRVZB device');

    // Set up attribute reporting
    await SonoffHelpers.configureReporting(this, [
      {
        endpointId: 1,
        cluster: CLUSTER.THERMOSTAT,
        attributeName: 'localTemperature',
        minInterval: 30,
        maxInterval: 300,
        minChange: 10,
      },
      {
        endpointId: 1,
        cluster: CLUSTER.THERMOSTAT,
        attributeName: 'occupiedHeatingSetpoint',
        minInterval: 30,
        maxInterval: 300,
        minChange: 10,
      },
    ]);

    // Register capabilities
    this.registerCapability('measure_temperature', CLUSTER.THERMOSTAT, {
      get: 'localTemperature',
      report: 'localTemperature',
      reportParser: value => value / 100,
      getOpts: {
        getOnStart: true,
      },
    });

    this.registerCapability('target_temperature', CLUSTER.THERMOSTAT, {
      get: 'occupiedHeatingSetpoint',
      report: 'occupiedHeatingSetpoint',
      reportParser: value => value / 100,
      set: 'occupiedHeatingSetpoint',
      setParser: value => ({ occupiedHeatingSetpoint: Math.round(value * 100) }),
      getOpts: {
        getOnStart: true,
      },
    });

    // Initial battery check
    await SonoffHelpers.checkBattery(zclNode, this);

    // Periodic battery check every 6 hours
    this.batteryCheckInterval = setInterval(() => {
      SonoffHelpers.checkBattery(zclNode, this);
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    // Read initial settings
    await this.readInitialSettings(zclNode);

    // Handle settings changes
    this.onSettings = this.onSettings.bind(this);
  }

  async readInitialSettings(zclNode) {
    const settingsAttributes = ['child_lock', 'open_window', 'frost_protection_temperature'];
    try {
      const values = await SonoffHelpers.readAttributes(zclNode, SonoffSpecificCluster, settingsAttributes, this);
      this.log('Initial settings read:', values);

      const settings = {};
      for (const attr of settingsAttributes) {
        settings[attr] = attr === 'frost_protection_temperature' ? values[attr] / 100 : values[attr];
      }
      await this.setSettings(settings);
    } catch (error) {
      this.error('Failed to read initial settings', error);
    }

    // Read local temperature calibration
    try {
      const { localTemperatureCalibration } = await SonoffHelpers.readAttributes(
        zclNode,
        CLUSTER.THERMOSTAT,
        'localTemperatureCalibration',
        this
      );
      this.log('Local temperature calibration read:', localTemperatureCalibration);
      await this.setSettings({ localTemperatureCalibration: localTemperatureCalibration / 10 });
    } catch (error) {
      this.error('Failed to read local temperature calibration', error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const sonoffClusterAttributes = {};
    const thermostatClusterAttributes = {};

    for (const key of changedKeys) {
      if (key === 'localTemperatureCalibration') {
        thermostatClusterAttributes.localTemperatureCalibration = Math.round(newSettings[key] * 10);
      } else if (['child_lock', 'open_window'].includes(key)) {
        sonoffClusterAttributes[key] = newSettings[key];
      } else if (key === 'frost_protection_temperature') {
        sonoffClusterAttributes[key] = Math.round(newSettings[key] * 100);
      }
    }

    // Write to Sonoff-specific cluster
    if (Object.keys(sonoffClusterAttributes).length > 0) {
      try {
        await SonoffHelpers.writeAttributes(this.zclNode, SonoffSpecificCluster, sonoffClusterAttributes, this);
        this.log('Sonoff-specific settings updated:', sonoffClusterAttributes);
      } catch (error) {
        this.error('Failed to update Sonoff-specific settings', error);
      }
    }

    // Write to thermostat cluster
    if (Object.keys(thermostatClusterAttributes).length > 0) {
      try {
        await SonoffHelpers.writeAttributes(this.zclNode, CLUSTER.THERMOSTAT, thermostatClusterAttributes, this);
        this.log('Thermostat settings updated:', thermostatClusterAttributes);
      } catch (error) {
        this.error('Failed to update thermostat settings', error);
      }
    }
  }

  onDeleted() {
    this.log('TRVZB device removed');
    if (this.batteryCheckInterval) {
      clearInterval(this.batteryCheckInterval);
    }
  }
}

module.exports = TRVZBDevice;
