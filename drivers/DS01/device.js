'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class doorwindowsensor extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

		this.enableDebug();
		debug(true);
    this.printNode();
    
/*     const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
      this.log("frame data! endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
    }; */

		// alarm_contact
      zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
        this.onIASZoneStatusChangeNotification(payload);
      }

  }
  
  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    this.setCapabilityValue('alarm_contact', zoneStatus.alarm1);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery);
  }

	onDeleted(){
		this.log("Door/Window Sensor removed")
	}

}

module.exports = doorwindowsensor;


/* "ids": {
  "modelId": "DS01",
  "manufacturerName": "eWeLink"
},
"endpoints": {
  "endpointDescriptors": [
    {
      "endpointId": 1,
      "applicationProfileId": 260,
      "applicationDeviceId": 1026,
      "applicationDeviceVersion": 0,
      "_reserved1": 0,
      "inputClusters": [
        0,
        3,
        1280,
        1
      ],
      "outputClusters": [
        3
      ]
    }
  ],
  "endpoints": {
    "1": {
      "clusters": {
        "basic": {
          "attributes": "UNSUP_GENERAL_COMMAND",
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "identify": {
          "attributes": "UNSUP_GENERAL_COMMAND",
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "iasZone": {
          "attributes": "UNSUP_GENERAL_COMMAND",
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        },
        "powerConfiguration": {
          "attributes": "UNSUP_GENERAL_COMMAND",
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      },
      "bindings": {
        "identify": {
          "attributes": "UNSUP_GENERAL_COMMAND",
          "commandsGenerated": "UNSUP_GENERAL_COMMAND",
          "commandsReceived": "UNSUP_GENERAL_COMMAND"
        }
      }
    }
  }
} */