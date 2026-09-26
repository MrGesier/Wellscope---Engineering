/* Original technical illustrations; recognizable geometry, not manufacturer drawings. */
(function (root) {
  let serial = 0;
  function svg(type, uid) {
    const id = uid || "eq" + ++serial;
    const steel = `url(#${id}-steel)`,
      dark = "#535b5f",
      gold = "#b89d61";
    let body = `<rect x="42" y="24" width="36" height="192" rx="3" fill="${steel}" stroke="${dark}"/><path d="M44 31H76M44 209H76" stroke="#434d54" stroke-width="3"/>`;
    const threads = (y) =>
      Array.from(
        { length: 6 },
        (_, i) => `<path d="M47 ${y + i * 2}l26 -1" stroke="#535d64"/>`,
      ).join("");
    const joint = (y, w = 48, h = 19) =>
      `<rect x="${60 - w / 2}" y="${y}" width="${w}" height="${h}" rx="3" fill="${steel}" stroke="#59636a"/><path d="M${62 - w / 2} ${y + 4}h${w - 4}" stroke="#dce0e1"/>`;
    if (/^(pdc-bit|tricone)$/.test(type)) {
      body = `<path d="M44 25h32v72l22 22v77q-4 35-38 36-34-1-38-36v-33l22-22z" fill="${steel}" stroke="#50585c"/><path d="M26 174q19-8 20 53M47 155q20 11 19 77M70 154q23 14 21 57" fill="none" stroke="${gold}" stroke-width="11"/>`;
      for (let i = 0; i < 13; i++) {
        const x = 31 + (i % 3) * 25,
          y = 166 + Math.floor(i / 3) * 13;
        body += `<ellipse cx="${x}" cy="${y}" rx="5.5" ry="4.5" fill="#414c55" stroke="#d8d2b4" stroke-width="1.5"/>`;
      }
      body += `<circle cx="51" cy="190" r="4" fill="#16242a"/><circle cx="77" cy="215" r="4" fill="#16242a"/>`;
      if(type==='tricone'){
        body=`<path d="M43 26h34v65l17 33v62H26v-62l17-33z" fill="${steel}" stroke="${dark}"/><path d="M27 164l30 18-9 46-27-19zM91 163l-29 20 12 47 27-23zM58 183l-14 47h35z" fill="#a9b1b4" stroke="#4b575d"/>`;
        for(const [x,y] of [[30,179],[36,192],[42,205],[85,179],[80,194],[77,207],[59,207],[56,220],[68,221]])body+=`<path d="M${x-4} ${y+3}l4-9 5 9z" fill="${gold}" stroke="#5a6060"/>`;
      }
    } else if (type==='underreamer') {
      body+=`<path d="M42 91L21 126v33l22-13M78 91l21 35v33l-22-13" fill="${steel}" stroke="${dark}"/><path d="M22 129v25M98 129v25" stroke="${gold}" stroke-width="7"/>`;
    } else if (/stabilizer|reamer/.test(type)) {
      body += `<path d="M41 60q23-15 8 118l-18 9q20-92 10-127M67 51q22 29 11 132l11-8q13-93-7-118" fill="${steel}" stroke="#515d65"/>`;
      for (let i = 0; i < 9; i++)
        body += `<path d="M37 ${72 + i * 12}l17-4M78 ${67 + i * 12}l11 3" stroke="${gold}" stroke-width="5"/>`;
    } else if (/rss/.test(type)) {
      body += joint(46) + joint(184);
      if(type==='rss-point')body+=`<path d="M55 82l11 0-8 100-11 0z" fill="#546774"/><path d="M60 88l-7 88" stroke="${gold}" stroke-width="3"/>`;
      for (const x of [35, 54, 75])
        body += `<rect x="${x}" y="105" width="10" height="48" rx="3" fill="#717b7f" stroke="#323c42"/><circle cx="${x + 5}" cy="111" r="2" fill="#c4c9c7"/><circle cx="${x + 5}" cy="147" r="2" fill="#c4c9c7"/>`;
      body += `<path d="M43 74h34M43 164h34" stroke="${gold}" stroke-width="7"/>`;
    } else if (/mwd|lwd|sensor|resistivity/.test(type)) {
      for (const y of [54, 76, 134, 156])
        body += `<rect x="41" y="${y}" width="38" height="10" fill="#343e44"/><path d="M43 ${y + 4}h34" stroke="#89979e"/>`;
      body += `<rect x="48" y="95" width="24" height="20" rx="2" fill="${gold}"/><circle cx="60" cy="104" r="3" fill="#38444c"/>`;
    } else if (/jar|accelerator|shock/.test(type)) {
      body = `<rect x="47" y="20" width="26" height="204" fill="${steel}" stroke="${dark}"/><rect x="39" y="54" width="42" height="138" rx="3" fill="${steel}" stroke="${dark}"/>`;
      for (let i = 0; i < 5; i++)
        body += `<path d="M${44 + i * 8} 57v35" stroke="#46525b" stroke-width="2"/>`;
      body += joint(103, 48, 10) + joint(174, 48, 10);
    } else if (/pdm|motor/.test(type)) {
      body += joint(40) + joint(184);
      if(type==='bent-pdm')body+=`<path d="M42 177l36-4 8 34-36 5z" fill="${steel}" stroke="${dark}"/><path d="M45 181l34-4" stroke="${gold}" stroke-width="4"/>`;
      for (let i = 0; i < 6; i++)
        body += `<path d="M44 ${65 + i * 17}l32 -9" stroke="#6e777c" stroke-width="2"/>`;
    } else if (/hwdp|heavy/.test(type)) {
      body += joint(31, 48, 28) + joint(112, 48, 22) + joint(188, 48, 28);
    } else if (/sub|crossover|float|valve/.test(type)) {
      body =
        `<path d="M47 25h26v42l10 10v95l-10 12v38H47v-38l-10-12V77l10-10z" fill="${steel}" stroke="${dark}"/>` +
        joint(95, 48, 20);
    } else if (/nonmag|nmdc/.test(type)) {
      body += `<rect x="42" y="30" width="36" height="179" fill="${gold}" opacity=".32"/>`;
    } else if (/spiral/.test(type)) {
      body += `<path d="M43 45Q76 75 43 105T43 165Q76 195 60 209M60 31Q90 62 60 92T60 152Q90 182 76 202" fill="none" stroke="#6f7a80" stroke-width="4"/>`;
    } else if (/pipe/.test(type)) {
      body =
        `<rect x="49" y="20" width="22" height="206" fill="${steel}" stroke="${dark}"/>` +
        joint(29, 38, 28) +
        joint(189, 38, 28);
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 248" role="img" aria-label="${String(type).replace(/[^a-z0-9 -]/gi, "")} technical illustration"><defs><linearGradient id="${id}-steel"><stop stop-color="#66737c"/><stop offset=".25" stop-color="#bec7ca"/><stop offset=".43" stop-color="#f0f1eb"/><stop offset=".63" stop-color="#abb5bc"/><stop offset="1" stop-color="#586772"/></linearGradient></defs><rect x="46" y="10" width="28" height="20" rx="2" fill="${steel}" stroke="${dark}"/>${threads(12)}${body}${/^(pdc-bit|tricone)$/.test(type) ? "" : `<rect x="46" y="216" width="28" height="21" rx="2" fill="${steel}" stroke="${dark}"/>${threads(220)}`}</svg>`;
  }
  const api = { svg };
  root.EquipmentDrawing = api;
  if (typeof module === "object") module.exports = api;
})(globalThis);
