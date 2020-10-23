'use strict';

const Homey = require('homey');

class SonOffZigbee extends Homey.App {
	
	onInit() {
		this.log('SONOFF Zigbee App is running...');
	}
	
}

module.exports = SonOffZigbee;