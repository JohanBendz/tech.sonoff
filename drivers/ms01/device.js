'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class MotionSensor extends ZigBeeDevice {
	
	async onNodeInit({ zclNode }) {

/* 		this.enableDebug();
		debug(true);
		this.printNode(); */

/* 		const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
	  		this.log("frame data! endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
		}; */

		// alarm_motion & alarm_battery
		zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
			this.log(payload);
			this.onIASZoneStatusChangeNotification(payload);
		}

	}

	onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
		this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
		this.setCapabilityValue('alarm_motion', zoneStatus.alarm1);
		this.setCapabilityValue('alarm_battery', zoneStatus.battery);
	}

	onDeleted(){
		this.log("MotionSensor removed")
	}
	
}

module.exports = MotionSensor;