'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { debug, CLUSTER } = require('zigbee-clusters');

class SNZB03 extends ZigBeeDevice {
		
  async onNodeInit({zclNode}) {

    /* 		
    this.enableDebug();
    debug(true);
    this.printNode();
    */
    
    /*
    const node = await this.homey.zigbee.getNode(this);
    node.handleFrame = (endpointId, clusterId, frame, meta) => {
      this.log("endpointId:", endpointId,", clusterId:", clusterId,", frame:", frame, ", meta:", meta);
      this.log("Frame JSON data:", frame.toJSON());
    };
    */

    // reset alarms
    this.setCapabilityValue('alarm_water', false).catch(this.error);
    this.setCapabilityValue('alarm_battery', false).catch(this.error);

    // alarm_water
    zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME].onZoneStatusChangeNotification = payload => {
      this.log('zone changed { water_alarm: ', payload.zoneStatus.alarm1, ', battery_alarm: ', payload.zoneStatus.battery, ' }');
      this.setCapabilityValue('alarm_water', payload.zoneStatus.alarm1).catch(this.error);
      this.setCapabilityValue('alarm_battery', payload.zoneStatus.battery).catch(this.error);
    }

  }
  
  onDeleted(){
    this.log("SNZB03 Sensor removed")
  }

}

module.exports = SNZB03;
