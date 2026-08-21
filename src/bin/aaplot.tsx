#!/usr/bin/env node
import { render, Text } from "ink";
import React from "react";
import { demoModels } from "../api/demo.js";
import { renderModelsQuadrant } from "../render/plot.js";

const argv = process.argv.slice(2);
const isDemo = argv.includes("--demo");
const ascii = argv.includes("--ascii") || shouldFallBackToAscii();

function shouldFallBackToAscii(): boolean {
  if (process.env.TERM === "dumb") return true;
  if (process.platform === "win32" && !process.env.WT_SESSION && !process.env.TERM_PROGRAM) {
    return true;
  }
  return false;
}

function App() {
  if (!isDemo) return <Text>aaplot — under construction. See PLAN.md</Text>;
  const plot = renderModelsQuadrant(demoModels(), {
    ascii,
    width: 60,
    height: 24,
    top: 25,
    sortBy: "intelligence",
  });
  return <Text>{plot}</Text>;
}

render(React.createElement(App));
