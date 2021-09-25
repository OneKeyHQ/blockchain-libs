import * as fs from 'fs';

const PROJECT_DIR = process.cwd();
const DATA_DIR = `${PROJECT_DIR}/data`;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

export default {
  PROJECT_DIR,
  DATA_DIR,
};
