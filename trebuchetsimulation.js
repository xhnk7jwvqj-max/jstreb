/**
 * Shared trebuchet simulation utilities
 */

const ctypes = ["rod", "pin", "slider", "colinear", "f2k", "rope"];

/**
 * Fill in missing constraint types and handle pin constraints from sliders
 * @param {Object} data - The trebuchet data object
 */
export function fillEmptyConstraints(data) {
  for (const ctype of ctypes) {
    if (data.constraints[ctype] === undefined) {
      data.constraints[ctype] = [];
    }
  }

  // Handle pin constraints from sliders
  const sliderCounts = data.particles.map(() => 0);
  data.constraints.slider.forEach((x) => {
    if (!x.oneway) {
      sliderCounts[x.p] += 1;
    }
  });
  data.constraints.slider = data.constraints.slider.filter(
    (x) => sliderCounts[x.p] < 2
  );
  data.constraints.pin = data.constraints.pin.concat(
    sliderCounts
      .flatMap((x, i) => [{ count: x, p: i }])
      .filter((x) => x.count > 1)
  );
}

/**
 * Calculate the peak load from force log
 * @param {Array} forceLog - The force log from simulation
 * @returns {number} The peak load
 */
export function calculatePeakLoad(forceLog) {
  return Math.max(
    ...forceLog.slice(1).map((x) => Math.max(...x.map((y) => Math.abs(y))))
  );
}

/**
 * Calculate the range from trajectories
 * @param {Array} trajectories - The trajectories from simulation
 * @param {Object} data - The trebuchet data object containing particles and configuration
 * @returns {number} The calculated range
 */
export function calculateRange(trajectories, data) {
  let axlecoord = -data.particles[data.mainaxle].y;
  let mincoord = -data.particles[data.mainaxle].y;
  let range = 0;

  for (const trajectory of trajectories) {
    for (let partIndex = 0; partIndex < data.particles.length; partIndex++) {
      if (trajectory[2 * partIndex] < 2000) {
        mincoord = Math.min(mincoord, -trajectory[2 * partIndex + 1]);
      }
      axlecoord = Math.max(axlecoord, -trajectory[2 * data.mainaxle + 1]);
    }

    range = Math.max(
      range,
      2 *
        Math.max(
          0,
          -trajectory[2 * data.particles.length + 2 * data.projectile + 1]
        ) *
        trajectory[2 * data.particles.length + 2 * data.projectile]
    );
  }

  const height1 = axlecoord - mincoord;
  const height2 = Math.sqrt(
    Math.pow(
      data.particles[data.armtip].x - data.particles[data.mainaxle].x,
      2
    ) +
      Math.pow(
        data.particles[data.armtip].y - data.particles[data.projectile].y,
        2
      )
  );
  range = (range / Math.max(height1, 0.75 * height2)) * data.axleheight;

  return range;
}

/**
 * Preset trebuchet configurations
 */
export const presets = {
  "Hinged Counterweight":
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3, "duration":35, "particles":[{"x":536,"y":472.7,"mass":1},{"x":346,"y":657.6,"mass":4},{"x":588,"y":440.7,"mass":10},{"x":668,"y":673.6,"mass":1},{"x":586,"y":533.7,"mass":100}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}',
  "Fixed Counterweight":
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3, "duration":35, "particles":[{"x":536,"y":472.7,"mass":1},{"x":346,"y":657.6,"mass":4},{"x":589,"y":444.7,"mass":100},{"x":668,"y":673.6,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}',
  "Floating Arm Trebuchet":
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3, "duration":35, "particles":[{"x":487.0,"y":517.0,"mass":1},{"x":346,"y":657.6,"mass":4},{"x":589,"y":444.7,"mass":100},{"x":589,"y":673.6,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":2,"normal":{"x":0.6,"y":0}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}',
  F2k: '{"projectile":3,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.6,"duration":35,"particles":[{"x":454,"y":516,"mass":1},{"x":436.6,"y":513.0,"mass":4},{"x":560.3,"y":211.5,"mass":100},{"x":652.9,"y":621.8,"mass":1}],"constraints":{"rod":[{"p1":1,"p2":3},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":1,"y":1}},{"p":2,"normal":{"x":0.6,"y":0}},{"p":3,"normal":{"x":0,"y":1},"oneway":true},{"p":0,"normal":{"x":0,"y":1}}],"colinear":[],"f2k":[{"reference":1,"slider":0,"base":2}],"rope":[]}}',
  "Floating Arm Whipper (NASAW)":
    '{"projectile":3,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.2,"duration":37,"particles":[{"x":496.3,"y":477.6,"mass":1},{"x":677.5,"y":471.0,"mass":4},{"x":468.0,"y":453.5,"mass":10},{"x":557.0,"y":431.8,"mass":1},{"x":563.0,"y":340.7,"mass":200}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2},{"p1":0,"p2":3,"oneway":true},{"p1":0,"p2":4,"oneway":true}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":4,"normal":{"x":0.6,"y":0}}],"colinear":[]}}',
  Whipper:
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3,"duration":60,"particles":[{"x":536,"y":472.7,"mass":1},{"x":759,"y":451,"mass":4},{"x":483,"y":498,"mass":10},{"x":551,"y":434,"mass":1},{"x":560,"y":368,"mass":200}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2},{"p1":0,"p2":3,"oneway":true},{"p1":0,"p2":4,"oneway":true}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":0}}]}}',
  Fiffer:
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.2,"duration":20,"particles":[{"x":536,"y":472.7,"mass":1},{"x":484,"y":656,"mass":4},{"x":504,"y":433,"mass":10},{"x":644,"y":661,"mass":1},{"x":653,"y":451,"mass":10},{"x":749,"y":428,"mass":1},{"x":749,"y":483,"mass":500},{"x":566,"y":505,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2},{"p1":7,"p2":6},{"p1":6,"p2":4},{"p1":4,"p2":5}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true},{"p":7,"normal":{"x":0.7,"y":1}},{"p":7,"normal":{"x":0,"y":1}},{"p":5,"normal":{"x":0,"y":1}},{"p":5,"normal":{"x":0.7,"y":1}}]}}',
  "Floating Arm King Arthur":
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.2,"duration":40,"particles":[{"x":536,"y":472.7,"mass":1},{"x":527,"y":610,"mass":4},{"x":534,"y":418,"mass":10},{"x":698,"y":608,"mass":1},{"x":560,"y":331,"mass":200}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":2,"normal":{"x":-0.5,"y":0},"oneway":true},{"p":1,"normal":{"x":0.7,"y":0},"oneway":true},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}',
  "Launch Ness Monster":
    '{"projectile":3,"mainaxle":2,"armtip":1,"axleheight":8,"timestep":0.3,"duration":80,"particles":[{"x":600.7,"y":746.2,"mass":10},{"x":559.1,"y":774.0,"mass":4},{"x":660.2,"y":530.0,"mass":100},{"x":703.9,"y":796.7,"mass":1},{"x":810,"y":530,"mass":10},{"x":552,"y":500,"mass":10},{"x":458,"y":666,"mass":10},{"x":886.1,"y":662.4,"mass":10}],"constraints":{"rod":[{"p1":2,"p2":1},{"p1":3,"p2":1},{"p1":6,"p2":5},{"p1":5,"p2":2},{"p1":4,"p2":2},{"p1":4,"p2":7},{"p1":5,"p2":4}],"slider":[{"p":0,"normal":{"x":1,"y":2.1}},{"p":0,"normal":{"x":-0.6,"y":1.6}},{"p":3,"normal":{"x":0,"y":1},"oneway":true},{"p":6,"normal":{"x":0.6,"y":1}},{"p":6,"normal":{"x":0,"y":1}},{"p":7,"normal":{"x":1,"y":1}},{"p":7,"normal":{"x":0,"y":1}}],"colinear":[{"reference":1,"slider":0,"base":2}]}}',
  "Pulley Sling":
    '{"projectile":3,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.2,"duration":35,"particles":[{"x":546.3,"y":584.3,"mass":1},{"x":285.6,"y":791.6,"mass":4},{"x":560.6,"y":481.2,"mass":10},{"x":1000.9,"y":742.8,"mass":1},{"x":645.5,"y":541.0,"mass":500},{"x":72.7,"y":730.2,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":2,"p2":4},{"p1":1,"p2":2},{"p1":0,"p2":4,"oneway":true}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true},{"p":5,"normal":{"x":1,"y":1}},{"p":5,"normal":{"x":0,"y":1}}],"colinear":[],"rope":[{"p1":5,"pulleys":[{"idx":1,"wrapping":"both"}],"p3":3}]}}',
  MURLIN:
    '{"projectile":8,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.1,"duration":40,"particles":[{"x":510.98330181224014,"y":585.0346326615387,"mass":1,"hovered":false},{"x":610.8818474508025,"y":509.1784380643879,"mass":1,"hovered":false},{"x":530.7749198606792,"y":582.2639014087384,"mass":1,"hovered":false},{"x":508.2352941176471,"y":627.2941140567556,"mass":1,"hovered":false},{"x":437.64705882352945,"y":593.176466997932,"mass":1,"hovered":false},{"x":477.64705882352945,"y":495.5294081744026,"mass":1,"hovered":false},{"x":648.2352941176471,"y":446.1176434685202,"mass":1,"hovered":false},{"x":648.2352941176471,"y":464.94117288028497,"mass":200,"hovered":false},{"x":462.2625079139531,"y":570.2700562274708,"mass":1,"hovered":false}],"constraints":{"rod":[{"p1":2,"p2":1,"hovered":false},{"p1":2,"p2":0,"hovered":false},{"p1":1,"p2":0,"hovered":false},{"p1":3,"p2":2,"hovered":false},{"p1":3,"p2":0,"hovered":false},{"p1":4,"p2":3,"hovered":false},{"p1":4,"p2":0,"hovered":false},{"p1":5,"p2":4,"hovered":false},{"p1":5,"p2":0,"hovered":false},{"p1":8,"p2":1,"hovered":false},{"p1":8,"p2":0,"hovered":false,"oneway":true}],"slider":[],"colinear":[],"f2k":[],"rope":[{"p1":7,"pulleys":[{"idx":6,"wrapping":"ccw"},{"idx":5,"wrapping":"ccw"},{"idx":4,"wrapping":"ccw"},{"idx":3,"wrapping":"ccw"}],"p3":2,"hovered":false}],"pin":[{"count":2,"p":0},{"count":2,"p":6}]}}',
  "Super F2k":
    '{"projectile":3,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.6,"duration":35,"particles":[{"x":454,"y":516,"mass":1},{"x":409.6619881558697,"y":441.96953719103357,"mass":2},{"x":529.2101100719777,"y":164.86138168547964,"mass":259.5196385398235},{"x":556.7988983225454,"y":470.8647766532066,"mass":1}],"constraints":{"rod":[{"p1":1,"p2":3},{"p1":1,"p2":2}],"slider":[{"p":2,"normal":{"x":0.6,"y":0}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}],"colinear":[],"f2k":[{"reference":1,"slider":0,"base":2}],"rope":[],"pin":[{"count":2,"p":0}]}}',
  "Enhanced F2k":
    '{"projectile":3,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.5,"duration":35,"particles":[{"x":470,"y":520,"mass":1},{"x":436.77661477870055,"y":458.50863514505085,"mass":2},{"x":614.2681257637996,"y":212.02159667471608,"mass":187.8920370894147},{"x":591.7489665226493,"y":481.75013376824836,"mass":1}],"constraints":{"rod":[{"p1":1,"p2":3},{"p1":1,"p2":2}],"slider":[{"p":2,"normal":{"x":0.7,"y":0.2}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}],"f2k":[{"reference":1,"slider":0,"base":2}],"pin":[{"p":0}],"colinear":[],"rope":[]}}',
  "Whip Chain":
    '{"projectile":6,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.25,"duration":50,"particles":[{"x":520,"y":500,"mass":1},{"x":728.6385948230378,"y":451.5992196046773,"mass":2},{"x":586.193466499675,"y":446.2823504785354,"mass":5.461912872980077},{"x":546.4758651674296,"y":435.34331248020163,"mass":17.890576075424363},{"x":579.8879364984242,"y":351.7841801080489,"mass":189.68221175718242},{"x":646.8892913425541,"y":479.59106845628503,"mass":0.9639677409053453},{"x":789.8369672937664,"y":490.87754763796966,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":2},{"p1":2,"p2":3},{"p1":3,"p2":4},{"p1":2,"p2":5},{"p1":5,"p2":1},{"p1":1,"p2":6},{"p1":2,"p2":1,"oneway":true}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":4,"normal":{"x":0.6,"y":0}},{"p":6,"normal":{"x":0,"y":1},"oneway":true}]}}',
  "Trebuvator":
    '{"projectile":5,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.3,"duration":40,"particles":[{"x":520,"y":520,"mass":1},{"x":423.0962604838799,"y":478.9823119335651,"mass":2},{"x":590.7774397169904,"y":394.24701039827323,"mass":167.46918682595245},{"x":602.4139415277382,"y":481.37479308064644,"mass":42.21452118685171},{"x":517.8856617749885,"y":371.8822148564166,"mass":15.41537496445031},{"x":660.3906968855954,"y":464.51977835833014,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":2,"p2":4},{"p1":1,"p2":5}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":3,"normal":{"x":0,"y":1}},{"p":4,"normal":{"x":0.6,"y":0}},{"p":5,"normal":{"x":0,"y":1},"oneway":true}],"rope":[{"p1":2,"pulleys":[{"idx":4,"wrapping":"both"}],"p3":3}]}}',
  "Orbital Sling":
    '{"projectile":3,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.35,"duration":40,"particles":[{"x":500,"y":500,"mass":1},{"x":422.95177753203325,"y":537.607623514919,"mass":2},{"x":536.2791068373436,"y":375.7178776533057,"mass":206.18164726562523},{"x":633.1441109307859,"y":604.77206813415,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}],"colinear":[{"reference":0,"slider":2,"base":1}]}}',
  "Lever-Sling Hybrid":
    '{"projectile":4,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.4,"duration":40,"particles":[{"x":500,"y":500,"mass":1},{"x":459.4987026226414,"y":496.81167943416995,"mass":2},{"x":554.1492501495345,"y":401.6678983880038,"mass":178.85657091047065},{"x":538.8529831309318,"y":449.08162198336714,"mass":0.15040724925089477},{"x":618.9155509125171,"y":543.7958094149909,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":3},{"p1":3,"p2":1},{"p1":3,"p2":2},{"p1":1,"p2":4}],"slider":[{"p":2,"normal":{"x":0.7,"y":0}},{"p":4,"normal":{"x":0,"y":1},"oneway":true}],"pin":[{"p":0}]}}',
  "Triple Pulley":
    '{"projectile":6,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.25,"duration":40,"particles":[{"x":520,"y":550,"mass":1},{"x":367.06960213238847,"y":766.8347941870574,"mass":2},{"x":556.6443662652229,"y":520.2669782805218,"mass":2.8796153977228047},{"x":591.8112348429299,"y":496.42819910343854,"mass":206.8424987848138},{"x":191.14945165036704,"y":733.6993929146445,"mass":0.0741333940609546},{"x":102.91402562037091,"y":670.3434645604602,"mass":34.15721684681258},{"x":827.3105356387157,"y":700.6849512448582,"mass":1}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":6}],"slider":[{"p":6,"normal":{"x":0,"y":1},"oneway":true},{"p":5,"normal":{"x":0,"y":1}},{"p":4,"normal":{"x":1,"y":0}}],"rope":[{"p1":3,"pulleys":[{"idx":2,"wrapping":"both"},{"idx":4,"wrapping":"both"},{"idx":5,"wrapping":"both"}],"p3":6}],"pin":[{"count":2,"p":0}]}}',
};
