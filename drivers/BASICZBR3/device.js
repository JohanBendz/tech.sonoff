'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class BasicSwitch extends ZigBeeDevice {
	
	async onNodeInit({ zclNode }) {

        if (this.hasCapability('onoff')) this.registerCapability('onoff', CLUSTER.ON_OFF, {
			getOpts: {},
		});

	}
	
}

module.exports = BasicSwitch;