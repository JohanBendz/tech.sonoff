'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

// Import custom Sonoff clusters
const SonoffSpecificOnOffCluster = require('../../lib/SonoffSpecificOnOffCluster');
const SonoffSpecificOnOffSwitchCluster = require("../../lib/SonoffSpecificOnOffSwitchCluster");
Cluster.addCluster(SonoffSpecificOnOffCluster);
Cluster.addCluster(SonoffSpecificOnOffSwitchCluster);

class ZBMINI extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', CLUSTER.ON_OFF, {
            });
        }
    }

    async onSettings(settingsEvent) {
        const newSettings = settingsEvent.newSettings;
        const changedKeys = settingsEvent.changedKeys;

        // Handle power loss behavior setting
        if (changedKeys.includes('powerOnCtrl_state')) {
            try {
                const powerOnCtrlstate = await this.zclNode.endpoints[1].clusters.onOff.readAttributes(['powerOnCtrl']);
                await this.zclNode.endpoints[1].clusters.onOff.writeAttributes({
                    powerOnCtrl: newSettings.powerOnCtrl_state
                }); // default: On (On, Off, 255 = Recover)
                this.log("Power On Control supported by device");
            } catch (error) {
                this.log("This device does not support Power On Control");
            }
        }
    }
}

module.exports = ZBMINI;
