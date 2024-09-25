'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const SonoffSpecificCluster = require('../../lib/SonoffSpecificCluster');
const { CLUSTER } = require('zigbee-clusters');

class SensorSNZB03P extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        this.printNode();

        // Bind custom cluster to handle specific attributes
        zclNode.endpoints[1].bindCluster(SonoffSpecificCluster, 'report');

        // Configure attribute reporting for illuminance, occupancy, and battery
        await this.configureAttributeReportingSafe([
            {
                endpointId: 1,
                cluster: SonoffSpecificCluster,
                attributeName: 'illumination'
            },
            {
                endpointId: 1,
                cluster: CLUSTER.OCCUPANCY_SENSING,
                attributeName: 'occupancy'
            },
            {
                endpointId: 1,
                cluster: CLUSTER.POWER_CONFIGURATION,
                attributeName: 'batteryPercentageRemaining'
            }
        ]);

        // Set up event listeners for occupancy, illuminance, and battery
        this.setupEventListeners(zclNode);

        // Initial check and set sensitivity if needed
        await this.checkAndSetSensitivity();
    }

    setupEventListeners(zclNode) {
        // Handle occupancy reports
        zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
            .on('attr.occupancy', this.onOccupancyAttributeReport.bind(this));

        // Handle illuminance reports combined with motion
        zclNode.endpoints[1].clusters[SonoffSpecificCluster.NAME]
            .on('attr.illumination', this.onIlluminationReport.bind(this));

        // Handle battery percentage reports
        zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
            .on('attr.batteryPercentageRemaining', this.onBatteryPercentageReport.bind(this));
    }

    async checkAndSetSensitivity() {
        try {
            // Read current sensitivity level
            const sensitivity = await this.zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
                .readAttributes(['ultrasonicUTToThreshold']);
            
            this.log('Current Sensitivity Level:', sensitivity.ultrasonicUTToThreshold);

            // If you need to set a default sensitivity or change it based on user settings:
            const newSensitivity = this.getSetting('sensitivity') || 1; // Example: Default to 1 if not set
            if (sensitivity.ultrasonicUTToThreshold !== newSensitivity) {
                await this.zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
                    .writeAttributes({ ultrasonicUTToThreshold: newSensitivity });
                this.log('Sensitivity set to:', newSensitivity);
            }
        } catch (error) {
            this.error('Error reading or setting sensitivity:', error);
        }
    }

    onOccupancyAttributeReport(occupancy) {
        this.log('Occupancy status:', occupancy.occupied);

        // Set the motion alarm to true when motion is detected
        this.setCapabilityValue('alarm_motion', occupancy.occupied)
            .catch(err => this.error('Error setting alarm_motion capability value:', err));

        // Clear any existing timeout to avoid premature alarm resets
        clearTimeout(this._motionAlarmTimeout);

        // If motion is detected, set a timeout to reset the alarm after the configured reset time
        if (occupancy.occupied) {
            const alarmResetTime = this.getSetting('alarm_reset_time') || 3; // Use the configured reset time, default to 3 seconds
            this._motionAlarmTimeout = setTimeout(() => {
                this.setCapabilityValue('alarm_motion', false)
                    .catch(err => this.error('Error resetting alarm_motion capability value:', err));
            }, alarmResetTime * 1000); // Convert seconds to milliseconds
        }
    }

    onIlluminationReport(illumination) {
        // Set illuminance value, linked with motion
        this.log('Illuminance reported:', illumination);
        this.setCapabilityValue('measure_luminance', illumination > 50 ? 'bright' : 'dim')
            .catch(err => this.error('Error setting measure_luminance capability:', err));

        // Set motion alarm when illuminance is reported with motion
        this.setCapabilityValue('alarm_motion', true)
            .catch(err => this.error('Error setting alarm_motion capability:', err));
    }

    onBatteryPercentageReport(battery) {
        const batteryPercentage = battery.batteryPercentageRemaining / 2;
        this.log("Battery percentage report:", batteryPercentage);
        this.setCapabilityValue('measure_battery', batteryPercentage)
            .catch(err => this.error('Error setting measure_battery capability:', err));
    }

    async configureAttributeReportingSafe(attributes) {
        try {
            await this.configureAttributeReporting(attributes);
        } catch (error) {
            this.error('Error configuring attribute reporting:', error);
        }
    }

    onDeleted() {
        this.log('Device removed, cleaning up...');
        clearTimeout(this._motionAlarmTimeout); // Clean up any running timeouts
    }
}

module.exports = SensorSNZB03P;