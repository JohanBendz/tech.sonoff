'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');
const SonoffSpecificCluster = require('../../lib/SonoffSpecificCluster');

const REPORT_INTERVAL_MIN = 10;  // Minimum reporting interval in seconds
const REPORT_INTERVAL_MAX = 600; // Maximum reporting interval in seconds
const REPORTABLE_CHANGE = 1;     // Reportable change threshold (if applicable)

class SensorSNZB03P extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.log('Initializing SensorSNZB03P');

        // Enable debugging globally
        this.enableDebug();
        this.printNode();

        // Configure attribute reporting for capabilities
        await this.configureReporting();

        // Set up event listeners for the clusters
        this.setupEventListeners(zclNode);

        // Perform an initial sensitivity check and set if required
        await this.checkAndSetSensitivity();
    }

    // Configuring attribute reporting dynamically
    async configureReporting() {
        try {
            await this.configureAttributeReportingSafe([
                {
                    endpointId: 1,
                    cluster: SonoffSpecificCluster.ID,
                    attributeName: 'illumination',
                    minInterval: REPORT_INTERVAL_MIN,
                    maxInterval: REPORT_INTERVAL_MAX,
                    reportableChange: REPORTABLE_CHANGE,
                },
                {
                    endpointId: 1,
                    cluster: CLUSTER.OCCUPANCY_SENSING,
                    attributeName: 'occupancy',
                    minInterval: REPORT_INTERVAL_MIN,
                    maxInterval: REPORT_INTERVAL_MAX,
                    reportableChange: REPORTABLE_CHANGE,
                },
                {
                    endpointId: 1,
                    cluster: CLUSTER.POWER_CONFIGURATION,
                    attributeName: 'batteryPercentageRemaining',
                    minInterval: REPORT_INTERVAL_MIN,
                    maxInterval: REPORT_INTERVAL_MAX,
                    reportableChange: REPORTABLE_CHANGE,
                },
            ]);
            this.log('Attribute reporting configured successfully');
        } catch (error) {
            this.error('Error configuring attribute reporting:', error);
        }
    }

    // Set up event listeners for various clusters
    setupEventListeners(zclNode) {
        // Occupancy sensing listener
        zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME].on(
            'attr.occupancy',
            this.onOccupancyAttributeReport.bind(this)
        );

        // Illuminance listener
        zclNode.endpoints[1].clusters[SonoffSpecificCluster.NAME].on(
            'attr.illumination',
            this.onIlluminationReport.bind(this)
        );

        // Battery percentage listener
        zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].on(
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
        this.setCapabilityValue('measure_luminance', illumination > 50 ? 'bright' : 'dim').catch(this.error);

        // Set motion alarm with illuminance
        this.setCapabilityValue('alarm_motion', true).catch(this.error);
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
