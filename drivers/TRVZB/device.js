'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const SonoffSpecificCluster = require('../../lib/SonoffSpecificCluster');
const { debug, CLUSTER } = require('zigbee-clusters');

const CUSTOM_ATTRIBUTES = [
    'child_lock',
    'open_window',
    'frost_protection_temperature'
];

class TRVZB extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {
        debug(true);
        this.printNode();

        // Configure attribute reporting for temperature, setpoints, and custom attributes
        await this.configureAttributeReportingSafe([
            {
                endpointId: 1,
                cluster: CLUSTER.THERMOSTAT,
                attributeName: 'localTemperature',
                minInterval: 0,
                maxInterval: 3600,
                minChange: 10
            },
            {
                endpointId: 1,
                cluster: CLUSTER.THERMOSTAT,
                attributeName: 'occupiedHeatingSetpoint',
                minInterval: 0,
                maxInterval: 3600,
                minChange: 10
            },
            {
                endpointId: 1,
                cluster: CLUSTER.THERMOSTAT,
                attributeName: 'localTemperatureCalibration',
                minInterval: 0,
                maxInterval: 3600,
                minChange: 1
            },
            ...CUSTOM_ATTRIBUTES.map((attr) => ({
                endpointId: 1,
                cluster: SonoffSpecificCluster,
                attributeName: attr,
                minInterval: 0,
                maxInterval: 3600
            }))
        ]).then(() => {
            this.log('Registered attribute report listeners successfully.');
        }).catch(err => {
            this.error('Failed to register attribute report listeners', err);
        });

        // Register capabilities for temperature and setpoints
        this.registerCapability("measure_temperature", CLUSTER.THERMOSTAT, {
            report: 'localTemperature',
            reportParser: value => value / 100,
            get: 'localTemperature',
            getParser: value => value / 100
        });

        this.registerCapability("target_temperature", CLUSTER.THERMOSTAT, {
            report: 'occupiedHeatingSetpoint',
            reportParser: value => value / 100,
            get: 'occupiedHeatingSetpoint',
            getParser: value => value / 100
        });

        // Listener for setting target temperature
        this.registerCapabilityListener("target_temperature", async (value) => {
            await this.writeAttributes(CLUSTER.THERMOSTAT, {
                occupiedHeatingSetpoint: value * 100
            }).catch(err => this.error('Error setting target temperature:', err));
        });

        // Handle custom attributes and settings
        CUSTOM_ATTRIBUTES.forEach((attr) => {
            zclNode.endpoints[1].clusters[SonoffSpecificCluster.NAME]
                .on('attr.' + attr, (value) => {
                    const settingsUpdate = {};
                    settingsUpdate[attr] = value;
                    this.setSettings(settingsUpdate);
                });
        });

        this.checkAttributes();
        this.log('Sonoff TRVZB device initialized.');
    }

    async setSettings(settings) {
        Object.entries(settings).forEach(([key, value]) => {
            if (key === "localTemperatureCalibration") {
                settings[key] = value / 100;
            } else if (key.includes("temperature")) {
                settings[key] = value / 100;
            }
        });
        await super.setSettings(settings);
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        const changedAttributes = CUSTOM_ATTRIBUTES.reduce((acc, key) => {
            if (newSettings.hasOwnProperty(key)) {
                acc[key] = newSettings[key];
                if (key.includes("temperature")) {
                    acc[key] = acc[key] * 100;
                }
            }
            return acc;
        }, {});

        await this.writeAttributes(SonoffSpecificCluster, changedAttributes)
            .catch(err => this.error('Error writing custom settings:', err));

        await this.writeAttributes(CLUSTER.THERMOSTAT, { localTemperatureCalibration: newSettings.localTemperatureCalibration * 10 })
            .catch(err => this.error('Error writing temperature calibration:', err));
    }

    async checkAttributes() {
        this.readAttribute(SonoffSpecificCluster, CUSTOM_ATTRIBUTES, (data) => {
            this.setSettings(data);
        }).catch(err => this.error('Error reading custom attributes:', err));

        this.readAttribute(CLUSTER.THERMOSTAT, ['localTemperatureCalibration'], (data) => {
            this.setSettings(data);
        }).catch(err => this.error('Error reading thermostat attributes:', err));
    }

    async configureAttributeReportingSafe(attributes) {
        try {
            await this.configureAttributeReporting(attributes);
        } catch (error) {
            this.error('Error configuring attribute reporting:', error);
        }
    }
}

module.exports = TRVZB;
