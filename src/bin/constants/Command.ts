import * as path from 'path';
import * as fs from 'fs';

const serverPkg = require(path.resolve(process.cwd(), 'package.json'));
const serverPkgExists = fs.existsSync(serverPkg);

export const TITLE = serverPkgExists? `hooh-server-${serverPkg.name}` : 'hooh-template-server';

export const CHECK_TIMEOUT = 120;

export const HOOH_SCRIPT_START_TIMEOUT = +(process.env.HOOH_SCRIPT_START_TIMEOUT || 300 * 1000);
