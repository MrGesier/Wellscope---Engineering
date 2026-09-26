/* Independently authored equipment taxonomy; no vendor dimensions or ratings. */
(function(root){
 const tools=[
  {
    "id": "pdc-bit",
    "label": "PDC bit",
    "group": "Bits & coring",
    "purpose": "Shears formation with fixed cutters.",
    "distinction": "Fixed blades with discrete cutter discs.",
    "fields": [
      "blade_count",
      "gauge_length_m",
      "nozzle_area_m2"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "tricone",
    "label": "TCI tricone bit",
    "group": "Bits & coring",
    "purpose": "Crushes formation with insert-bearing rotating cones.",
    "distinction": "Three cones carrying rounded carbide inserts.",
    "fields": [
      "cone_count",
      "tooth_type",
      "nozzle_area_m2"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "straight-pdm",
    "label": "Straight mud motor",
    "group": "Steering & drive",
    "purpose": "Converts mud hydraulic power to bit rotation.",
    "distinction": "Straight power section and bearing housing.",
    "fields": [
      "rotor_lobes",
      "stator_lobes",
      "stage_count"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "bent-pdm",
    "label": "Bent-housing mud motor",
    "group": "Steering & drive",
    "purpose": "Provides bit rotation with a directional housing offset.",
    "distinction": "Angled bearing housing below the power section.",
    "fields": [
      "bend_angle_deg",
      "bit_to_bend_m",
      "toolface_deg"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "rss-push",
    "label": "Push-the-bit RSS",
    "group": "Steering & drive",
    "purpose": "Steers using commanded borehole-wall reaction forces.",
    "distinction": "External steering pads; force calibration is external.",
    "fields": [
      "pad_force_n",
      "pad_position_m",
      "nominal_gauge_od_m"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "rss-point",
    "label": "Point-the-bit RSS",
    "group": "Steering & drive",
    "purpose": "Steers by changing the bit shaft direction.",
    "distinction": "Articulated internal shaft shown in schematic cutaway.",
    "fields": [
      "shaft_tilt_deg",
      "steering_pivot_m",
      "vendor_calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "near-bit-stabilizer",
    "label": "Near-bit stabilizer",
    "group": "Stabilization & enlargement",
    "purpose": "Provides a gauge contact close to the bit.",
    "distinction": "Short body and lower-position blade pack.",
    "fields": [
      "gauge_od_m",
      "blade_count",
      "contact_from_bit_m"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "string-stabilizer",
    "label": "Spiral string stabilizer",
    "group": "Stabilization & enlargement",
    "purpose": "Provides a stabilizing contact along the BHA.",
    "distinction": "Integral helical blade pack at mid-body.",
    "fields": [
      "gauge_od_m",
      "blade_count",
      "blade_length_m"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "mwd",
    "label": "MWD survey and telemetry collar",
    "group": "Measurement & logging",
    "purpose": "Carries directional measurement and telemetry components.",
    "distinction": "Survey package and mud-pulse telemetry module shown schematically.",
    "fields": [
      "survey_sensor_offset_m",
      "telemetry_type",
      "survey_toolcode"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "lwd",
    "label": "Integrated LWD collar",
    "group": "Measurement & logging",
    "purpose": "Combines multiple formation-evaluation measurements.",
    "distinction": "Multiple sensor stations in one collar.",
    "fields": [
      "sensor_types",
      "survey_sensor_offset_m",
      "source_revision"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "nmdc",
    "label": "Nonmagnetic drill collar",
    "group": "Tubulars & flex elements",
    "purpose": "Provides weight and sensor spacing with specified magnetic properties.",
    "distinction": "Smooth collar with nonmagnetic material band; material needs certification.",
    "fields": [
      "material_grade",
      "density_kg_m3",
      "elastic_modulus_pa"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "slick-collar",
    "label": "Slick steel drill collar",
    "group": "Tubulars & flex elements",
    "purpose": "Provides weight and section stiffness.",
    "distinction": "Heavy smooth wall and uniform cylindrical body.",
    "fields": [
      "material_grade",
      "elastic_modulus_pa",
      "density_kg_m3"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "spiral-collar",
    "label": "Spiral drill collar",
    "group": "Tubulars & flex elements",
    "purpose": "Provides collar weight with exterior spiral grooves.",
    "distinction": "Continuous external relief grooves.",
    "fields": [
      "groove_depth_m",
      "elastic_modulus_pa",
      "density_kg_m3"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "hwdp",
    "label": "Heavy-weight drill pipe",
    "group": "Tubulars & flex elements",
    "purpose": "Transitions between collars and drill pipe.",
    "distinction": "Tool joints and central upset.",
    "fields": [
      "tool_joint_od_m",
      "center_upset_od_m",
      "material_grade"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "drillpipe",
    "label": "Steel drill pipe",
    "group": "Tubulars & flex elements",
    "purpose": "Transmits torque, axial load and circulating fluid.",
    "distinction": "Slender tube with enlarged end tool joints.",
    "fields": [
      "tool_joint_od_m",
      "tool_joint_id_m",
      "material_grade"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "jar",
    "label": "Hydraulic drilling jar",
    "group": "Impact & vibration",
    "purpose": "Provides a controlled impact after the specified loading sequence.",
    "distinction": "Telescoping mandrel and hydraulic delay section shown in cutaway.",
    "fields": [
      "stroke_m",
      "setting_n",
      "rating_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "accelerator",
    "label": "Jar accelerator",
    "group": "Impact & vibration",
    "purpose": "Stores and releases energy for a compatible jar system.",
    "distinction": "Energy-storage spring section, not an impact latch.",
    "fields": [
      "stroke_m",
      "spring_rate_n_m",
      "rating_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "reamer",
    "label": "Fixed-blade reamer",
    "group": "Stabilization & enlargement",
    "purpose": "Cuts or conditions an existing borehole at fixed gauge.",
    "distinction": "Cutting pads on fixed blades.",
    "fields": [
      "gauge_od_m",
      "cutter_details",
      "blade_length_m"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "underreamer",
    "label": "Arm-type underreamer",
    "group": "Stabilization & enlargement",
    "purpose": "Enlarges below a restriction using deployable cutter arms.",
    "distinction": "Hinged arms shown extended, with a separate retracted diameter.",
    "fields": [
      "retracted_od_m",
      "expanded_od_m",
      "activation_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "float-sub",
    "label": "Drillstring float sub",
    "group": "Circulation & connections",
    "purpose": "Houses a drillstring nonreturn valve.",
    "distinction": "Valve seat and flap shown in cutaway.",
    "fields": [
      "valve_type",
      "pressure_max_pa",
      "rating_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "crossover",
    "label": "Crossover sub",
    "group": "Circulation & connections",
    "purpose": "Connects different thread or connection specifications.",
    "distinction": "Stepped body with dissimilar end connections.",
    "fields": [
      "connection_top_box",
      "connection_bottom_pin",
      "rating_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "shock-sub",
    "label": "Axial shock sub",
    "group": "Impact & vibration",
    "purpose": "Provides axial compliance to reduce transmitted shock.",
    "distinction": "Spring and telescoping section; no jar latch.",
    "fields": [
      "stroke_m",
      "spring_rate_n_m",
      "rating_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "vibration-sub",
    "label": "Axial oscillation tool",
    "group": "Impact & vibration",
    "purpose": "Introduces hydraulic axial oscillation for friction-management applications.",
    "distinction": "Pulse section and compliant section shown schematically.",
    "fields": [
      "activation_source",
      "flow_min_m3_s",
      "flow_max_m3_s"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "diamond-bit",
    "label": "Surface-set diamond bit",
    "group": "Bits & coring",
    "purpose": "Cuts with exposed diamond elements on a matrix crown.",
    "distinction": "Small exposed stones across a rounded crown.",
    "fields": [
      "gauge_length_m",
      "cutter_details",
      "nozzle_area_m2"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "impregnated-bit",
    "label": "Impregnated diamond bit",
    "group": "Bits & coring",
    "purpose": "Abrades formation with diamond-bearing matrix segments.",
    "distinction": "Segmented abrasive crown with fluid waterways.",
    "fields": [
      "matrix_description",
      "gauge_length_m",
      "nozzle_area_m2"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "steel-tooth-bit",
    "label": "Milled-tooth tricone bit",
    "group": "Bits & coring",
    "purpose": "Crushes formation using integral steel cone teeth.",
    "distinction": "Triangular milled teeth instead of TCI buttons.",
    "fields": [
      "cone_count",
      "tooth_type",
      "nozzle_area_m2"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "hybrid-bit",
    "label": "Hybrid fixed-cutter / cone bit",
    "group": "Bits & coring",
    "purpose": "Combines fixed-cutter shearing and cone crushing.",
    "distinction": "Fixed blades interleaved with rolling cutters.",
    "fields": [
      "blade_count",
      "cone_count",
      "cutter_details"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "core-bit",
    "label": "Coring bit",
    "group": "Bits & coring",
    "purpose": "Cuts an annulus while leaving a central core.",
    "distinction": "Open annular cutting crown.",
    "fields": [
      "core_diameter_m",
      "cutter_details",
      "nozzle_area_m2"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "core-barrel",
    "label": "Core barrel",
    "group": "Bits & coring",
    "purpose": "Houses and retains the recovered core sample.",
    "distinction": "Concentric inner barrel and core catcher in cutaway.",
    "fields": [
      "core_diameter_m",
      "core_capacity_m",
      "core_catcher_type"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "turbodrill",
    "label": "Turbodrill",
    "group": "Steering & drive",
    "purpose": "Converts fluid power through turbine stages into rotation.",
    "distinction": "Repeated rotor/stator stages, not a helical PDM section.",
    "fields": [
      "stage_count",
      "flow_min_m3_s",
      "shaft_rpm_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "flex-sub",
    "label": "Flex joint",
    "group": "Tubulars & flex elements",
    "purpose": "Provides a designed section of lower bending stiffness.",
    "distinction": "Reduced external neck between larger ends.",
    "fields": [
      "elastic_modulus_pa",
      "flex_length_m",
      "minimum_od_m"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "pony-collar",
    "label": "Pony drill collar",
    "group": "Tubulars & flex elements",
    "purpose": "Provides a short collar length for assembly spacing.",
    "distinction": "Short heavy-wall collar.",
    "fields": [
      "material_grade",
      "elastic_modulus_pa",
      "source_revision"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "spiral-hwdp",
    "label": "Spiral heavy-weight drill pipe",
    "group": "Tubulars & flex elements",
    "purpose": "Provides a heavy pipe transition with spiral exterior relief.",
    "distinction": "Center upset plus spiral grooves.",
    "fields": [
      "center_upset_od_m",
      "groove_depth_m",
      "material_grade"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "aluminium-drillpipe",
    "label": "Aluminium drill pipe",
    "group": "Tubulars & flex elements",
    "purpose": "Provides a lower-density tubular option with specified joints.",
    "distinction": "Light-alloy body and dissimilar steel tool-joint interfaces shown in cutaway.",
    "fields": [
      "material_grade",
      "density_kg_m3",
      "elastic_modulus_pa"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "straight-blade-stabilizer",
    "label": "Straight-blade stabilizer",
    "group": "Stabilization & enlargement",
    "purpose": "Provides fixed-gauge wall contact.",
    "distinction": "Straight longitudinal blades instead of a helix.",
    "fields": [
      "gauge_od_m",
      "blade_count",
      "blade_length_m"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "sleeve-stabilizer",
    "label": "Replaceable-sleeve stabilizer",
    "group": "Stabilization & enlargement",
    "purpose": "Provides gauge contact using a replaceable sleeve.",
    "distinction": "Blade sleeve with shoulder and retention interfaces.",
    "fields": [
      "gauge_od_m",
      "sleeve_length_m",
      "retention_type"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "nonrotating-stabilizer",
    "label": "Nonrotating-sleeve stabilizer",
    "group": "Stabilization & enlargement",
    "purpose": "Provides wall contact through a sleeve able to rotate relative to the mandrel.",
    "distinction": "Separate sleeve and bearing interfaces.",
    "fields": [
      "gauge_od_m",
      "sleeve_length_m",
      "bearing_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "variable-gauge-stabilizer",
    "label": "Variable-gauge stabilizer",
    "group": "Stabilization & enlargement",
    "purpose": "Changes effective contact gauge using adjustable pads.",
    "distinction": "Radial pads and adjustment mandrel in cutaway.",
    "fields": [
      "retracted_od_m",
      "expanded_od_m",
      "activation_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "roller-reamer",
    "label": "Roller reamer",
    "group": "Stabilization & enlargement",
    "purpose": "Conditions the borehole through rolling cutters.",
    "distinction": "Longitudinal rollers carried in body pockets.",
    "fields": [
      "gauge_od_m",
      "roller_count",
      "bearing_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "hole-opener-roller",
    "label": "Roller-cone hole opener",
    "group": "Stabilization & enlargement",
    "purpose": "Enlarges a pilot hole with a fixed cutting diameter.",
    "distinction": "Radial cone cutters around a fixed large body.",
    "fields": [
      "pilot_od_m",
      "gauge_od_m",
      "cone_count"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "hole-opener-pdc",
    "label": "Fixed PDC hole opener",
    "group": "Stabilization & enlargement",
    "purpose": "Enlarges a pilot hole using fixed cutter blades.",
    "distinction": "Large fixed blades around a pilot guide.",
    "fields": [
      "pilot_od_m",
      "gauge_od_m",
      "blade_count"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "block-underreamer",
    "label": "Block-type underreamer",
    "group": "Stabilization & enlargement",
    "purpose": "Enlarges below restrictions using retractable cutter blocks.",
    "distinction": "Radial sliding blocks rather than hinged arms.",
    "fields": [
      "retracted_od_m",
      "expanded_od_m",
      "activation_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "gamma-ray",
    "label": "Gamma-ray LWD collar",
    "group": "Measurement & logging",
    "purpose": "Records natural formation gamma radiation.",
    "distinction": "Single detector section identified by a protected sensor window.",
    "fields": [
      "sensor_offset_m",
      "sensor_type",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "resistivity-lwd",
    "label": "Propagation-resistivity LWD",
    "group": "Measurement & logging",
    "purpose": "Records formation electromagnetic propagation response.",
    "distinction": "Separated transmitter and receiver antenna rings.",
    "fields": [
      "antenna_spacing_m",
      "frequencies_hz",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "density-lwd",
    "label": "Density LWD collar",
    "group": "Measurement & logging",
    "purpose": "Records density-sensitive source/detector response.",
    "distinction": "Source and detector windows at distinct spacings.",
    "fields": [
      "sensor_offset_m",
      "detector_spacing_m",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "neutron-lwd",
    "label": "Neutron-porosity LWD",
    "group": "Measurement & logging",
    "purpose": "Records neutron response for porosity interpretation.",
    "distinction": "Source station and near/far detector sections shown schematically.",
    "fields": [
      "sensor_offset_m",
      "detector_spacing_m",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "sonic-lwd",
    "label": "Sonic LWD collar",
    "group": "Measurement & logging",
    "purpose": "Records acoustic propagation measurements.",
    "distinction": "Transmitter, acoustic isolation slots and receiver array.",
    "fields": [
      "receiver_spacing_m",
      "acoustic_frequency_hz",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "caliper-lwd",
    "label": "Ultrasonic caliper LWD",
    "group": "Measurement & logging",
    "purpose": "Measures borehole geometry from acoustic standoff measurements.",
    "distinction": "Circumferential flush ultrasonic sensor windows.",
    "fields": [
      "sensor_count",
      "sensor_offset_m",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "pwd-sub",
    "label": "Pressure-while-drilling sub",
    "group": "Measurement & logging",
    "purpose": "Records annular and/or internal pressure channels.",
    "distinction": "Separate pressure ports in a short instrument sub.",
    "fields": [
      "pressure_channel",
      "sensor_offset_m",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "mechanics-sub",
    "label": "Downhole mechanics measurement sub",
    "group": "Measurement & logging",
    "purpose": "Records source-defined load, torque or vibration channels.",
    "distinction": "Strain-gauge section and instrument pockets shown schematically.",
    "fields": [
      "measurement_channels",
      "sample_rate_hz",
      "calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "em-gap-sub",
    "label": "EM telemetry gap sub",
    "group": "Measurement & logging",
    "purpose": "Provides electrical isolation for compatible EM telemetry.",
    "distinction": "Insulating ring separating conductive body sections.",
    "fields": [
      "gap_length_m",
      "insulation_source",
      "telemetry_type"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "circulating-sub",
    "label": "Circulating valve sub",
    "group": "Circulation & connections",
    "purpose": "Provides a controlled diversion path from bore to annulus.",
    "distinction": "Side ports and sliding valve sleeve in cutaway.",
    "fields": [
      "port_area_m2",
      "activation_source",
      "pressure_max_pa"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "filter-sub",
    "label": "Workstring filter sub",
    "group": "Circulation & connections",
    "purpose": "Retains debris carried in the internal flow path.",
    "distinction": "Internal perforated basket, shown exposed for identification.",
    "fields": [
      "filter_aperture_m",
      "flow_area_m2",
      "service_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "magnet-sub",
    "label": "Downhole magnet tool",
    "group": "Circulation & connections",
    "purpose": "Collects ferrous debris on magnetic collection surfaces.",
    "distinction": "Long magnetic collection ribs and debris recesses.",
    "fields": [
      "collection_length_m",
      "magnet_source",
      "service_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "safety-joint",
    "label": "Safety release joint",
    "group": "Circulation & connections",
    "purpose": "Provides a specified disconnect interface.",
    "distinction": "Release shoulder and keyed mating interface in cutaway.",
    "fields": [
      "release_source",
      "connection_top_box",
      "connection_bottom_pin"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "bumper-sub",
    "label": "Bumper sub",
    "group": "Impact & vibration",
    "purpose": "Provides controlled axial travel for intervention strings.",
    "distinction": "Long sliding mandrel with travel shoulders, without a hydraulic delay latch.",
    "fields": [
      "stroke_m",
      "rating_source",
      "service_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "anti-stall-sub",
    "label": "Torsional compliance tool",
    "group": "Impact & vibration",
    "purpose": "Provides source-defined torsional/axial compliance.",
    "distinction": "Helical coupling and spring section shown schematically.",
    "fields": [
      "torsional_stiffness_nm_rad",
      "stroke_m",
      "vendor_calibration_source"
    ],
    "scope": "STRING_GEOMETRY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "casing",
    "label": "Casing joint",
    "group": "Completion & casing",
    "purpose": "Forms a wellbore casing string.",
    "distinction": "Large-diameter tube and coupling.",
    "fields": [
      "drift_id_m",
      "material_grade",
      "connection_type"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "tubing",
    "label": "Production tubing joint",
    "group": "Completion & casing",
    "purpose": "Forms a production or service conduit.",
    "distinction": "Slender production tube with compact coupling.",
    "fields": [
      "drift_id_m",
      "material_grade",
      "connection_type"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "slotted-liner",
    "label": "Slotted liner joint",
    "group": "Completion & casing",
    "purpose": "Provides a slotted formation-fluid entry section.",
    "distinction": "Longitudinal slots cut in the base pipe.",
    "fields": [
      "slot_width_m",
      "slot_length_m",
      "open_area_m2"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "sand-screen",
    "label": "Sand-control screen",
    "group": "Completion & casing",
    "purpose": "Provides a designed filtration interface around a base pipe.",
    "distinction": "Wire-wrap or mesh layer over a perforated base pipe.",
    "fields": [
      "screen_type",
      "aperture_m",
      "base_pipe_od_m"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "packer",
    "label": "Completion packer",
    "group": "Completion & casing",
    "purpose": "Provides source-defined annular sealing and anchoring.",
    "distinction": "Elastomer sealing stack with slips on a mandrel.",
    "fields": [
      "setting_source",
      "seal_od_m",
      "rating_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "liner-hanger",
    "label": "Liner hanger",
    "group": "Completion & casing",
    "purpose": "Suspends a liner from a supporting casing string.",
    "distinction": "Slip cones and hanging slips, distinct from a sealing packer.",
    "fields": [
      "setting_source",
      "slip_range_m",
      "rating_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "float-shoe",
    "label": "Float shoe",
    "group": "Completion & casing",
    "purpose": "Provides a guide nose with a nonreturn valve at a casing end.",
    "distinction": "Rounded nose, flow outlets and internal valve seat.",
    "fields": [
      "drift_id_m",
      "valve_type",
      "pressure_max_pa"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "float-collar",
    "label": "Float collar",
    "group": "Completion & casing",
    "purpose": "Provides an internal nonreturn valve above the casing shoe.",
    "distinction": "Short casing collar with internal valve seat.",
    "fields": [
      "drift_id_m",
      "valve_type",
      "pressure_max_pa"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "bow-centralizer",
    "label": "Bow-spring centralizer",
    "group": "Completion & casing",
    "purpose": "Provides flexible casing standoff contact.",
    "distinction": "Bowed springs between collars; fits around a tubular.",
    "fields": [
      "run_in_od_m",
      "expanded_od_m",
      "restoring_force_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "rigid-centralizer",
    "label": "Rigid-blade centralizer",
    "group": "Completion & casing",
    "purpose": "Provides fixed standoff around a casing or liner.",
    "distinction": "Rigid blades surrounding a sleeve; not an inline BHA component.",
    "fields": [
      "gauge_od_m",
      "base_pipe_od_m",
      "blade_count"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "bullnose",
    "label": "Bullnose guide",
    "group": "Completion & casing",
    "purpose": "Guides a string through an existing hole.",
    "distinction": "Smooth rounded terminal nose without cutting teeth.",
    "fields": [
      "nose_od_m",
      "flow_area_m2",
      "service_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "overshot",
    "label": "External-grip overshot",
    "group": "Fishing & intervention",
    "purpose": "Engages the outside of a recoverable fish.",
    "distinction": "Open lower guide and internal grapple in cutaway.",
    "fields": [
      "catch_od_min_m",
      "catch_od_max_m",
      "release_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "spear",
    "label": "Internal-grip fishing spear",
    "group": "Fishing & intervention",
    "purpose": "Engages inside the bore of a recoverable fish.",
    "distinction": "Tapered lower mandrel with outward-engaging slips.",
    "fields": [
      "catch_id_min_m",
      "catch_id_max_m",
      "release_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "junk-basket",
    "label": "Junk basket",
    "group": "Fishing & intervention",
    "purpose": "Collects suitable loose debris in a recovery chamber.",
    "distinction": "Open catch chamber and retaining fingers shown in cutaway.",
    "fields": [
      "basket_id_m",
      "catcher_type",
      "service_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  },
  {
    "id": "junk-mill",
    "label": "Junk mill",
    "group": "Fishing & intervention",
    "purpose": "Mills suitable downhole obstructions.",
    "distinction": "Broad abrasive cutting face rather than a rock-bit cone arrangement.",
    "fields": [
      "cutting_od_m",
      "cutter_details",
      "service_source"
    ],
    "scope": "REFERENCE_ONLY",
    "drawing": "Original identification schematic; internal features may be exposed. Not to scale or a manufacturer drawing."
  }
];
 for(const item of tools){const old=root.WellBhaRegistry.find(r=>r.id===item.id);if(old)Object.assign(old,{...item,fields:[...new Set([...old.fields,...item.fields])]});else root.WellBhaRegistry.push({...item,asset:"assets/bha/"+item.id+".svg"});}
 root.WellToolCatalog=tools;
})(globalThis);
