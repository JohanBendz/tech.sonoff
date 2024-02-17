'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster');

class WirelessButton extends ZigBeeDevice {
	
	async onNodeInit({ zclNode }) {

/* 		this.enableDebug();
		debug(true);
		this.printNode(); */

/* 		const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
	  		this.log("frame data! endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
		}; */

		// Button
		zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
			onToggle: this._toggleCommandParser.bind(this),
			onSetOn: this._onCommandParser.bind(this),
			onSetOff: this._offCommandParser.bind(this)
		}));

		this._buttonToggleTriggerDevice = this.homey.flow.getDeviceTriggerCard('SNZB-01P_one_click');
		this._buttonOnTriggerDevice = this.homey.flow.getDeviceTriggerCard('SNZB-01P_two_clicks');
		this._buttonOffTriggerDevice = this.homey.flow.getDeviceTriggerCard('SNZB-01P_hold');

		// alarm_battery
		if (this.hasCapability('alarm_battery')) {				
			this.batteryThreshold = this.getSetting('batteryThreshold');
			this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
				getOpts: {},
				reportOpts: {
					configureAttributeReporting: {
						minInterval: 300,
						maxInterval: 60000,
						minChange: 1
					}
				}
			});
		}

	}
	
	_toggleCommandParser() {
		return this._buttonToggleTriggerDevice.trigger(this, {}, {})
		  .then(() => this.log('triggered SNZB-01P_one_click'))
		  .catch(err => this.error('Error triggering SNZB-01P_one_click', err));
	}

	_onCommandParser() {
		return this._buttonOnTriggerDevice.trigger(this, {}, {})
		  .then(() => this.log('triggered SNZB-01P_two_clicks'))
		  .catch(err => this.error('Error triggering SNZB-01P_two_clicks', err));
	}
	
	_offCommandParser() {
	return this._buttonOffTriggerDevice.trigger(this, {}, {})
		.then(() => this.log('triggered SNZB-01P_hold'))
		.catch(err => this.error('Error triggering SNZB-01P_hold', err));
	}

}

module.exports = WirelessButton;