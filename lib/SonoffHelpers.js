'use strict';

const { CLUSTER } = require('zigbee-clusters');

module.exports = {

  async checkBattery(zclNode, device) {
    device.log('Checking battery status');

    try {
      const value = await zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .readAttributes('batteryPercentageRemaining');
      device.log('Battery value:', value);
      if (value.batteryPercentageRemaining !== undefined) {
        const batteryPercentage = value.batteryPercentageRemaining / 2;
        await device.setCapabilityValue('measure_battery', batteryPercentage);
      }
    } catch (error) {
      device.error('Failed to retrieve battery status', error);
    }
  },

  async readAttributes(zclNode, cluster, attributes, device) {
    if ('NAME' in cluster) cluster = cluster.NAME;
    if (!Array.isArray(attributes)) attributes = [attributes];

    try {
      device.log(`Reading attributes ${attributes} from cluster ${cluster}`);
      const values = await zclNode.endpoints[1].clusters[cluster].readAttributes(...attributes);
      device.log('Attributes read:', values);
      return values;
    } catch (error) {
      device.error(`Failed to read attributes ${attributes} from cluster ${cluster}`, error);
      throw error;
    }
  },

  async writeAttributes(zclNode, cluster, attributes, device) {
    if ('NAME' in cluster) cluster = cluster.NAME;

    try {
      device.log(`Writing attributes ${JSON.stringify(attributes)} to cluster ${cluster}`);
      await zclNode.endpoints[1].clusters[cluster].writeAttributes(attributes);
      device.log('Attributes written successfully');
    } catch (error) {
      device.error(`Failed to write attributes to cluster ${cluster}`, error);
      throw error;
    }
  },

  async configureReporting(device, configurations) {
    try {
      await device.configureAttributeReporting(configurations);
      device.log('Attribute reporting configured successfully');
    } catch (error) {
      device.error('Failed to configure attribute reporting', error);
    }
  },
};