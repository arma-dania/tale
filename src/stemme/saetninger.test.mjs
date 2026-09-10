import test from "node:test";
import assert from "node:assert/strict";

import { SaetningsSamler } from "./saetninger.js";

/** Fodrer samleren stykke for stykke, som replikken ville komme fra API'et. */
function stream(tekst, stykke = 6) {
  const s = new SaetningsSamler();
  const ud = [];
  for (let i = 0; i < tekst.length; i += stykke) {
    ud.push(...s.tilfoej(tekst.slice(i, i + stykke)));
  }
  const rest = s.rest();
  if (rest) ud.push(rest);
  return ud;
}

test("første sætning kommer, før resten er skrevet", () => {
  const s = new SaetningsSamler();
  assert.deepEqual(s.tilfoej("Godt. "), ["Godt."]);
  assert.deepEqual(s.tilfoej("Hvorfor"), []);
});

test("replik deles i sætninger", () => {
  assert.deepEqual(
    stream("Godt. Hvorfor valgte I Polen? Begrund det med jeres knock-out-kriterier."),
    ["Godt.", "Hvorfor valgte I Polen?", "Begrund det med jeres knock-out-kriterier."]
  );
});

test("tal med punktum klippes ikke over", () => {
  assert.deepEqual(
    stream("Investeringen var 1.500.000 kroner. Hvad blev kalkulationsrenten?"),
    ["Investeringen var 1.500.000 kroner.", "Hvad blev kalkulationsrenten?"]
  );
});

test("danske forkortelser klippes ikke over", () => {
  assert.deepEqual(
    stream("I nævner bl.a. Hofstede og f.eks. magtdistance. Hvorfor?"),
    ["I nævner bl.a. Hofstede og f.eks. magtdistance.", "Hvorfor?"]
  );
});

test("linjeskift afslutter også en sætning", () => {
  assert.deepEqual(stream("Første del\nAnden del."), ["Første del", "Anden del."]);
});

test("en lang remse uden skilletegn tvinges igennem", () => {
  const langt = "ord ".repeat(80);
  const stykker = stream(langt);
  assert.ok(stykker.length > 1, "der skal klippes, selv uden punktum");
  assert.ok(stykker.every((s) => s.length <= 230));
  assert.equal(stykker.join(" ").replace(/\s+/g, " ").trim(), langt.trim());
});

test("ingenting ind giver ingenting ud", () => {
  const s = new SaetningsSamler();
  assert.deepEqual(s.tilfoej(""), []);
  assert.equal(s.rest(), "");
});

test("hele replikken kommer med, uanset hvor den klippes", () => {
  const replik = 'Tak. I skriver, at markedet vokser 4,5 pct. om året. Hvad bygger det på?';
  for (const stykke of [1, 3, 7, 13, 100]) {
    assert.equal(
      stream(replik, stykke).join(" "),
      "Tak. I skriver, at markedet vokser 4,5 pct. om året. Hvad bygger det på?",
      `fejlede ved stykkestørrelse ${stykke}`
    );
  }
});
