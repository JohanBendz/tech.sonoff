'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, Cluster, CLUSTER } = require('zigbee-clusters');
const SonoffSpecificCluster = require('../../lib/SonoffSpecificCluster');

Cluster.addCluster(SonoffSpecificCluster);

class SensorSNZB03P extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Initializing SensorSNZB03P');

    // Enable debugging globally
    this.enableDebug();
    this.printNode();

    // Configure attribute reporting for capabilities
    await this.configureReporting();

    // Set up event listeners for the clusters
    await this.setupEventListeners(zclNode);

    // Perform an initial sensitivity check and set if required
    await this.checkAndSetSensitivity();
  }

  // Configuring attribute reporting dynamically
  async configureReporting() {
    try {
      await this.configureAttributeReportingSafe([
        {
          endpointId: 1,
          cluster: SonoffSpecificCluster,
          attributeName: 'illumination',
          minInterval: 1,
          maxInterval: 600,
          minChange: 1,
        },
        {
          endpointId: 1,
          cluster: CLUSTER.OCCUPANCY_SENSING,
          attributeName: 'occupancy',
          minInterval: 1,
          maxInterval: 600,
          minChange: 1,
        },
        {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 1,
          maxInterval: 600,
          minChange: 1,
        },
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (error) {
      this.error('Error configuring attribute reporting:', error);
    }
  }

  // Set up event listeners for various clusters
  async setupEventListeners(zclNode) {
    if (!zclNode || !zclNode.endpoints || !zclNode.endpoints[1]) {
      this.error('zclNode or endpoints are undefined');
      return;
    }

    const occupancyCluster = zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME];
    if (!occupancyCluster || !occupancyCluster.on) {
      this.error('Occupancy cluster or on property is undefined');
      return;
    }

    // Occupancy sensing listener
    occupancyCluster.on(
      'attr.occupancy',
      this.onOccupancyAttributeReport.bind(this)
    );

    // Illuminance listener
    const illuminanceCluster = zclNode.endpoints[1].clusters[SonoffSpecificCluster.NAME];
    if (!illuminanceCluster || !illuminanceCluster.on) {
      this.error('Illuminance cluster or on property is undefined');
      return;
    }

    illuminanceCluster.on(
      'attr.illumination',
      this.onIlluminationReport.bind(this)
    );

    // Battery percentage listener
    const batteryCluster = zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME];
    if (!batteryCluster || !batteryCluster.on) {
      this.error('Battery cluster or on property is undefined');
      return;
    }

    batteryCluster.on(
      'attr.batteryPercentageRemaining',
      this.onBatteryPercentageReport.bind(this)
    );
  }

  // Check and update sensitivity if needed
  async checkAndSetSensitivity() {
    try {
      const sensitivity = await this.zclNode.endpoints[1].clusters[
        CLUSTER.OCCUPANCY_SENSING.NAME
      ].readAttributes(['ultrasonicUTToThreshold']);
      this.log('Current Sensitivity Level:', sensitivity.ultrasonicUTToThreshold);

      const newSensitivity = this.getSetting('sensitivity') || 1;
      if (sensitivity.ultrasonicUTToThreshold !== newSensitivity) {
        await this.zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME].writeAttributes({
          ultrasonicUTToThreshold: newSensitivity,
        });
        this.log('Sensitivity set to:', newSensitivity);
      }
    } catch (error) {
      this.error('Error reading or setting sensitivity:', error);
    }
  }

  // Handle occupancy attribute reports
  onOccupancyAttributeReport(occupancy) {
    this.log('Occupancy status:', occupancy.occupied);
    this.setCapabilityValue('alarm_motion', occupancy.occupied).catch(this.error);

    // Reset motion alarm after the set timeout
    clearTimeout(this._motionAlarmTimeout);
    if (occupancy.occupied) {
      const alarmResetTime = this.getSetting('alarm_reset_time') || 3000;
      this._motionAlarmTimeout = setTimeout(() => {
        this.setCapabilityValue('alarm_motion', false).catch(this.error);
      }, alarmResetTime);
    }
  }

  // Handle illuminance attribute reports
  onIlluminationReport(illumination) {
    this.log('Illuminance reported:', illumination);
    const illuminationState = illumination === 1 ? 'bright' : 'dim';
    this.setCapabilityValue('alarm_illumination', illuminationState).catch(this.error);
  }

  // Handle battery percentage reports
  onBatteryPercentageReport(battery) {
    const batteryPercentage = battery.batteryPercentageRemaining / 2;
    this.log('Battery percentage:', batteryPercentage);
    this.setCapabilityValue('measure_battery', batteryPercentage).catch(this.error);
  }

  // Graceful cleanup on deletion
  onDeleted() {
    this.log('Device removed, cleaning up...');
    clearTimeout(this._motionAlarmTimeout);
  }

  // Safe method to configure attribute reporting
  async configureAttributeReportingSafe(attributes) {
    try {
      await this.configureAttributeReporting(attributes);
    } catch (error) {
      this.error('Error configuring attribute reporting:', error);
    }
  }
}

module.exports = SensorSNZB03P;