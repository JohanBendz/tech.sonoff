'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class SA_003_Zigbee extends ZigBeeDevice {
	
	async onNodeInit({ zclNode }) {

        if (this.hasCapability('onoff')) this.registerCapability('onoff', CLUSTER.ON_OFF, {
			getOpts: {
				getOnOnline: true,
			},
		});

	}
	
}

module.exports = SA_003_Zigbee;