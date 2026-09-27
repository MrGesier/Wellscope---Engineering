# Combined mechanical assessment

This adds postprocessing to the one-way string-load/contact model. It does not replace it with a coupled stiff-string solver or qualify an operating window.

## Quantities

At interior beam stations, interpolate wall force, torque and hydrostatic pressures from the matching axial cell and matching component. Curvature k is from the solved beam. For an equivalent uniform annular tube: I=pi(OD^4-ID^4)/64; J=2I; M=EI k; axial stress is wall force / metal area. Bending axial stress is +/-E k r. Torsional shear is T r/J. Lame radial/hoop stresses are a-b/r^2 and a+b/r^2. Von Mises uses all three normal stresses and torsional shear.

At each radius the two extreme bending sides bound the circumference. The angular maximum squared is (abs(axial-a)+E k r)^2 + 3 b^2/r^4 + 3(T r/J)^2, a convex function for positive r. Thus the inner and outer surfaces bound the wall for this idealization. No spatial stress concentration, transverse shear or local contact indentation is included. Stations on component interfaces/end supports and stencils spanning component interfaces have no combined-stress or bending-moment result; refine before interpreting sampled peaks. Moment and load-density fields remain equivalent beam quantities.

Numeric equivalent-body stress can be inspected for every modeled component, but utilization is calculated only for explicitly declared annular_tube bodies with positive yield, design factor >=1, geometry source and rating source. Rated tools and unknown bodies do not receive tube-body utilization. Supplied rating exceedances take precedence over missing coverage. WITHIN_SAMPLED_BODY_LIMITS means only the evaluated interior tube-body samples, never assembly safety, connections, fatigue, burst/collapse certification or operating-window validation. Existing load-only ratings remain separately visible.

Equivalent elastic twist integrates T/(GJ) over axial cells; missing G anywhere in the occupied string suppresses the whole-string total. Equivalent axial strain is [wall force / A - nu*(radial+hoop)]/E, with radial+hoop=2a. The total integrates this strain by the same cell trapezoidal quadrature. Missing Poisson ratio suppresses the total. Only entered positive G and -1<nu<0.5 are accepted; effective uniform isotropic-section properties are assumed. No thermal strain, geometric shortening or connection compliance is included.

Surface rotational power is T_surface*2pi*RPM/60. Rotational friction power uses (T_surface-T_bottom)*omega, axial friction power uses axialDrag*axialSpeed, both from the soft-string calculation. These are mechanical rates, not engine/hydraulic power or heat partition predictions. Zero effective-force crossings are piecewise-linear sampled roots; zero-force intervals can produce multiple zero stations. They are not buckling boundaries.

Nodal transverse wall reaction divided by tributary MD length gives a mesh-dependent force density (tf/m), not contact pressure or wear. Pin reactions are excluded.

An explicit synthetic-only button fills missing nu=0.30 and missing G=E/[2(1+nu)], preserving existing supplied values and recording materialSource. It enables a labelled synthetic load case if none is present. It does not populate yield, design factors or manufacturer ratings and is disabled for USER_ENTERED studies.

## Scope and evidence

The research motivation is the additional bending stress discussed in [H&P SPE207935](https://www.hpinc.com/resources/technical-paper/stiff-string-casing-design-tortuosity-and-centralisation). Pressure and axial-force effects and the distinction between effective and wall force are also discussed in [Sun et al., Scientific Reports 2023](https://www.nature.com/articles/s41598-023-38901-4). These publications do not validate this application; their dynamic and coupled models are not reproduced here.

Analytic tests cover pure axial loading, pure torsion, bending, hydrostatic invariance, a brute-force radius/angle stress tensor oracle, uniform torsional twist, vertical elastic extension, source gates, interface exclusion and immutable inputs. Browser tests verify material units, limit exceedances, selection and stale-result removal. No matched field benchmark is available.

Hydraulics, cuttings transport, fatigue life, tool-specific internal stresses, post-buckling and coupled vibration require additional inputs and models. Their absence is not interpreted as a pass.
