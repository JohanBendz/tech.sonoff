'use strict';

const Homey = require('homey');
const ZigBeeDevice = require("homey-meshdriver").ZigBeeDevice;

class ZBMINI extends ZigBeeDevice {
	
	async onMeshInit() {

		this.enableDebug();
		this.printNode();

		// Register capabilities and listeners
		if (this.hasCapability('onoff')) {
			this.registerCapability('onoff', 'genOnOff');
		};

	}
	
}

module.exports = ZBMINI;