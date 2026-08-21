export const discoveryFixture = {
  states: {
    "sensor.main_all_power_rt": {
      state: "1842",
      attributes: { friendly_name: "EcoMain Main Power", device_class: "power", state_class: "measurement", unit_of_measurement: "W" },
    },
    "sensor.main_all_energy_fwd_total": {
      state: "910234",
      attributes: { friendly_name: "EcoMain Main Energy", device_class: "energy", state_class: "total_increasing", unit_of_measurement: "Wh" },
    },
    "sensor.main_ch1_power_rt": {
      state: "820",
      attributes: { friendly_name: "EcoMain Channel 1", device_class: "power", state_class: "measurement", unit_of_measurement: "W" },
    },
    "sensor.main_ch2_power_rt": {
      state: "unavailable",
      attributes: { friendly_name: "EcoMain Channel 2", device_class: "power", state_class: "measurement", unit_of_measurement: "W" },
    },
    "sensor.shelly_kitchen_power": {
      state: "425.2",
      attributes: { friendly_name: "Shelly Kitchen Power", device_class: "power", state_class: "measurement", unit_of_measurement: "W" },
    },
    "sensor.esphome_garage_energy": {
      state: "82.4",
      attributes: { friendly_name: "Garage Energy", device_class: "energy", state_class: "total_increasing", unit_of_measurement: "kWh" },
    },
    "sensor.generic_voltage": {
      state: "229.8",
      attributes: { friendly_name: "Supply Voltage", unit_of_measurement: "V" },
    },
    "sensor.generic_kw_load": {
      state: "1.25",
      attributes: { friendly_name: "Generic Load", unit_of_measurement: "kW" },
    },
    "sensor.generic_wh_energy": {
      state: "3200",
      attributes: { friendly_name: "Generic Accumulator", unit_of_measurement: "Wh" },
    },
    "sensor.generic_kwh_energy": {
      state: "18.4",
      attributes: { friendly_name: "Generic Usage", unit_of_measurement: "kWh" },
    },
    "sensor.non_numeric_power": {
      state: "on",
      attributes: { friendly_name: "Non Numeric Power", device_class: "power", unit_of_measurement: "W" },
    },
    "sensor.metadata_poor": {
      state: "42",
      attributes: { friendly_name: "Metadata Poor Sensor" },
    },
  },
};
