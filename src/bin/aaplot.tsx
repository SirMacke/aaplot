#!/usr/bin/env node
import { render } from "ink";
import React from "react";
import App from "../ui/app.js";
import { parseArgs } from "../ui/args.js";

const args = parseArgs(process.argv.slice(2));
render(
  React.createElement(App, {
    demo: args.demo,
    offline: args.offline,
    ascii: args.ascii,
    creator: args.creator,
    minQuality: args.minQuality,
    maxCost: args.maxCost,
    cheap: args.cheap,
  }),
  {
    alternateScreen: true,
    exitOnCtrlC: false,
  },
);
