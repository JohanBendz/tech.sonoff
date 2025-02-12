"use strict";

const { ZigBeeDevice } = require("homey-zigbeedriver");
const { Cluster, CLUSTER } = require("zigbee-clusters");
const SonoffSpecificCluster = require("../../lib/SonoffSpecificCluster");
const SonoffHelpers = require("../../lib/SonoffHelpers");

Cluster.addCluster(SonoffSpecificCluster);

class TRVZBDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log("Initializing TRVZB device");

    // var localTemperatureRead =
    //   await zclNode.endpoints[1].clusters.thermostat.readAttributes([
    //     "localTemperature",
    //   ]);
    // console.log("localTemperatureRead", localTemperatureRead);

    // Set up attribute reporting
    await SonoffHelpers.configureReporting(this, [
      {
        endpointId: 1,
        cluster: CLUSTER.THERMOSTAT,
        attributeName: "localTemperature",
        minInterval: 30,
        maxInterval: 300,
        minChange: 1,
      },
      {
        endpointId: 1,
        cluster: CLUSTER.THERMOSTAT,
        attributeName: "occupiedHeatingSetpoint",
        minInterval: 30,
        maxInterval: 300,
        minChange: 10,
      },
    ]);

    // Register capabilities
    // this.registerCapability("measure_temperature", zclNode.endpoints[1].clusters.thermostat, {
    //   get: "localTemperature",
    //   report: "localTemperature",
    //   reportParser: (value) => value / 100,
    //   getOpts: {
    //     getOnStart: true,
    //   },
    // });

    this.registerCapability("measure_temperature", CLUSTER.THERMOSTAT, {
      report: "localTemperature",
      reportParser: (value) => {
        console.log("localTemperatureReportValue", value);
        return value / 100;
      },
      get: "localTemperature",
      getParser: (value) => {
        console.log("localTemperatureGetValue", value);
        return value / 100;
      },
      getOpts: {
        getOnStart: true,
      },
    });

    this.registerCapability("target_temperature", CLUSTER.THERMOSTAT, {
      get: "occupiedHeatingSetpoint",
      report: "occupiedHeatingSetpoint",
      reportParser: (value) => value / 100,
      getOpts: {
        getOnStart: true,
      },
    });
    this.registerCapabilityListener("target_temperature", async (value) => {
      this.writeAttributes(CLUSTER.THERMOSTAT, {
        occupiedHeatingSetpoint: value * 100,
      });
    });

    // Initial battery check
    await this.checkBatteryHere(zclNode, this);

    // Initial temperature check
    await this.checkCurrentTemperature(zclNode, this);

    // Periodic battery check every 6 hours
    this.batteryCheckInterval = setInterval(() => {
      this.checkBatteryHere(zclNode, this);
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    // Periodic measure temperature every 15 min
    this.temperatureCheckInterval = setInterval(() => {
      this.checkCurrentTemperature(zclNode, this);
    }, 15 * 60 * 1000); // Every 15 min

    // Read initial settings
    await this.readInitialSettings(zclNode);

    // Handle settings changes
    this.onSettings = this.onSettings.bind(this);

    // temperatureMeasurement: TemperatureMeasurement
    //  thermostat: ThermostatCluster
  }

  async checkBatteryHere(zclNode, device) {
    device.log("Checking battery status");
    try {
      const value =
        await zclNode.endpoints[1].clusters.powerConfiguration.readAttributes([
          "batteryPercentageRemaining",
        ]);
      device.log("Battery value:", value);
      if (value.batteryPercentageRemaining !== undefined) {
        const batteryPercentage = value.batteryPercentageRemaining / 2;
        await device.setCapabilityValue("measure_battery", batteryPercentage);
      }
    } catch (error) {
      device.error("Failed to retrieve battery status", error);
    }
  }

  async checkCurrentTemperature(zclNode, device) {
    device.log("Checking current temperature");
    try {
      const value =
        await zclNode.endpoints[1].clusters.thermostat.readAttributes([
          "localTemperature",
        ]);
      device.log("Local temperature value:", value);
      if (value.localTemperature !== undefined) {
        const localTemperature = value.localTemperature / 100;
        device.log('localTemperature:', localTemperature)
        await device.setCapabilityValue(
          "measure_temperature",
          localTemperature
        );
      }
    } catch (error) {
      device.error("Failed to retrieve current temperature", error);
    }
  }

  async readInitialSettings(zclNode) {
    const settingsAttributes = [
      "child_lock",
      "open_window",
      "frost_protection_temperature",
    ];
    try {
      // const values = await SonoffHelpers.readAttributes(
      //   zclNode,
      //   SonoffSpecificCluster,
      //   settingsAttributes,
      //   this
      // );

      const values =
        await zclNode.endpoints[1].clusters.SonoffSpecificCluster.readAttributes(
          settingsAttributes
        );

      this.log("Initial settings read:", values);

      const settings = {};
      for (const attr of settingsAttributes) {
        settings[attr] =
          attr === "frost_protection_temperature"
            ? values[attr] / 100
            : values[attr];
      }
      await this.setSettings(settings);
    } catch (error) {
      this.error("Failed to read initial settings", error);
    }

    // Read local temperature calibration
    try {
      const { localTemperatureCalibration } =
        await zclNode.endpoints[1].clusters.thermostat.readAttributes([
          "localTemperatureCalibration",
        ]);

      // await SonoffHelpers.readAttributes(
      //   zclNode,
      //   CLUSTER.THERMOSTAT,
      //   "localTemperatureCalibration",
      //   this
      // );

      this.log(
        "Local temperature calibration read:",
        localTemperatureCalibration
      );
      await this.setSettings({
        localTemperatureCalibration: localTemperatureCalibration / 10,
      });
    } catch (error) {
      this.error("Failed to read local temperature calibration", error);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const sonoffClusterAttributes = {};
    const thermostatClusterAttributes = {};

    for (const key of changedKeys) {
      if (key === "localTemperatureCalibration") {
        thermostatClusterAttributes.localTemperatureCalibration = Math.round(
          newSettings[key] * 10
        );
      } else if (["child_lock", "open_window"].includes(key)) {
        sonoffClusterAttributes[key] = newSettings[key];
      } else if (key === "frost_protection_temperature") {
        sonoffClusterAttributes[key] = Math.round(newSettings[key] * 100);
      }
    }

    // Write to Sonoff-specific cluster
    if (Object.keys(sonoffClusterAttributes).length > 0) {
      try {
        await SonoffHelpers.writeAttributes(
          this.zclNode,
          SonoffSpecificCluster,
          sonoffClusterAttributes,
          this
        );
        this.log("Sonoff-specific settings updated:", sonoffClusterAttributes);
      } catch (error) {
        this.error("Failed to update Sonoff-specific settings", error);
      }
    }

    // Write to thermostat cluster
    if (Object.keys(thermostatClusterAttributes).length > 0) {
      try {
        await SonoffHelpers.writeAttributes(
          this.zclNode,
          CLUSTER.THERMOSTAT,
          thermostatClusterAttributes,
          this
        );
        this.log("Thermostat settings updated:", thermostatClusterAttributes);
      } catch (error) {
        this.error("Failed to update thermostat settings", error);
      }
    }
  }

  onDeleted() {
    this.log("TRVZB device removed");
    if (this.batteryCheckInterval) {
      clearInterval(this.batteryCheckInterval);
    }
  }

  async writeAttributes(cluster, attribs) {
    if ("NAME" in cluster) cluster = cluster.NAME;
    try {
      this.log("Write attribute", attribs);
      this.zclNode.endpoints[1].clusters[cluster]
        .writeAttributes(attribs)
        .then((value) => {
          this.log("Write attr", attribs);
        })
        .catch(() => {
          this.error("Error write attr", attribs);
        });
    } catch (error) {
      this.error("Error (2) read", attribs, error);
    }
  }
}

module.exports = TRVZBDevice;
