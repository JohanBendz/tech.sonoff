'use strict';

const Homey = require('homey');
const ZigBeeDevice = require("homey-meshdriver").ZigBeeDevice;

class BasicSwitch extends ZigBeeDevice {
	
	async onMeshInit() {

		this.enableDebug();
		this.printNode();

		// Register capabilities and listeners
		this.registerCapability('onoff', 'genOnOff', {
			set: value => value ? 'on' : 'off',
			setParser: () => ({}),
			get: 'onOff',
			reportParser: value => value === 1,
		});

	}
	
}

module.exports = BasicSwitch;