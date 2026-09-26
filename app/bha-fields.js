/* Metadata only: the registry never manufactures performance or strength ratings. */
(() => {
  const common = [
    "tool_joint_od_m",
    "tool_joint_id_m",
    "torsional_stiffness_nm_rad",
    "body_rating_n",
    "connection_rating_n",
    "survey_sensor_offset_m",
    "survey_toolcode",
    "wear_notes",
    "comments",
  ];
  for (const item of WellBhaRegistry) {
    const extra = [...common];
    if (item.id.includes("pdm"))
      extra.push(
        "housing_configuration",
        "rotor_diameter_m",
        "stator_diameter_m",
        "eccentricity_m",
        "elastomer_condition",
        "flow_nominal_m3_s",
        "no_load_pressure_loss_pa",
        "bearing_rating_n",
        "drive_shaft_rating_nm",
        "curve_type",
        "mud_compatibility",
        "surface_rpm_measured",
        "shaft_rpm_source",
        "bit_rpm_source",
      );
    if (item.id.includes("rss"))
      extra.push(
        "nominal_gauge_od_m",
        "pad_position_m",
        "pad_pressure_limit_pa",
        "toolface_control",
        "vendor_calibration_source",
      );
    if (item.id.includes("stabilizer"))
      extra.push("blade_type", "blade_count", "gauge_od_m", "wear_m");
    if (item.id === "pdc-bit")
      extra.push(
        "gauge_length_m",
        "undercut_m",
        "blade_count",
        "cutter_details",
        "steerability_calibration_source",
        "walk_calibration_source",
        "nozzle_area_m2",
      );
    if (item.id === "tricone")
      extra.push("cone_count", "tooth_type", "nozzle_area_m2");
    if (item.id === "jar") extra.push("setting_n", "stroke_m", "rating_source");
    item.fields = [...new Set([...item.fields, ...extra])];
  }
})();
