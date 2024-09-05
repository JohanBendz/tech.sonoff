'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class doorwindowsensor extends ZigBeeDevice {
		
	async onNodeInit({zclNode}) {

/* 		this.enableDebug();
		debug(true);
    this.printNode(); */
    
/*
    const node = await this.homey.zigbee.getNode(this);
		node.handleFrame = (endpointId, clusterId, frame, meta) => {
        this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
        this.log("Frame JSON data:", frame.toJSON());
    };
    
*/

		// alarm_contact
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.onIASZoneStatusChangeNotification(payload);
    }

  }
  
  onIASZoneStatusChangeNotification({zoneStatus, extendedStatus, zoneId, delay,}) {
    this.log('IASZoneStatusChangeNotification received:', zoneStatus, extendedStatus, zoneId, delay);
    const reverseAlarmLogic = this.getSetting('reverse_contact_alarm') || false;
    const parsedData = !reverseAlarmLogic ? zoneStatus.alarm1 === true : zoneStatus.alarm1 === false;
    this.setCapabilityValue('alarm_contact', parsedData).catch(this.error);
    this.setCapabilityValue('alarm_battery', zoneStatus.battery).catch(this.error);
  }

	onDeleted(){
		this.log("Door/Window Sensor removed")
	}

}

module.exports = doorwindowsensor;


/*
New version:
"modelId": "SNZB-04",
"manufacturerName": "eWeLink"

Old version:
"ids": {
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