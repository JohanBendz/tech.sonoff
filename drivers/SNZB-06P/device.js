'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, CLUSTER } = require('zigbee-clusters');

class SensorSNZB06P extends ZigBeeDevice {

    async onNodeInit({ zclNode }) {

        this.printNode();

        if (this.isFirstInit()) {
            await this.configureAttributeReporting([
                {
                    endpointId: 1,
                    cluster: CLUSTER.OCCUPANCY_SENSING,
                    attributeName: 'occupancy',
                    minInterval: 0,
                    maxInterval: 3600,
                    minChange: 1,
                },
                {
                    endpointId: 1,
                    cluster: CLUSTER.IAS_ZONE,
                    attributeName: 'zoneStatus',
                    minInterval: 0,
                    maxInterval: 3600,
                    minChange: 1,
                }
            ]);
        }

        // Occupancy
        zclNode.endpoints[1].clusters[CLUSTER.OCCUPANCY_SENSING.NAME]
            .on('attr.occupancy', this.onOccupancyAttributeReport.bind(this));

        // IAS Zone Status
        zclNode.endpoints[1].clusters[CLUSTER.IAS_ZONE.NAME]
            .on('attr.zoneStatus', this.onZoneStatusAttributeReport.bind(this));

    }

    onOccupancyAttributeReport(occupancy) {
        this.log("Occupancy status:", occupancy);
        this.setCapabilityValue('alarm_motion', occupancy)
            .catch(err => this.error('Error: could not set alarm_motion capability value', err));
    }

    onZoneStatusAttributeReport(zoneStatus) {
      // Process zone status attribute report
      const alarm1 = (zoneStatus & 0x01) > 0;
      const alarm2 = (zoneStatus & 0x02) > 0;
      const tamper = (zoneStatus & 0x04) > 0;
      this.log("Zone status:", {
          alarm1,
          alarm2,
          tamper,
      });
      // Set capability values
      this.setCapabilityValue('alarm_contact', alarm1 || alarm2)
          .catch(err => this.error('Error: could not set alarm_contact capability value', err));
      this.setCapabilityValue('alarm_tamper', tamper)
          .catch(err => this.error('Error: could not set alarm_tamper capability value', err));
    }

}

module.exports = SensorSNZB06P;
