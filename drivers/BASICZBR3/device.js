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

/* 		if (this.hasCapability('onoff')) {
			this.registerCapability('onoff', 'genOnOff');
			this.registerAttrReportListener('genOnOff', 'onoff', 0, 60, null,
			this.onOff_Report.bind(this))
			.catch(err => {
				this.error('failed to register report listener onOff', err);
			});
		}; */

	}

/* 	// Handle reports
	onOff_Report(value) {
		this.setCapabilityValue('onoff', value);
	} */
	
}

module.exports = BasicSwitch;