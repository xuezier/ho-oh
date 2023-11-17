#!/usr/bin/env node

import { runApp } from "..";

const options = JSON.parse(process.argv[2]);
runApp(options);
